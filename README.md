# Aapla Swad — Navratri Theme

This branch adds a **Navratri festival theme** to the Aapla Swad customer website. It is a review copy: please check it here before it goes into the main project.

| | |
|---|---|
| Repository | [`ishan-one8/aaplaswad-new`](https://github.com/ishan-one8/aaplaswad-new) (private) |
| Branch | **`feat/navratri-theme`** |
| Based on | the main project's `main` at **`0b2611f`** ("fix: move Paav Vada section to after Pizza (end of menu)", 6 Oct 2026) |
| All changes in one view | [`main...feat/navratri-theme`](https://github.com/ishan-one8/aaplaswad-new/compare/main...feat/navratri-theme) |

> **This README is for review only.** You can delete it before merging if you do not want it in the main project.

---

## 1. For bhaiya: how to review and merge

This branch starts exactly at your current `main` (`0b2611f`). Because of that, merging it is a clean fast-forward with no conflicts.

### Step 1: Get access
The repo is private. Ishan needs to add your GitHub account under **Settings → Collaborators**. Accept the invite email.

### Step 2: Choose one way to bring the code in

**Option A (recommended): pull the branch straight into your own project.** No fork is needed. Run this inside your clone of `dhiraj-143r/aaplaswad`:

```bash
git checkout main
git pull
git remote add ishan https://github.com/ishan-one8/aaplaswad-new.git
git fetch ishan feat/navratri-theme
git checkout -b navratri ishan/feat/navratri-theme
```

Then test it locally (see section 6). When you are happy with it, merge it:

```bash
git checkout main
git merge --ff-only navratri
git push origin main
```

Vercel deploys `main` as usual. The theme then shows on aaplaswad.store and in the Android app, which loads the live site. The staff app is not affected.

**Option B: fork on GitHub.**
1. Open https://github.com/ishan-one8/aaplaswad-new and press **Fork**.
2. **Untick "Copy the `main` branch only".** If you leave it ticked, the fork will not include `feat/navratri-theme`.
3. In your fork, open a pull request from `feat/navratri-theme` into your main project's `main`, or merge it the same way as in Option A.

### Step 3: After the festival
Nothing is required. The theme switches itself off on **21 Oct 2026**, the day after Dussehra. To remove the code completely, see section 7.

---

## 2. What was NOT touched

This change is **frontend only**. Compared with `0b2611f`, these are byte-for-byte identical:

- **Backend:** everything in `backend/`, plus every API URL and every API request.
- **Login, payments and orders:** `customer-auth.js`, the Razorpay flow, `order.js` (cart, pricing, order payload) and `order-ui.js`.
- **Shared files:** `theme.css`, `theme.js`, `home.css`, `i18n.js`, `sw.js`, `vercel.json`.
- **Apps and admin:** `android/`, `android-staff/`, `www/`, the staff app (`staff/`), `admin.html`, `delivery.html`.
- **Menu:** no dishes, prices or kitchens were added or changed.

The theme makes **no API calls**. It only reads the language the user picked and the current date. It loads only its own media files (section 4) and the *Rozha One* font from Google Fonts.

---

## 3. What the customer sees

### When the app opens (once per session, home page)
- A **full-screen Navratri screen** shows:
  - a 3D video of a boy and girl playing dandiya;
  - "Shubh Navratri";
  - **"FREE Dandiya — with your first order"**;
  - a short terms line;
  - **Order now** and **Explore menu** buttons.
- Close it with ✕, **Explore menu**, or by dragging it down. While it is on screen, the chef greeter does not show.
- The festive splash screen gets a marigold garland and a "Shubh Navratri" line.

### Home page
- The usual "Good evening / Craving …?" block is **hidden only during the festival**. A Navratri headline replaces it:
  - **"● SHUBH NAVRATRI · STARTS IN 5 DAYS"**. From 11 Oct this reads "Day 1 of 9", and on Dussehra "Happy Dussehra".
  - A headline that **changes every 3.2 s**, five lines per language. For example "*Dandiya* nights, thali bites", "Play *garba*, we'll bring the thali" and "*FREE dandiya* on your first order".
- Below the headline, **the dancers dance straight on the page**, with no box around them:
  - The dancers' background is removed, so only the boy and girl are visible.
  - They stand on a **3D rangoli** that is tilted onto the floor and turns slowly.
  - A **flickering diya** sits in the middle, with a soft shadow under their feet.
  - **Marigold strings** taken from the same 3D render hang on both sides and sway gently.

### Every page (home, order, dish, track, profile)
- A marigold **toran** hangs under the header.
- A soft magenta and gold festive glow sits behind the page.
- The order page has an offer strip: "Navratri offer: FREE dandiya with your first order".

### Languages
All text is in **English, Hindi and Marathi**. It follows the app's language picker immediately.

---

## 4. Files

### New files (9)
| File | Size | What it is |
|---|---|---|
| `navratri.js` | ~600 lines | Festival logic and markup: date switch, intro, home headline and dancers, toran, order strip, text in 3 languages |
| `navratri.css` | ~270 lines | All Navratri styles. Every rule is scoped under `html.nv`, which `navratri.js` adds only during the festival |
| `navratri-dandiya-540.mp4` | 1.4 MB | Intro video for phones (960×540, no sound) |
| `navratri-dandiya-720.mp4` | 2.3 MB | Intro video for large screens (1280×720, no sound) |
| `navratri-dandiya-alpha.mp4` | 1.9 MB | Home dancers without background. Colour on the top half, transparency mask on the bottom half (see section 5) |
| `navratri-dandiya.jpg` | 108 KB | Still frame used as the video poster |
| `navratri-dandiya-cutout.png` | 175 KB | Still image of the cut-out dancers, used when motion is reduced or data saver is on |
| `navratri-mala-left.png` / `-right.png` | 53 KB each | Marigold strings cut from the same render |

### Build scripts (not loaded by the site)
| File | What it does |
|---|---|
| `tools/navratri/alpha.swift` | Makes `navratri-dandiya-alpha.mp4` from the dandiya video: colour on top, Vision subject mask below |
| `tools/navratri/key.swift` | Makes the two `navratri-mala-*.png` files from one video frame |

Both need macOS 14 or later. How to run them is written at the top of each file.

### Changed files (5)
`index.html`, `order.html`, `dish.html`, `track.html` and `profile.html` each get **two lines** in `<head>`:

```html
<link rel="stylesheet" href="navratri.css?v=23">
<script src="navratri.js?v=16"></script>
```

Nothing else in those pages changed.

---

## 5. How it works

- **Switching on and off:**
  - The dates are at the top of `navratri.js`: `FEST = { start: 11 Oct 2026, days: 9, end: 21 Oct 2026 }`.
  - Before `end`, the theme is on. After it, the site looks exactly as before.
  - Testing flags:
    - `?navratri=0` turns the theme off for the session, and `?navratri=1` turns it on.
    - `?nvintro=1` shows the intro again, and `?nvintro=0` skips it.
- **The dancers without background:**
  - Each frame of the 3D video was processed offline on a Mac with Apple's Vision "subject lifting" masks. The result is a normal H.264 MP4: the colour picture sits on the top half and its black-and-white mask on the bottom half.
  - On the page, a small WebGL shader combines the two halves into a transparent picture. This works on Android, Chrome, Safari and desktop browsers.
  - If WebGL is not available, the normal video plays instead. If even that fails, an SVG illustration is shown.
- **Performance:**
  - Phones get the 540p intro video, and large screens get the 720p one.
  - Videos only play while they are on screen. The home dancers wait while the intro covers them, so a phone decodes one video at a time.
- **Accessibility:**
  - The intro is a proper dialog: Escape closes it and focus moves to the main button.
  - Images and videos have labels in all three languages.
  - People with "reduce motion" switched on get still images and no animation.

---

## 6. How to test locally

The site is static, so any static server works:

```bash
npx http-server . -p 5512 -c-1
```

| Open | To see |
|---|---|
| http://localhost:5512/index.html?nvintro=1 | The full-screen intro |
| http://localhost:5512/index.html?nvintro=0 | The home page without the intro |
| http://localhost:5512/order.html | The order-page offer strip |
| http://localhost:5512/index.html?navratri=0 | The site without the theme |

On localhost, the browser console shows **CORS errors** for `/menu` and `/shop-status`. This is expected: the API only accepts requests from aaplaswad.store, so these errors do not happen on the live site.

---

## 7. Removing it completely (optional)

The theme already switches off on its own. To delete the code as well:
1. Delete `navratri.js`, `navratri.css`, the seven `navratri-*` media files and the `tools/navratri/` folder.
2. Remove the two `navratri` lines from the `<head>` of the 5 pages.

---

## 8. Please check before going live

1. **Who gets the free dandiya?**
   - The website only *shows* the offer. No order is marked "gets a free dandiya", and the order data and staff app are unchanged.
   - The kitchen or delivery team needs a way to know which order is a customer's first one. If you want, the staff app could show a "Free dandiya" tag on first orders, but that needs a quick look at what the backend returns.
2. **Dates.** Navratri is set to start on **11 Oct 2026**, with **Dussehra on 20 Oct**. Please confirm them against the calendar. Changing them is one line in `navratri.js`.
3. **Video details.**
   - The intro video has a small ✦ watermark in the bottom-right corner, from the AI tool that made it.
   - The 10-second loop restarts with a small jump, because the first and last frames differ.
   - A new, seamless video can be dropped in later: rebuild the cut-out version with `tools/navratri/alpha.swift`.
4. **iPhone.** Please open the home page once on a real iPhone (Safari) to confirm the cut-out dancers play.
5. **Existing issues, not caused by this change:**
   - **Console error on home.** `index.html` throws `TypeError: Cannot read properties of null (reading 'classList')` in `checkOpenStatus`. The same code is in `main` at `0b2611f`.
   - **Payment keys in the repo.** The repo tracks `razorpay_live_api.csv`. If it holds live payment keys, remove it from the repo and rotate the keys.
