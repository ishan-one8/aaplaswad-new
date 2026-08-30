# Sai Prasad — Full Test Checklist

Work through this once, in order. Roughly 45 minutes.

**What you need**
- 2 Android phones if possible (one as staff, one as customer). One phone works too — just log out and back in between roles.
- The staff app v1.5 installed: https://sai-prasad-seven.vercel.app/staff-download.html
- ₹80 or so of real money for the online payment test (refundable — step 7).

**Tip:** every test order you create should be deleted afterwards, or your reports will be wrong. Step 9 covers cleanup.

---

## 1. Admin setup (do this first — other steps depend on it)

Log in to the staff app with **7887907363**.

| # | Do this | Expect |
|---|---|---|
| 1.1 | Go to **Shop → Hotel location**, stand in the hotel, tap **Use my current location** | Latitude and longitude fill in |
| 1.2 | Set your real **opening and closing times** | — |
| 1.3 | Tap **Save all settings** | "Settings saved" |
| 1.4 | Go to **Staff**, check **Ganesh's pay per delivery** | The right rupee amount |
| 1.5 | Go to **Menu** | All 7 thalis with correct prices |

**If 1.1 is skipped, delivery partners see "Distance: Unknown" and arrival times are rough guesses.**

---

## 2. Customer flow — cash on delivery

On the customer phone, open **sai-prasad-seven.vercel.app**.

| # | Do this | Expect |
|---|---|---|
| 2.1 | Open the home page | Menu loads, prices match the admin panel |
| 2.2 | Tap a dish → dish page | Same price as admin panel |
| 2.3 | Add to cart, go to Order | Item in cart at the right price |
| 2.4 | Tick an extra (e.g. Extra Ghee) | Total goes up by the extra's price |
| 2.5 | Fill name, phone, address; allow location | Address fields accept input |
| 2.6 | Choose **Cash on Delivery**, place order | Success screen |
| 2.7 | **Look at the green DELIVERY CODE box** | A 4-digit number — **write it down** |
| 2.8 | Note the Order ID | Starts with `#SP` |

**First-time customer?** The total should be 10% lower than the sum of items. That's the first-order discount.

---

## 3. Kitchen flow

On the staff app, log in as **Sai_hotel**.

| # | Do this | Expect |
|---|---|---|
| 3.1 | Look at the screen within 5 seconds of the order | Order appears on its own, **alarm sounds and phone vibrates** |
| 3.2 | Check the top counters | "New" went up by 1 |
| 3.3 | Check **Cook these now** | Your item with the right quantity, e.g. "2 Dal Bati Churma" |
| 3.4 | Check the order card | Customer name, address, items, extras, and the total |
| 3.5 | Tap **✅ Accept** | Status becomes "confirmed" |
| 3.6 | Tap **👨‍🍳 Start cooking** | Status becomes "preparing" |
| 3.7 | Tap **🔔 Mark ready** | Status becomes "ready" |

**Also test the closed-app alert:** lock the phone, place another order from the customer phone. A notification should wake the screen.

---

## 4. Delivery flow

Log in as **Ganesh** (a second phone is better here).

| # | Do this | Expect |
|---|---|---|
| 4.1 | Open **Available** | Order listed under **💵 Cash on delivery** |
| 4.2 | Check the card | Distance in km, amount to collect, **📞 Call first** button |
| 4.3 | Tap **📞 Call first** | Your phone dials the customer |
| 4.4 | Tap **✅ Accept** | Moves to **My drops** |
| 4.5 | On another partner's phone (or ask me), check the pool | **The order is gone from their list** |
| 4.6 | Tap **🗺️ Navigate** | Google Maps opens with the customer's location |
| 4.7 | Tap **📦 Picked up** | Status changes; a "📍 Sharing location" chip appears at the top |
| 4.8 | Tap **✅ Delivered**, type a **wrong** code like 0000 | **Refused** — "That code does not match" |
| 4.9 | Type the real code from step 2.7 | Delivered. |
| 4.10 | Open **Earnings** | 1 delivery, money earned, cash carried, and what to hand over |

---

## 5. Customer tracking (do this during step 4)

On the customer phone, open **Track** with your order ID.

| # | Do this | Expect |
|---|---|---|
| 5.1 | While the kitchen is cooking | "ARRIVING IN ~x min", status on the timeline |
| 5.2 | The delivery code box | Shows the same 4 digits as step 2.7 |
| 5.3 | After the partner taps **Picked up** | **A map appears with a 🛵 moving toward your 🏠** |
| 5.4 | Check the ETA | Counts down as the partner gets closer |
| 5.5 | A **📞 Call the delivery partner** link | Appears once they are on the way |
| 5.6 | After delivery | Timeline shows Delivered, map and ETA disappear |

---

## 6. Things that should FAIL (equally important)

| # | Do this | Expect |
|---|---|---|
| 6.1 | Admin → **Menu**, switch a dish to sold out. Reload the customer order page | Item greyed out, **SOLD OUT**, cannot be added |
| 6.2 | Admin → **Shop**, turn **Shop open** off. Reload the customer page | Red closed banner with your message, order button disabled |
| 6.3 | Turn the shop back on | Ordering works again |
| 6.4 | Admin → **Menu**, change a price. Reload the customer page | New price everywhere |
| 6.5 | Log in as Ganesh, try to open Reports | No Reports tab exists for him |

---

## 7. Payment flow — real money

**Read this first.** These are **live** keys. Money actually moves. Use one cheap item.

**No online payment has ever succeeded on your account.** Three attempts on 10 and 11 August all failed with `payment_timed_out` — the UPI request was not approved in time. So this step has never been proven to work.

| # | Do this | Expect |
|---|---|---|
| 7.1 | Order one item, choose **Online payment** | Razorpay opens showing UPI apps |
| 7.2 | **Approve the request in your UPI app quickly** | This is where the previous three attempts failed — don't leave it sitting |
| 7.3 | After payment | Success screen with order ID and delivery code |
| 7.4 | Kitchen app | Order appears marked **PAID ONLINE**, not CASH |
| 7.5 | Delivery app | Shows "Already paid" — no cash to collect |
| 7.6 | Admin → **Dashboard** | Online count went up by 1, cash count unchanged |

**If money leaves your account but no order appears:** tell me the payment ID immediately. The server refuses orders it cannot verify, so this should not happen, but that is exactly the case to catch.

**Refund your test:** Razorpay Dashboard → Transactions → the payment → **Refund**. Takes 5–7 days to return.

---

## 8. Where your money goes

Payments go to the Razorpay account behind key `rzp_live_TO716qJ16jOeqp`, then Razorpay transfers to **the bank account registered on that Razorpay account**.

**Check which bank account:** dashboard.razorpay.com → **Account & Settings** → **Banking details / Settlement account**. Whatever is shown there is where your money lands. I cannot read that over the API, so you must confirm it visually.

**Settlement timing:** Razorpay holds the money briefly and transfers on a schedule (usually T+2 working days for new accounts). Check **Settlements** in the dashboard for the schedule.

**Current status:** 0 settlements, because 0 payments have ever succeeded. After step 7 works, expect the first settlement within a few working days.

**Razorpay's fee** is about 2% + GST per transaction, so ₹80 credits roughly ₹78.

---

## 9. Clean up

Every test order is in your real reports until removed.

1. Staff app → **Orders**
2. Find each test order
3. **Cancel** it (or tell me the order IDs and I will delete them properly)

Cancelled orders still show in the cancelled count. For a spotless report, ask me to delete them.

Then check **Reports → Today** shows only genuine orders.

---

## 10. Offers (optional)

Needs the Firebase **web** config, which is still outstanding.

Once set up: Admin → **📣 Offers** → write a title and message → check the preview → **Send now**. Your own phone should receive it if you opted in on the order success screen.

---

## What to tell me afterwards

- Any step where what you saw differs from the "Expect" column — quote the step number.
- Whether the online payment in step 7 completed.
- Your test order IDs so I can delete them cleanly.
