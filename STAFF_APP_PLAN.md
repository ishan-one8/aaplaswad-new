# Sai Prasad — Staff App Implementation Plan

**Goal:** One separate APK (`Sai Prasad Staff`) containing three role-based panels — **Admin**, **Hotel/Kitchen**, and **Delivery Partner** — with a real backend that enforces what the admin configures.

---

## 1. Current state (what we're building on)

| Piece | Today | Verdict |
|---|---|---|
| Customer app | Static HTML/JS → Vercel → Capacitor APK (`com.saiprasad.dalbati`) | Keep as-is |
| Backend | 1 Lambda + DynamoDB `sai_prasad_orders`, routes: `POST/GET /orders`, `GET/PATCH /orders/{id}` | Extend |
| Auth | **None.** `admin.html` and `delivery.html` compare PIN to `'1234'` in JavaScript | Must be replaced |
| Menu/prices | Hardcoded in `order.js` → `MENU` object | Must move to backend |
| Shop open/close | Does not exist | Build |
| Kitchen screen | Does not exist | Build |
| Order claim | `PATCH` with no condition — two partners can accept the same order | Must be atomic |
| Reports | Client-side filtering over a 200-row `Scan` | Rework with a date index |

**Two things block everything else and must be fixed first:**

1. **`GET /orders` is public and unauthenticated.** Anyone with the API URL can read every customer's name, phone, and address. This has to be closed before we ship an app that leans on it harder.
2. **A client-side PIN is not authentication.** Once the admin panel can change prices and close the shop, "the check runs in the browser" means anyone who opens DevTools (or edits the APK's JS) can change prices. Auth must move to the server.

---

## 2. Architecture decisions

**2.1 One APK, three roles.** A single staff app; the login response's `role` decides which dashboard loads. Same codebase, same build, three views. New app id: `com.saiprasad.staff`, its own icon so it sits separately from the customer app on the phone.

**2.1a Hosting: same domain for now, fully separate everywhere else.** The staff app is served from `sai-prasad-seven.vercel.app/staff/` for the moment, but it shares *nothing* with the customer app beyond the domain:

- Its own folder (`staff/`), its own HTML/CSS/JS — no shared files with the customer pages, so a change to one can never break the other
- Its own APK and app id, its own service worker scope (or none), its own local-storage keys (`sp_staff_*`) so a staff login can't collide with a customer session
- Its own API routes (`/staff/*`, `/admin/*`, `/hotel/*`, `/delivery/*`) with their own auth
- The staff base URL lives in **one constant** (`STAFF_BASE_URL` in `staff/shared.js`, mirrored in the Capacitor config). Moving to the second domain later means changing that one value, adding the new origin to the Lambda's CORS list, and rebuilding the staff APK — no code changes.
- `/staff/` is not linked from anywhere on the customer site, and gets `noindex` plus a `robots.txt` entry so it doesn't show up in search results while it sits on the public domain.

**2.2 Reuse the existing AWS stack.** Extend the same Lambda + DynamoDB rather than introducing Firebase. Reasons: it's already deployed and working, `deploy.sh` already automates it, and polling every 5s is entirely adequate for a single-outlet order volume. Realtime sockets are a Phase 8 optimisation, not a requirement.

**2.3 Server is the source of truth for config.** Prices, item availability, shop open/closed, and hours live in DynamoDB and are enforced **in the Lambda** on `POST /orders`. The customer app reads them and reflects them in the UI, but the UI is a courtesy — the server is what actually rejects an order placed after closing time.

**2.4 Claim-based delivery assignment.** Delivery partners see the unclaimed pool and claim an order; the claim uses a DynamoDB `ConditionExpression` so exactly one partner can win. No admin dispatch step (can be added later if needed).

**2.5 Kitchen state and delivery state are separate fields.** Prep progress (`status`) and who's delivering (`deliveryPartner`) are orthogonal — a partner can claim an order while it's still being cooked. Modelling them as one enum is what forces the awkward ordering in the current prototype.

---

## 3. Data model

### 3.1 `sai_prasad_orders` (existing table, extended)

New attributes:

| Field | Purpose |
|---|---|
| `orderDate` | `YYYY-MM-DD` in IST — partition key for the reports index |
| `status` | `placed → confirmed → preparing → ready → picked_up → delivered` / `cancelled` |
| `deliveryPartner` | `{ id, name, phone }` — `null` until claimed |
| `claimedAt` | ISO timestamp of the winning claim |
| `pickedUpAt`, `deliveredAt` | Fulfilment timeline |
| `cancelReason`, `cancelledBy` | Audit for cancellations |
| `priceSnapshot` | Item prices at order time, so later price edits don't rewrite history |
| `statusHistory` | Append-only `[{ status, at, by }]` — who did what, when |

**New GSI `date-index`**: partition `orderDate`, sort `createdAt`. This turns every report ("today's cash vs online", "last 7 days") into a bounded `Query` instead of a table `Scan`. Without it, reports get slower and more expensive every day the business runs.

### 3.2 `sai_prasad_config` (new table, key `configId`)

Single item `configId = 'shop'`:

```
{
  configId: 'shop',
  isOpen: true,                      // admin's manual master switch
  autoSchedule: true,                // also honour openTime/closeTime
  openTime: '11:00', closeTime: '22:30',
  weeklyOff: [],                     // e.g. ['tuesday']
  holidayDates: ['2026-08-15'],      // one-off closures
  closedMessage: 'We are closed. Orders open at 11 AM.',
  pauseOrders: false,                // "too busy" — open but not taking orders
  hotelLat: 0.0, hotelLng: 0.0,      // for delivery distance
  deliveryRadiusKm: 7,
  deliveryFee: 0, minOrderValue: 0,
  codEnabled: true, onlineEnabled: true,
  prepTimeMinutes: 30
}
```

Second item `configId = 'menu'` — the `MENU` object from `order.js`, plus per-item `available: true|false` and per-extra `available`. Admin edits this; both apps read it.

### 3.3 `sai_prasad_staff` (new table, key `staffId`)

```
{ staffId, name, phone, role: 'admin'|'hotel'|'delivery',
  pinHash, pinSalt, active: true, createdAt, lastLoginAt,
  failedAttempts, lockedUntil, mustChangePin,
  payoutPerDelivery,          // ₹ per completed delivery, set per partner
  fcmToken }
```

**Delivery partners are paid per delivery**, so `payoutPerDelivery` is set per partner in **Admin → Staff** (partners can be on different rates). Each completed delivery stamps the rate in force at that moment onto the order (`deliveryPayout`), so raising someone's rate never rewrites what they already earned. Earnings then appear in two places: the partner's own "today" summary, and an admin payout report per partner for any date range.

PINs stored as PBKDF2 hashes (Node's built-in `crypto` — no extra Lambda dependency). Never the plaintext.

**Only the admin account is seeded** (by `deploy.sh`, to break the chicken-and-egg of needing a login to create logins). Every other account — delivery partners and the hotel/kitchen login — is created by you in the **Admin → Staff** screen: name, phone, role, and a PIN the app generates or you type. Adding a new delivery partner is then a 30-second job with no deploy and no code change, and deactivating one who leaves is a single toggle (their token stops working on the next request; their in-flight orders return to the pool).

---

## 4. API surface

### Auth
| Route | Notes |
|---|---|
| `POST /staff/login` | `{ phone, pin }` → `{ token, role, name, staffId }`. Token = HMAC-signed payload, 7-day expiry, secret in Lambda env var. |
| `GET /staff/me` | Validates token, returns role. |

Every route below requires `Authorization: Bearer <token>`; the Lambda checks role per route (a delivery token cannot call an admin route).

### Admin
| Route | Purpose |
|---|---|
| `GET /admin/config` / `PATCH /admin/config` | Open/close, hours, weekly off, holidays, pause, fees, radius, hotel coords |
| `GET /admin/menu` / `PATCH /admin/menu/{itemKey}` | Price, old price, availability, includes text, extras + extra prices |
| `GET /admin/reports?from=&to=` | Orders, revenue, **cash vs online split (count + ₹)**, item-wise sales, hourly distribution, avg order value, cancellations, partner-wise deliveries |
| `GET /admin/payouts?from=&to=` | Per-partner: deliveries completed, **₹ owed** (sum of `deliveryPayout`), cash collected, net settlement |
| `GET /admin/orders?date=&status=` | Full order list via `date-index` |
| `PATCH /admin/orders/{id}` | Force status, cancel, mark COD collected |
| `GET/POST/PATCH/DELETE /admin/staff` | Create and deactivate hotel/delivery accounts, reset PINs |
| `GET /admin/export?from=&to=` | CSV download |

### Hotel / Kitchen
| Route | Purpose |
|---|---|
| `GET /hotel/orders?since=` | Active queue only; `since` returns a delta so polling is cheap |
| `PATCH /hotel/orders/{id}/status` | `confirmed` → `preparing` → `ready` |
| `PATCH /hotel/orders/{id}/reject` | With reason (item out of stock, etc.) |
| `GET /hotel/summary` | Live counts + **item-wise pending totals** for batch prep |

### Delivery
| Route | Purpose |
|---|---|
| `GET /delivery/available` | Orders where `deliveryPartner = null` and status ≥ `confirmed` |
| `POST /delivery/orders/{id}/claim` | **Atomic** — conditional write, `409` if already claimed |
| `GET /delivery/mine` | This partner's active orders |
| `PATCH /delivery/orders/{id}/status` | `picked_up` → `delivered` (+ COD amount collected) |
| `POST /delivery/orders/{id}/release` | Hand an order back to the pool |
| `GET /delivery/earnings?date=` | Deliveries done, cash collected |

### Customer app (public, unchanged auth-wise)
| Route | Purpose |
|---|---|
| `GET /menu` | Live prices + availability |
| `GET /shop-status` | `{ isOpen, message, nextOpenAt, prepTime }` |
| `POST /orders` | **Now validated server-side**: rejects `423` if closed/paused, `409` if any item unavailable, recomputes the total from server prices and rejects mismatches |

The atomic claim, in full — this is the piece that makes "once accepted, no other partner sees it" actually true:

```js
await ddb.send(new UpdateCommand({
  TableName: TABLE,
  Key: { orderId },
  UpdateExpression: 'SET deliveryPartner = :p, claimedAt = :now',
  ConditionExpression: 'attribute_not_exists(deliveryPartner) OR deliveryPartner = :null',
  ExpressionAttributeValues: { ':p': partner, ':now': iso, ':null': null }
}));
// ConditionalCheckFailedException → 409 "Already taken by another partner"
```

The loser's app gets a `409`, shows a brief "already taken" toast, and drops the card on the next poll.

---

## 5. Screens

### 5.1 Admin

- **Dashboard** — today's orders, revenue, pending, delivered; **cash vs online** as counts *and* rupees; live clock; shop open/closed indicator
- **Shop control** — master open/close toggle, "pause orders" (open but too busy), opening/closing times, weekly off day, holiday dates, custom closed message. Toggling closed shows exactly what customers will see.
- **Menu manager** — per item: price, old price (for the discount badge), available/unavailable toggle, includes text, extras with prices. Unavailable items grey out in the customer app immediately.
- **Orders** — filter by date and status, search by phone/order ID, full detail, force status, cancel with reason, mark COD collected
- **Reports** — date range; revenue and order-count trend; cash vs online; item-wise sales ranking (what to stock tomorrow); hourly heatmap (peak hours); average order value; cancellation rate and reasons; partner-wise delivery counts; **partner payouts** (deliveries × rate, cash collected, net to settle); CSV export
- **Staff** — add/deactivate hotel and delivery accounts, reset PINs, see last login
- **Settings** — hotel coordinates, delivery radius, delivery fee, minimum order, COD/online payment toggles, prep time

### 5.2 Hotel / Kitchen

Built for a screen propped up in a kitchen — large type, minimal taps.

- **Live queue**, newest first, each card showing order ID, time elapsed since placed, items with quantities, extras called out clearly, veg/non-veg marker, and whether a delivery partner has claimed it yet
- **Big counters** at the top: New / Preparing / Ready — so they know the load at a glance
- **Item-wise prep totals** — "Dal Bati ×7, Chicken Thali ×3" aggregated across all pending orders, so they cook in batches instead of order by order. This is the "prepare in advance" requirement.
- **One tap per state change**: Confirm → Preparing → Ready
- **Sound + vibration on every new order**, with a persistent visual until acknowledged
- **Reject with reason** when something has run out (and it tells the admin panel)
- Shows delivery partner name/ETA once claimed, so the kitchen knows when someone is arriving

### 5.3 Delivery Partner

- **Available orders** — customer name, distance from the hotel (km, computed via Haversine from the configured hotel coordinates), order value, payment method with **COD amount to collect shown prominently**, and a big **Accept** button
- **Accept is exclusive** — the card vanishes for every other partner the moment one wins the claim
- **My deliveries** — the claimed orders, each with:
  - Customer name
  - **Tap-to-call** phone (`tel:` link)
  - Full address + landmark + pincode
  - **Open in Google Maps** (`https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>`), falling back to an address query when the order has no coordinates
  - Distance
  - Mark Picked Up → Mark Delivered, with COD confirmation on delivery
  - Release back to the pool if something goes wrong
- **Online/offline toggle** — stop receiving new orders
- **Today's summary** — deliveries completed, **₹ earned today** (per-delivery rate × deliveries), and cash collected (what they owe the hotel). The two are shown separately so there's no confusion between "money I'm carrying" and "money I've earned"; the net settlement figure is shown below both.

---

## 6. Build phases

| Phase | Work | Est. |
|---|---|---|
| **0. Secure the backend** ✅ **code complete, not deployed** | Staff table + PBKDF2 PINs + HMAC tokens; auth guards in the Lambda; `GET /orders` and `PATCH /orders/{id}` locked to staff; tracking redacted for non-owners; login lockout; `ENFORCE_AUTH` rollout flag; 55 tests | 1 day |
| **1. Data model** ✅ **done, deployed** | `sai_prasad_config` + `sai_prasad_staff` tables; `date-index` GSI; backfilled `orderDate` on 9 existing orders; seeded config from the live `MENU` | 1 day |
| **2. Config API + customer wiring** ✅ **done, deployed** | `GET /menu`, `GET /shop-status`, server-side order validation; `order.js` now reads live prices/availability (hardcoded menu kept only as an offline fallback); sold-out items greyed out; closed-shop banner driven by admin settings; pre-payment availability re-check | 1.5 days |
| **9. Live tracking** ✅ **done, deployed** | Partner shares position while carrying an order; customer sees a live map and arrival estimate on `track.html`; rider position and phone withheld until pickup | — |
| **10. Push notifications (app closed)** ❌ **blocked on you** | Sound, vibration and Android notifications work while the app is open. Waking a closed phone needs Firebase — see "Inputs needed" | — |
| **3. Staff app shell** ✅ **done** | `staff/` folder: login, token storage, role router, API client with auth + polling | 1 day |
| **4. Admin panel** ✅ **done** | Dashboard, orders, menu, shop control, staff, reports, payouts, CSV export | 2.5 days |
| **5. Kitchen panel** ✅ **done** | Queue, counters, item-wise prep totals, state transitions, sound + vibration alerts | 1.5 days |
| **6. Delivery panel** ✅ **done** | Pool, atomic claim, my-deliveries, call/maps/distance, COD flow, earnings | 2 days |
| **7. APK** ✅ **built + hosted** | `com.saiprasad.staff`, assets bundled locally, local notifications plugin, signed release | 1 day |
| **8. Test + roll out** ⚠️ **tested, not locked down** | ✅ Live two-partner race test, closed-shop rejection, payout stamping, legacy-client compatibility. ❌ `ENFORCE_AUTH` still `false` | 1.5 days |

**≈ 13 working days.** Phases 0–2 are prerequisites; 4, 5, and 6 are independent once 3 lands.

Optional later: FCM push (works with the app closed), WebSocket live updates, Google Distance Matrix for real road distance and ETA, partner GPS tracking on the customer's track page, multi-outlet support.

---

## 7. File layout

```
staff/                    # new — served at /staff/ on the current domain,
                          # movable to its own domain by changing one constant
  index.html              # login + role router
  admin.html   admin.js
  kitchen.html kitchen.js
  delivery.html delivery.js
  shared.js               # api client, auth, polling, formatting
  shared.css
backend/
  index.js                # extended: auth, config, menu, role-scoped routes
  auth.js                 # token sign/verify, PIN hashing
  deploy.sh               # extended: new tables, GSI, env vars
capacitor.staff.config.ts # appId com.saiprasad.staff, webDir staff/
android-staff/            # second Capacitor Android project
```

The existing root-level `admin.html` and `delivery.html` become the starting point for `staff/admin.html` and `staff/delivery.html` — their layout and Chart.js work is reusable; the auth and data layers get replaced.

---

## 8. Inputs needed from you

Only one thing is genuinely needed to start: **the phone number and starting PIN for the seed admin account** (both changeable in-app afterwards).

Everything else you enter yourself in the admin panel once it's running — no code changes, no deploys:

- Delivery partner and hotel accounts (**Admin → Staff**)
- Hotel latitude/longitude, via a pick-on-map control (**Admin → Settings**)
- Opening/closing times, weekly off, holiday dates (**Admin → Shop control**)
- Delivery radius, delivery fee, minimum order value (**Admin → Settings**)

**Confirmed:** delivery partners are paid per delivery. You'll set each partner's rate when you create their account, and change it any time from **Admin → Staff**.

---

## 9. Risks and notes

- **Price edits must not rewrite history.** `priceSnapshot` on each order is what keeps last week's reports accurate after a price change.
- **Reports on `Scan` will not hold up.** The `date-index` GSI is not optional polish; a `Scan` re-reads the whole table on every report load.
- **Token expiry on a kitchen screen** left open for days: refresh the token silently on each poll, and never dump the user back to login mid-service.
- **`razorpay_live_api.csv` sits in the project folder** and is not currently tracked by git (this folder isn't its own repo — the enclosing git repo is your home directory, and nothing here is committed). Before running `git init` here, add a `.gitignore` covering that CSV and any keystore, so live payment credentials and your signing key never land in a commit.
- **One shared token secret** in a Lambda env var is fine at this scale; rotating it logs everyone out, so rotate between service hours.
- **Offline delivery partners**: queue status updates locally and retry, otherwise a dropped signal in a lift loses a "delivered" tap.
- **While `/staff/` lives on the customer domain**, the URL is public even if unlinked — so server-side auth (Phase 0) is what actually protects it, not obscurity. `noindex` keeps it out of search results; it is not a security control.
- **Moving to the second domain later** touches four things only: the `STAFF_BASE_URL` constant, the Capacitor `server.url`, the Lambda's CORS allow-list, and a fresh signed APK. Keeping the staff code in its own folder from day one is what keeps that migration this small.
