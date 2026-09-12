/* ============================================
   ORDER PAGE — Logic + Razorpay + AWS Backend
   + Google Sign-In
   ============================================ */

const API_URL = 'https://f37z1y2xbg.execute-api.ap-south-1.amazonaws.com';
const RAZORPAY_KEY = 'rzp_live_TO716qJ16jOeqp';
// ⬇️ REPLACE with your Google OAuth Client ID
const GOOGLE_CLIENT_ID = '861754401920-c1gc6di0ne4cfurikkbnj3tv2obb8fu4.apps.googleusercontent.com';

let total = 0;
const PHONE_NUMBER = '8805211717';

// --- Menu Items ---
const FALLBACK_MENU = {
    'dal-bati': {
        name: 'Dal Bati Churma Thali',
        shortName: 'Dal Bati',
        price: 80,
        oldPrice: 150,
        discount: '47% OFF',
        image: 'hero.jpg',
        category: 'veg',
        includes: '4 bati • dal • churma • chutney • ghee',
        extras: { 'db-ghee': 10, 'db-churma': 15, 'db-bati': 20 },
        extrasLabels: { 'db-ghee': 'Extra Ghee', 'db-churma': 'Extra Churma', 'db-bati': '2 Extra Bati' }
    },
    'zunka-bhakar': {
        name: 'Zunka Bhakar Thali',
        shortName: 'Zunka Bhakar',
        price: 117,
        oldPrice: 250,
        discount: '53% OFF',
        image: 'zunka.jpg',
        category: 'veg',
        includes: '3 bhakri • zunka • onion • chili • pickle',
        extras: { 'zb-ghee': 10, 'zb-onion': 10, 'zb-bhakri': 25 },
        extrasLabels: { 'zb-ghee': 'Extra Ghee', 'zb-onion': 'Extra Onion Salad', 'zb-bhakri': '2 Extra Bhakri' }
    },
    'bharit-bhakar': {
        name: 'Bharit Bhakar Thali',
        shortName: 'Bharit Bhakar',
        price: 121,
        oldPrice: 200,
        discount: '40% OFF',
        image: 'bharit.jpg',
        category: 'veg',
        includes: 'bharit • 2 bhakar • onion • lemon • aachar • thecha',
        extras: { 'bb-ghee': 10, 'bb-bhakar': 25, 'bb-thecha': 15 },
        extrasLabels: { 'bb-ghee': 'Extra Ghee', 'bb-bhakar': '2 Extra Bhakar', 'bb-thecha': 'Extra Thecha' }
    },
    'bombil-thali': {
        name: 'Bombil Thali',
        shortName: 'Bombil',
        price: 130,
        oldPrice: 350,
        discount: '63% OFF',
        image: 'bombil.jpg',
        category: 'nonveg',
        includes: '6 pcs bombil • rassa • rice • 2 bhakar • onion • lemon',
        extras: { 'bm-bhakar': 25, 'bm-rice': 20, 'bm-bombil': 40 },
        extrasLabels: { 'bm-bhakar': '2 Extra Bhakar', 'bm-rice': 'Extra Rice', 'bm-bombil': 'Extra Bombil (3 pcs)' }
    },
    'zinga-thali': {
        name: 'Zinga Thali',
        shortName: 'Zinga',
        price: 1,
        oldPrice: 125,
        discount: 'TEST',
        image: 'zinga.jpg',
        category: 'nonveg',
        includes: 'zinga chatni • 2 bhakar • onion • lemon',
        extras: { 'zg-bhakar': 25, 'zg-zinga': 40 },
        extrasLabels: { 'zg-bhakar': '2 Extra Bhakar', 'zg-zinga': 'Extra Zinga' }
    },
    'chicken-thali': {
        name: 'Chicken Thali',
        shortName: 'Chicken',
        price: 151,
        oldPrice: 350,
        discount: '57% OFF',
        image: 'chicken.jpg',
        category: 'nonveg',
        includes: '4 pcs chicken • rassa • rice • 2 bhakari • onion • lemon',
        extras: { 'ck-bhakar': 25, 'ck-rice': 20, 'ck-chicken': 50 },
        extrasLabels: { 'ck-bhakar': '2 Extra Bhakari', 'ck-rice': 'Extra Rice', 'ck-chicken': 'Extra Chicken (2 pcs)' }
    },
    'special-dal-batti': {
        name: 'Special Dal Batti Thali',
        shortName: 'Spl Dal Batti',
        price: 120,
        oldPrice: 220,
        discount: '45% OFF',
        image: 'special-dal-batti.jpg',
        category: 'veg',
        includes: '8 pcs batti • dal • sweet • onion • lemon',
        extras: { 'sd-ghee': 10, 'sd-batti': 30, 'sd-sweet': 20 },
        extrasLabels: { 'sd-ghee': 'Extra Ghee', 'sd-batti': '4 Extra Batti', 'sd-sweet': 'Extra Sweet' }
    },
    'rice-plate': {
        name: 'Rice Plate',
        shortName: 'Rice Plate',
        price: 130,
        oldPrice: 220,
        discount: '41% OFF',
        image: 'rice-plate.jpg',
        category: 'veg',
        hotel: 'Aapla Swad Hotel',
        includes: '2 bhaji • rice • dal • 3 chapati • sweet • kanda • limbu • lonch • thecha',
        extras: { 'rp-chapati': 15, 'rp-rice': 20, 'rp-sweet': 20 },
        extrasLabels: { 'rp-chapati': 'Extra Chapati', 'rp-rice': 'Extra Rice', 'rp-sweet': 'Extra Sweet' }
    },

    // ===== Shriyan Chinese =====
    'veg-manchurian-dry': {
        name: 'Veg Manchurian Dry', shortName: 'Manchurian Dry', price: 119, oldPrice: 180,
        discount: '34% OFF', image: 'assets/chinese/veg-manchurian-dry.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'crispy veg balls • Chinese sauce • spring onion',
        extras: {}, extrasLabels: {}
    },
    'paneer-kentucky': {
        name: 'Paneer Kentucky', shortName: 'Paneer Kentucky', price: 154, oldPrice: 220,
        discount: '30% OFF', image: 'assets/chinese/paneer-kentucky.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'crispy paneer fingers • breadcrumb coating • dip',
        extras: {}, extrasLabels: {}
    },
    'paneer-chilli': {
        name: 'Paneer Chilli', shortName: 'Paneer Chilli', price: 155, oldPrice: 230,
        discount: '33% OFF', image: 'assets/chinese/paneer-chilli.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'paneer cubes • bell peppers • onion • chili sauce',
        extras: {}, extrasLabels: {}
    },
    'veg-fried-rice': {
        name: 'Veg Fried Rice', shortName: 'Fried Rice', price: 113, oldPrice: 170,
        discount: '34% OFF', image: 'assets/chinese/veg-fried-rice.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'rice • mixed vegetables • soy sauce • spring onion',
        extras: {}, extrasLabels: {}
    },
    'veg-manchurian-rice': {
        name: 'Veg Manchurian Rice', shortName: 'Manchurian Rice', price: 121, oldPrice: 180,
        discount: '33% OFF', image: 'assets/chinese/veg-manchurian-rice.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'fried rice • manchurian gravy • spring onion',
        extras: {}, extrasLabels: {}
    },
    'veg-schezwan-rice': {
        name: 'Veg Schezwan Rice', shortName: 'Schezwan Rice', price: 129, oldPrice: 190,
        discount: '32% OFF', image: 'assets/chinese/veg-schezwan-rice.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'rice • schezwan sauce • vegetables • spicy',
        extras: {}, extrasLabels: {}
    },
    'veg-paneer-rice': {
        name: 'Veg Paneer Rice', shortName: 'Paneer Rice', price: 159, oldPrice: 230,
        discount: '31% OFF', image: 'assets/chinese/veg-paneer-rice.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'fried rice • paneer cubes • vegetables',
        extras: {}, extrasLabels: {}
    },
    'veg-schezwan-paneer-rice': {
        name: 'Veg Schezwan Paneer Rice', shortName: 'Schezwan Paneer Rice', price: 149, oldPrice: 220,
        discount: '32% OFF', image: 'assets/chinese/veg-schezwan-paneer-rice.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'rice • schezwan sauce • paneer • spicy',
        extras: {}, extrasLabels: {}
    },
    'veg-noodles': {
        name: 'Veg Noodles', shortName: 'Veg Noodles', price: 109, oldPrice: 170,
        discount: '36% OFF', image: 'assets/chinese/veg-noodles.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'noodles • mixed vegetables • soy sauce',
        extras: {}, extrasLabels: {}
    },
    'veg-manchurian-noodles': {
        name: 'Veg Manchurian Noodles', shortName: 'Manchurian Noodles', price: 119, oldPrice: 180,
        discount: '34% OFF', image: 'assets/chinese/veg-manchurian-noodles.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'noodles • manchurian balls • sauce',
        extras: {}, extrasLabels: {}
    },
    'veg-hakka-noodles': {
        name: 'Veg Hakka Noodles', shortName: 'Hakka Noodles', price: 122, oldPrice: 180,
        discount: '32% OFF', image: 'assets/chinese/veg-hakka-noodles.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'hakka noodles • vegetables • Indo-Chinese style',
        extras: {}, extrasLabels: {}
    },
    'veg-schezwan-noodles': {
        name: 'Veg Schezwan Noodles', shortName: 'Schezwan Noodles', price: 139, oldPrice: 200,
        discount: '31% OFF', image: 'assets/chinese/veg-schezwan-noodles.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'noodles • schezwan sauce • vegetables • spicy',
        extras: {}, extrasLabels: {}
    },
    'veg-paneer-noodles': {
        name: 'Veg Paneer Noodles', shortName: 'Paneer Noodles', price: 158, oldPrice: 230,
        discount: '31% OFF', image: 'assets/chinese/veg-paneer-noodles.jpg', category: 'veg',
        hotel: 'Shriyan Chinese',
        includes: 'noodles • paneer cubes • vegetables',
        extras: {}, extrasLabels: {}
    },

    // ===== Mauli Veg Rol (2 pcs each) =====
    'aloo-roll': {
        name: 'Aloo Roll (2 pcs)', shortName: 'Aloo Roll', price: 88, oldPrice: 140,
        discount: '37% OFF', image: 'assets/rolls/aloo-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • spiced aloo filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'soya-bean-masala-roll': {
        name: 'Soya Bean Masala Roll (2 pcs)', shortName: 'Soya Roll', price: 115, oldPrice: 170,
        discount: '32% OFF', image: 'assets/rolls/soya-bean-masala-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • soya bean masala filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'noodles-roll': {
        name: 'Noodles Roll (2 pcs)', shortName: 'Noodles Roll', price: 116, oldPrice: 170,
        discount: '32% OFF', image: 'assets/rolls/noodles-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • noodles filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'manchurian-roll': {
        name: 'Manchurian Roll (2 pcs)', shortName: 'Manchurian Roll', price: 119, oldPrice: 180,
        discount: '34% OFF', image: 'assets/rolls/manchurian-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • manchurian filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'mix-veg-roll': {
        name: 'Mix Veg Roll (2 pcs)', shortName: 'Mix Veg Roll', price: 119, oldPrice: 180,
        discount: '34% OFF', image: 'assets/rolls/mix-veg-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • mixed vegetables filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'paneer-roll': {
        name: 'Paneer Roll (2 pcs)', shortName: 'Paneer Roll', price: 144, oldPrice: 210,
        discount: '31% OFF', image: 'assets/rolls/paneer-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • spiced paneer filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'cheese-roll': {
        name: 'Cheese Roll (2 pcs)', shortName: 'Cheese Roll', price: 144, oldPrice: 210,
        discount: '31% OFF', image: 'assets/rolls/cheese-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • melted cheese filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'aloo-noodles-mix-roll': {
        name: 'Aloo Noodles Mix Roll (2 pcs)', shortName: 'Aloo Noodles Roll', price: 119, oldPrice: 180,
        discount: '34% OFF', image: 'assets/rolls/aloo-noodles-mix-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • aloo + noodles mix filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'soya-bean-noodles-mix-roll': {
        name: 'Soya Bean Noodles Mix Roll (2 pcs)', shortName: 'Soya Noodles Roll', price: 121, oldPrice: 180,
        discount: '33% OFF', image: 'assets/rolls/soya-bean-noodles-mix-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • soya + noodles mix filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'mix-veg-noodles-roll': {
        name: 'Mix Veg Noodles Roll (2 pcs)', shortName: 'Veg Noodles Roll', price: 125, oldPrice: 180,
        discount: '31% OFF', image: 'assets/rolls/mix-veg-noodles-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • veg + noodles mix filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'noodles-manchurian-mix-roll': {
        name: 'Noodles Manchurian Mix Roll (2 pcs)', shortName: 'Noodles Manchurian Roll', price: 139, oldPrice: 200,
        discount: '31% OFF', image: 'assets/rolls/noodles-manchurian-mix-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • noodles + manchurian filling • chutney',
        extras: {}, extrasLabels: {}
    },
    'paneer-noodles-mix-roll': {
        name: 'Paneer Noodles Mix Roll (2 pcs)', shortName: 'Paneer Noodles Roll', price: 144, oldPrice: 210,
        discount: '31% OFF', image: 'assets/rolls/paneer-noodles-mix-roll.jpg', category: 'veg',
        hotel: 'Mauli Veg Rol',
        includes: '2 rolls • paneer + noodles mix filling • chutney',
        extras: {}, extrasLabels: {}
    }
};

// Live menu, replaced by the server copy on load. The hardcoded list above is
// only a fallback so the page still works if the API is unreachable.
let MENU = JSON.parse(JSON.stringify(FALLBACK_MENU));

// Shop state (open/closed, offers) — also served by the backend
// HARD CLIENT-SIDE TIME CHECK: Enforce operating hours 10 AM - 10 PM
function isWithinOperatingHours() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 10 && hour < 22;
}

// Shriyan Chinese: only 3 PM - 10 PM
function isChineseOpen() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 15 && hour < 22;
}

// Check if an item belongs to Shriyan Chinese
function isShriyanChineseItem(itemKey) {
    const item = MENU[itemKey] || FALLBACK_MENU[itemKey];
    return item && item.hotel === 'Shriyan Chinese';
}

// Mauli Veg Rol: only 5 PM - 10 PM
function isRollsOpen() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= 17 && hour < 22;
}

// Check if an item belongs to Mauli Veg Rol
function isMauliRolItem(itemKey) {
    const item = MENU[itemKey] || FALLBACK_MENU[itemKey];
    return item && item.hotel === 'Mauli Veg Rol';
}

let SHOP_STATUS = {
    isOpen: isWithinOperatingHours(), closed: !isWithinOperatingHours(), paused: false, message: '',
    firstOrderDiscountPercent: 10, deliveryFee: 0, minOrderValue: 0,
    openTime: '10:00 AM', closeTime: '10:00 PM'
};

// Pulls live prices, availability and shop hours. Everything the admin panel
// changes reaches customers through here.
async function loadShopConfig() {
    try {
        const [menuRes, statusRes] = await Promise.all([
            fetch(API_URL + '/menu').then(r => r.json()),
            fetch(API_URL + '/shop-status').then(r => r.json())
        ]);

        if (menuRes && menuRes.success && menuRes.menu && Object.keys(menuRes.menu).length) {
            MENU = menuRes.menu;
            Object.keys(MENU).forEach(k => { if (cart[k] === undefined) cart[k] = 0; });
            Object.keys(cart).forEach(k => { if (!MENU[k]) delete cart[k]; });
        }
        if (statusRes && statusRes.success) SHOP_STATUS = statusRes;
    } catch (err) {
        // Offline or API down: keep the built-in menu so ordering still works
        console.warn('Falling back to the built-in menu', err);
    }

    // ALWAYS enforce client-side operating hours (10 AM - 10 PM)
    // Even if the API says isOpen:true, if we're outside hours, block it
    if (!isWithinOperatingHours()) {
        SHOP_STATUS.isOpen = false;
        SHOP_STATUS.closed = true;
        SHOP_STATUS.message = SHOP_STATUS.message || 'Open daily 10:00 AM – 10:00 PM';
    }
    // Set times for display
    SHOP_STATUS.openTime = SHOP_STATUS.openTime || '10:00 AM';
    SHOP_STATUS.closeTime = SHOP_STATUS.closeTime || '10:00 PM';
}

// Haversine distance in km between two lat/lng points
function calcDistanceKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some(v => v === null || v === undefined || isNaN(v))) return null;
    const R = 6371;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// Check if customer is within delivery range
function isWithinDeliveryRange() {
    if (!window._customerLat || !window._customerLng) return true; // no location = allow (manual address)
    if (!SHOP_STATUS.hotelLat || !SHOP_STATUS.hotelLng) return true; // hotel location not set
    const maxKm = SHOP_STATUS.maxDeliveryKm || 5;
    const dist = calcDistanceKm(SHOP_STATUS.hotelLat, SHOP_STATUS.hotelLng, window._customerLat, window._customerLng);
    if (dist === null) return true;
    window._customerDistanceKm = dist;
    return dist <= maxKm;
}

// Cart: { itemKey: qty }
let cart = {};
Object.keys(MENU).forEach(k => cart[k] = 0);

// --- Auth State ---
let googleUser = JSON.parse(localStorage.getItem('sp_google_user') || 'null');

// Callback invoked after a deferred login (from placeOrder flow)
let onLoginComplete = null;

// --- Initialize: Show order page immediately, setup login in background ---
window.addEventListener('load', async () => {
    // ALWAYS show the order page — no login gate
    document.getElementById('loginGate').classList.add('hidden');
    document.getElementById('orderPageContent').style.display = 'block';

    // Show bottom nav and WhatsApp
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) bottomNav.classList.add('show');
    const waFab = document.getElementById('waFab');
    if (waFab) waFab.classList.add('show');

    // If already logged in, show profile
    if (googleUser) {
        showUserProfile(googleUser);
    }

    // Auto-fill name and phone from saved customer info or Google profile
    const savedInfo = JSON.parse(localStorage.getItem('sp_customer_info') || 'null');
    const nameField = document.getElementById('f-name');
    const phoneField = document.getElementById('f-phone');

    if (savedInfo && savedInfo.name) {
        if (nameField && !nameField.value) nameField.value = savedInfo.name;
    } else if (googleUser && googleUser.name && googleUser.name !== 'Guest') {
        if (nameField && !nameField.value) nameField.value = googleUser.name;
    }

    if (savedInfo && savedInfo.phone) {
        if (phoneField && !phoneField.value) phoneField.value = savedInfo.phone;
    }

    // Initialize login in background (for when we need it later)
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        initNativeGoogleSilently();
    }

    // Load shop config, menu, etc
    await loadShopConfig();
    resumePendingPayment();
    watchForReturnFromPayment();
    checkOperatingHours();
    showFirstOrderBadge();
    renderMenu();

    const totalBar = document.getElementById('orderTotalBar');
    if (totalBar) totalBar.style.display = 'flex';
});

// Show profile avatar in nav bar
function showUserProfile(user) {
    const navAuth = document.getElementById('nav-auth');
    if (navAuth) {
        navAuth.style.display = 'flex';
        document.getElementById('nav-pic').src = user.picture || 'logo.png';
        document.getElementById('nav-name').textContent = (user.name || 'User').split(' ')[0];
    }
}

// ========== NATIVE APP: Silent init (no button yet) ==========
async function initNativeGoogleSilently() {
    try {
        const { SocialLogin } = window.Capacitor.Plugins;
        if (!SocialLogin) return;
        await SocialLogin.initialize({
            google: { webClientId: GOOGLE_CLIENT_ID }
        });
    } catch (err) {
        console.error('Native Google silent init:', err);
    }
}

// ========== LOGIN MODAL: Shown only at checkout if needed ==========
function showLoginModal(callback) {
    onLoginComplete = callback;

    const gate = document.getElementById('loginGate');
    // Repurpose login gate as a modal
    gate.classList.remove('hidden');

    // Update the text
    const prompt = gate.querySelector('.lg-prompt');
    if (prompt) prompt.textContent = 'Sign in to complete your order';

    // Setup the sign-in button
    const holder = document.getElementById('lg-signin-btn');

    // Detect native app OR Android WebView (GSI doesn't work in WebView)
    const isNativeOrWebView = !!(
        (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
        /wv|WebView/.test(navigator.userAgent) ||
        (navigator.userAgent.includes('Android') && !navigator.userAgent.includes('Chrome/'))
    );

    if (isNativeOrWebView) {
        // Native app / WebView: show a custom Google button
        holder.innerHTML = `
            <button id="lg-native-google" class="lg-google-btn">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" height="20" alt="">
                Continue with Google
            </button>`;
        document.getElementById('lg-native-google').onclick = () => doNativeGoogleLogin();
    } else {
        // Web browser: Google One Tap / GSI
        setupWebGoogleSignIn();
    }
}

function hideLoginModal() {
    document.getElementById('loginGate').classList.add('hidden');
}

// ========== NATIVE APP: Google Sign-In ==========
async function doNativeGoogleLogin() {
    const button = document.getElementById('lg-native-google');
    if (!button) return;
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span style="color:#888;">Signing in…</span>';

    try {
        const { SocialLogin } = window.Capacitor.Plugins;
        if (!SocialLogin) throw new Error('SocialLogin plugin not found');

        await SocialLogin.initialize({
            google: { webClientId: GOOGLE_CLIENT_ID }
        });

        const result = await SocialLogin.login({
            provider: 'google',
            options: {}
        });

        let user = null;

        if (result && result.result) {
            const r = result.result;

            if (r.idToken) {
                try {
                    const payload = JSON.parse(atob(r.idToken.split('.')[1]));
                    user = {
                        name: payload.name || 'Customer',
                        email: payload.email || '',
                        picture: payload.picture || 'logo.png',
                        googleId: payload.sub || ''
                    };
                } catch (e) {}
            }

            if (!user && r.profile) {
                user = {
                    name: r.profile.name || r.profile.displayName || 'Customer',
                    email: r.profile.email || '',
                    picture: r.profile.imageUrl || r.profile.photoUrl || 'logo.png',
                    googleId: r.profile.id || ''
                };
            }

            if (!user && r.accessToken) {
                user = {
                    name: r.accessToken.userId || 'Customer',
                    email: '',
                    picture: 'logo.png',
                    googleId: r.accessToken.userId || ''
                };
            }
        }

        if (!user) throw new Error('Could not extract profile');

        // Swap for a customer token so "My Orders" works (Native flow)
        if (result.result && (result.result.idToken || result.result.accessToken) && typeof spExchangeGoogleCredential === 'function') {
            await spExchangeGoogleCredential(result.result.idToken, result.result.accessToken);
        }

        // SAVE FOREVER
        localStorage.setItem('sp_google_user', JSON.stringify(user));
        googleUser = user;
        showUserProfile(user);
        hideLoginModal();

        // Auto-fill name and seed customer info
        const nameField = document.getElementById('f-name');
        if (nameField && !nameField.value) nameField.value = user.name;
        // Seed saved customer info with Google name (if no info saved yet)
        const existingInfo = getSavedCustomerInfo();
        if (!existingInfo || !existingInfo.name) {
            localStorage.setItem('sp_customer_info', JSON.stringify({ name: user.name, phone: (existingInfo && existingInfo.phone) || '' }));
        }

        // Invoke the callback (continue placing order)
        if (onLoginComplete) {
            onLoginComplete();
            onLoginComplete = null;
        }

    } catch (err) {
        console.error('Google Sign-In error:', err);
        button.disabled = false;
        button.innerHTML = originalHTML;
        showToast('Sign-in error: ' + ((err && err.message) ? err.message : String(err)).substring(0, 100));
    }
}

// ========== WEB BROWSER: Google One Tap / GSI ==========
function setupWebGoogleSignIn() {
    let loaded = false;
    const waitForGoogle = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            clearInterval(waitForGoogle);
            loaded = true;
            try {
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredential
                });
                google.accounts.id.renderButton(
                    document.getElementById('lg-signin-btn'),
                    { theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 280 }
                );
            } catch (err) {
                console.error('Google GSI failed:', err);
            }
        }
    }, 100);

    setTimeout(() => {
        clearInterval(waitForGoogle);
        if (!loaded) {
            const holder = document.getElementById('lg-signin-btn');
            if (holder) holder.innerHTML = '<p style="font-size:0.7rem;color:#9ca3af;text-align:center;">Google Sign-In unavailable. Please check internet and refresh.</p>';
        }
    }, 5000);
}

async function handleGoogleCredential(response) {
    // MUST await — saves the customer token before user navigates away
    if (typeof spExchangeGoogleCredential === 'function') {
        await spExchangeGoogleCredential(response.credential);
    }

    const payload = JSON.parse(atob(response.credential.split('.')[1]));
    const user = {
        name: payload.name,
        email: payload.email,
        picture: payload.picture
    };

    // SAVE FOREVER
    localStorage.setItem('sp_google_user', JSON.stringify(user));
    googleUser = user;
    showUserProfile(user);
    hideLoginModal();

    // Auto-fill name and seed customer info
    const nameField = document.getElementById('f-name');
    if (nameField && !nameField.value) nameField.value = user.name;
    // Seed saved customer info with Google name (if no info saved yet)
    const existingInfo2 = getSavedCustomerInfo();
    if (!existingInfo2 || !existingInfo2.name) {
        localStorage.setItem('sp_customer_info', JSON.stringify({ name: user.name, phone: (existingInfo2 && existingInfo2.phone) || '' }));
    }

    // Invoke the callback (continue placing order)
    if (onLoginComplete) {
        onLoginComplete();
        onLoginComplete = null;
    }
}

// unlockOrderPage is no longer needed as a gate — kept as a no-op for compatibility
async function unlockOrderPage(user) {
    showUserProfile(user);
}

let hasPreCart = false;

function loadPreCart() {
    try {
        const preCart = JSON.parse(localStorage.getItem('sp_precart') || '{}');
        Object.keys(preCart).forEach(key => {
            if (preCart[key] > 0 && MENU[key]) {
                cart[key] = preCart[key];
                hasPreCart = true;
            }
        });

        if (hasPreCart) {
            localStorage.removeItem('sp_precart');
        }
    } catch (e) {
        // Ignore parse errors
    }
}

// --- Render Menu Items Dynamically ---
function renderMenu() {
    const container = document.getElementById('menu-items-container');
    if (!container) return;
    
    // Check for pre-cart first (before building HTML)
    loadPreCart();

    if (hasPreCart) {
        // Mode: Coming from dish page → show only cart items + hidden "add more"
        renderCartMode(container);
    } else {
        // Mode: Direct visit → show full menu
        renderFullMenu(container);
    }
}

function renderCartMode(container) {
    let html = '';
    
    // Cart section header
    html += '<div class="cart-head">';
    html += '<span class="cart-head-ic"><i class="ic" data-ic="cart"></i></span>';
    html += `<span class="cart-head-title">${t('your_cart')}</span>`;
    html += `<span class="cart-head-sub">${t('items_ready')}</span>`;
    html += '</div>';

    // Only show items in cart
    const cartKeys = Object.keys(MENU).filter(k => cart[k] > 0);
    cartKeys.forEach(key => {
        html += buildItemCardHTML(key);
    });

    // Divider
    html += '<div class="cart-divider"></div>';

    // Collapsible "Add more" section
    html += '<div id="addMoreSection">';
    html += `<button onclick="toggleAddMore()" id="addMoreBtn" class="add-more-btn">`;
    html += `${t('add_more')} <span id="addMoreArrow" style="transition:transform 0.3s;">▼</span>`;
    html += '</button>';
    html += '<div id="addMoreList" style="display:none;margin-top:0.5rem;">';

    // Show non-cart items grouped by category
    const nonCartVeg = Object.keys(MENU).filter(k => cart[k] === 0 && MENU[k].category === 'veg');
    const nonCartNonveg = Object.keys(MENU).filter(k => cart[k] === 0 && MENU[k].category === 'nonveg');

    if (nonCartVeg.length > 0) {
        html += `<div class="menu-category-header"><span class="veg-mark"></span> ${t('veg_thalis')}</div>`;
        nonCartVeg.forEach(key => { html += buildItemCardHTML(key); });
    }
    if (nonCartNonveg.length > 0) {
        html += `<div class="menu-category-header" style="margin-top:0.4rem;"><span class="nonveg-mark"></span> ${t('nonveg_thalis')}</div>`;
        nonCartNonveg.forEach(key => { html += buildItemCardHTML(key); });
    }

    html += '</div></div>';

    container.innerHTML = html;

    // Now update UI for items already in cart
    Object.keys(cart).forEach(key => {
        if (cart[key] > 0) {
            const qtyEl = document.getElementById('qty-' + key);
            if (qtyEl) qtyEl.textContent = cart[key];
            const addBtn = document.getElementById('add-' + key);
            const qtyControls = document.getElementById('qty-controls-' + key);
            if (addBtn) addBtn.style.display = 'none';
            if (qtyControls) qtyControls.style.display = 'flex';
            const extrasEl = document.getElementById('extras-' + key);
            if (extrasEl) extrasEl.style.display = 'block';
        }
    });

    recalc();
    showToast('Items added to your cart');
}

function renderFullMenu(container) {
    let html = '';
    
    // Group items by hotel
    const hotels = {};
    Object.keys(MENU).forEach(key => {
        const item = MENU[key];
        const hotel = item.hotel || (item.category === 'nonveg' ? 'Maratha Hotel' : 'Aapla Swad Hotel');
        if (!hotels[hotel]) hotels[hotel] = { veg: [], nonveg: [] };
        if (item.category === 'nonveg') hotels[hotel].nonveg.push(key);
        else hotels[hotel].veg.push(key);
    });

    // Define hotel display order and styling
    const hotelOrder = ['Aapla Swad Hotel', 'Shriyan Chinese', 'Mauli Veg Rol', 'Maratha Hotel'];
    const hotelIcons = { 'Aapla Swad Hotel': 'home', 'Shriyan Chinese': 'takeout', 'Mauli Veg Rol': 'wrap', 'Maratha Hotel': 'flame' };

    hotelOrder.forEach(hotelName => {
        const hotelData = hotels[hotelName];
        if (!hotelData) return;
        const allKeys = [...hotelData.veg, ...hotelData.nonveg];
        if (allKeys.length === 0) return;

        // Hotel section header
        html += `<div class="menu-hotel-header">
            <span class="mh-emoji"><i class="ic" data-ic="${hotelIcons[hotelName] || 'bowl'}"></i></span>
            <div>
                <div class="mh-name">${hotelName}</div>
                <div class="mh-sub">${allKeys.length} items available</div>
            </div>
        </div>`;

        if (hotelData.veg.length > 0) {
            html += `<div class="menu-category-header"><span class="veg-mark"></span> ${t('veg_thalis')}</div>`;
            hotelData.veg.forEach(key => { html += buildItemCardHTML(key); });
        }
        if (hotelData.nonveg.length > 0) {
            html += `<div class="menu-category-header" style="margin-top:0.4rem;"><span class="nonveg-mark"></span> ${t('nonveg_thalis')}</div>`;
            hotelData.nonveg.forEach(key => { html += buildItemCardHTML(key); });
        }
    });

    // Any hotels not in the predefined order
    Object.keys(hotels).forEach(hotelName => {
        if (hotelOrder.includes(hotelName)) return;
        const hotelData = hotels[hotelName];
        const allKeys = [...hotelData.veg, ...hotelData.nonveg];
        if (allKeys.length === 0) return;
        html += `<div class="menu-hotel-header">
            <span class="mh-emoji"><i class="ic" data-ic="bowl"></i></span>
            <div class="mh-name">${hotelName}</div>
        </div>`;
        allKeys.forEach(key => { html += buildItemCardHTML(key); });
    });
    
    container.innerHTML = html;
}

function toggleAddMore() {
    const list = document.getElementById('addMoreList');
    const arrow = document.getElementById('addMoreArrow');
    if (list.style.display === 'none') {
        list.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        list.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

function buildItemCardHTML(key) {
    const item = MENU[key];
    const soldOut = item.available === false;
    const isVeg = item.category === 'veg';
    const tagText = isVeg ? t('veg_label') : t('nonveg_label');
    const tagClass = isVeg ? 'ci-veg' : 'ci-nonveg';
    const isNew = !['dal-bati'].includes(key);

    // Translate dish name and description
    // t() hands back the key itself when there is no translation, so the real
    // name has to go in as the fallback (Chinese and roll items have none)
    const dishName = t('dish_' + key, item.name);
    const dishDesc = t('desc_' + key, item.includes);

    // Map extras keys to translation keys
    const EXTRAS_MAP = {
        'db-ghee':'extra_ghee','db-churma':'extra_churma','db-bati':'extra_bati',
        'zb-ghee':'extra_ghee','zb-onion':'extra_onion','zb-bhakri':'extra_bhakri',
        'bb-ghee':'extra_ghee','bb-bhakar':'extra_bhakar','bb-thecha':'extra_thecha',
        'bm-bhakar':'extra_bhakar','bm-rice':'extra_rice','bm-bombil':'extra_bombil',
        'zg-bhakar':'extra_bhakar','zg-zinga':'extra_zinga',
        'ck-bhakar':'extra_bhakari','ck-rice':'extra_rice','ck-chicken':'extra_chicken',
        'sd-ghee':'extra_ghee','sd-batti':'extra_batti','sd-sweet':'extra_sweet'
    };
    
    let extrasHTML = '';
    Object.keys(item.extras).forEach(ek => {
        const label = t(EXTRAS_MAP[ek]) || item.extrasLabels[ek];
        extrasHTML += `<label class="extra-chip"><input type="checkbox" id="extra-${ek}" onchange="recalc()"><span class="chip-inner">${label} <b>+₹${item.extras[ek]}</b></span></label>`;
    });
    
    return `
    <div class="cart-item-card" style="${soldOut ? 'opacity:0.5;' : ''}">
        <div class="ci-row">
            <img src="${item.image}" alt="${dishName}" class="ci-img"
                 style="${soldOut ? 'filter:grayscale(1);' : ''}">
            <div class="ci-info">
                <div class="ci-tags">
                    <span class="${tagClass}">${tagText}</span>
                    ${isNew ? '<span class="ci-new">NEW</span>' : ''}
                </div>
                <div class="ci-name">${dishName}</div>
                <div class="ci-desc">${dishDesc}</div>
                <div class="ci-price-row">
                    <span class="ci-old">₹${item.oldPrice}</span>
                    <span class="ci-price">₹${item.price}</span>
                    <span class="ci-off">${item.discount}</span>
                </div>
            </div>
            <div class="ci-actions">
                ${soldOut
                    ? `<span style="font-size:0.6rem;font-weight:700;color:#ef4444;text-align:center;">${t('sold_out')}</span>`
                    : `<button class="ci-add-btn" id="add-${key}" onclick="changeCartQty('${key}',1)">${t('add_btn')}</button>`}
                <div class="ci-qty-controls" id="qty-controls-${key}" style="display:none;">
                    <button class="ci-qty-btn" onclick="changeCartQty('${key}',-1)">−</button>
                    <span class="ci-qty-num" id="qty-${key}">0</span>
                    <button class="ci-qty-btn ci-plus" onclick="changeCartQty('${key}',1)">+</button>
                </div>
            </div>
        </div>
        <div class="ci-extras" id="extras-${key}" style="display:none;">
            <div class="ci-extras-title">${t('add_extras_colon')}</div>
            <div class="extras-list">${extrasHTML}</div>
        </div>
    </div>`;
}

// --- Cart Quantity ---
function changeCartQty(itemKey, delta) {
    // Block Shriyan Chinese items outside 3 PM - 10 PM
    if (delta > 0 && isShriyanChineseItem(itemKey) && !isChineseOpen()) {
        showToast('Shriyan Chinese opens at 3:00 PM. Available 3 PM – 10 PM');
        return;
    }
    // Block Mauli Veg Rol items outside 5 PM - 10 PM
    if (delta > 0 && isMauliRolItem(itemKey) && !isRollsOpen()) {
        showToast('Mauli Veg Rol opens at 5:00 PM. Available 5 PM – 10 PM');
        return;
    }
    cart[itemKey] = Math.max(0, (cart[itemKey] || 0) + delta);
    document.getElementById('qty-' + itemKey).textContent = cart[itemKey];
    
    // Show/hide the extras section for this item
    const extrasEl = document.getElementById('extras-' + itemKey);
    if (extrasEl) {
        extrasEl.style.display = cart[itemKey] > 0 ? 'block' : 'none';
    }
    
    // Update add/remove button states
    const addBtn = document.getElementById('add-' + itemKey);
    const qtyControls = document.getElementById('qty-controls-' + itemKey);
    if (cart[itemKey] > 0) {
        if (addBtn) addBtn.style.display = 'none';
        if (qtyControls) qtyControls.style.display = 'flex';
    } else {
        if (addBtn) addBtn.style.display = 'flex';
        if (qtyControls) qtyControls.style.display = 'none';
        // Uncheck extras when item removed
        const item = MENU[itemKey];
        Object.keys(item.extras).forEach(key => {
            const el = document.getElementById('extra-' + key);
            if (el) el.checked = false;
        });
    }
    
    recalc();
}

function getTotalQty() {
    return Object.values(cart).reduce((a, b) => a + b, 0);
}

function recalc() {
    total = 0;
    Object.keys(cart).forEach(itemKey => {
        if (cart[itemKey] <= 0) return;
        const item = MENU[itemKey];
        let itemExtras = 0;
        Object.keys(item.extras).forEach(key => {
            const el = document.getElementById('extra-' + key);
            if (el && el.checked) itemExtras += item.extras[key];
        });
        total += (item.price + itemExtras) * cart[itemKey];
    });




    document.getElementById('total-amount').textContent = '₹' + total;
    
    // Update "Next" button state
    const nextBtn = document.getElementById('btn-to-step2');
    if (nextBtn) {
        nextBtn.disabled = getTotalQty() === 0;
        nextBtn.style.opacity = getTotalQty() === 0 ? '0.4' : '1';
    }
    
    // Update cart count badge
    const badge = document.getElementById('cart-count-badge');
    const totalQty = getTotalQty();
    if (badge) {
        badge.textContent = totalQty;
        badge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
    }
}

// --- Steps ---
function goToStep(step) {
    if (step === 2 && getTotalQty() === 0) {
        showToast('Please add at least one item to your cart');
        return;
    }
    if (step === 3) {
        try {
            populateReview();
        } catch (e) {
            console.error('populateReview error:', e);
        }
    }

    // Track where we came from BEFORE updating
    const previousStep = goToStep._currentStep || 1;

    document.querySelectorAll('.order-step').forEach(p => p.classList.add('hidden'));
    const panelId = step === 4 ? 'step-success' : `step-${step}-panel`;
    document.getElementById(panelId).classList.remove('hidden');

    // Handle Step 2 sub-step visibility
    if (step === 2) {
        if (previousStep >= 3) {
            // Coming BACK from Step 3 — show name substep (don't reset)
            goToSubstep('substep-name');
        } else {
            // Coming from Step 1 — reset to location detection
            resetStep2Substeps();
        }
    }

    for (let i = 1; i <= 3; i++) {
        const dot = document.getElementById('dot-' + i);
        const label = document.getElementById('label-' + i);
        dot.classList.remove('active', 'done');
        label.classList.remove('active', 'done');
        if (i < step) { dot.classList.add('done'); label.classList.add('done'); }
        else if (i === step) { dot.classList.add('active'); label.classList.add('active'); }
    }

    if (step >= 2) document.getElementById('line-1').style.width = '100%';
    else document.getElementById('line-1').style.width = '0%';
    if (step >= 3) document.getElementById('line-2').style.width = '100%';
    else document.getElementById('line-2').style.width = '0%';

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Show/hide total bar (only on step 1)
    const totalBar = document.getElementById('orderTotalBar');
    if (totalBar) totalBar.style.display = step === 1 ? 'flex' : 'none';

    // Push history state so Android back button goes to previous step
    if (!goToStep._fromPop) {
        history.pushState({ step: step }, '', '#step-' + step);
    }
    // Update AFTER all logic has used the previous value
    goToStep._currentStep = step;
}

// Handle Android back button — go to previous step instead of exiting app
window.addEventListener('popstate', function(e) {
    const currentStep = goToStep._currentStep || 1;
    if (currentStep > 1) {
        goToStep._fromPop = true;
        goToStep(currentStep - 1);
        goToStep._fromPop = false;
    } else {
        // On step 1, go back to home page
        window.location.href = 'index.html';
    }
});

function populateReview() {
    // Build items summary
    const reviewItems = document.getElementById('review-items-list');
    let itemsHTML = '';
    let allExtras = [];
    let totalExtrasPrice = 0;

    Object.keys(cart).forEach(itemKey => {
        if (cart[itemKey] <= 0) return;
        const item = MENU[itemKey];
        const itemTotal = item.price * cart[itemKey];
        itemsHTML += `<div class="review-row"><span>${item.shortName} x${cart[itemKey]}</span><span>₹${itemTotal}</span></div>`;
        
        // Collect extras for this item
        Object.keys(item.extras).forEach(key => {
            const el = document.getElementById('extra-' + key);
            if (el && el.checked) {
                const label = item.extrasLabels[key].replace(/[^\w\s]/g, '').trim();
                allExtras.push(label);
                totalExtrasPrice += item.extras[key] * cart[itemKey];
            }
        });
    });
    reviewItems.innerHTML = itemsHTML;

    document.getElementById('review-total').textContent = '₹' + total;
    document.getElementById('place-total').textContent = '₹' + total;

    const extrasRow = document.getElementById('review-extras-row');
    if (allExtras.length > 0) {
        extrasRow.style.display = 'flex';
        document.getElementById('review-extras-text').textContent = allExtras.join(', ');
        document.getElementById('review-extras-price').textContent = '+₹' + totalExtrasPrice;
    } else {
        extrasRow.style.display = 'none';
    }

    document.getElementById('review-name').textContent = document.getElementById('f-name').value;
    document.getElementById('review-address').textContent = document.getElementById('f-address').value;
    
    const landmark = document.getElementById('f-landmark').value.trim();
    const reviewLandmark = document.getElementById('review-landmark');
    if (landmark) {
        reviewLandmark.textContent = 'Landmark: ' + landmark;
        reviewLandmark.style.display = '';
    } else {
        reviewLandmark.style.display = 'none';
    }
    
    document.getElementById('review-phone').textContent = 'Phone: ' + document.getElementById('f-phone').value;
    updatePayBtn();
}

// --- Update button text based on payment method ---
function updatePayBtn() {
    const payMethod = document.querySelector('input[name="pay"]:checked').value;
    const placeText = document.getElementById('place-text');
    const totalStr = '₹' + total;
    
    if (payMethod === 'online') {
        placeText.innerHTML = 'Pay ' + totalStr + ' Online';
    } else {
        placeText.innerHTML = 'Place Order — ' + totalStr;
    }
}

// --- Sub-step navigation for Step 2 ---
// Track whether location was auto-detected (to decide Back behavior)
let _locationWasDetected = false;

function goToSubstep(id) {
    document.querySelectorAll('.substep-panel').forEach(p => {
        p.style.display = 'none';
    });
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        target.style.animation = 'none';
        target.offsetHeight;
        target.style.animation = '';
    }

    // When showing the name substep, decide: saved-info card or edit form
    if (id === 'substep-name') {
        prepareNameSubstep();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Customer Info Persistence ---
function getSavedCustomerInfo() {
    try {
        return JSON.parse(localStorage.getItem('sp_customer_info') || 'null');
    } catch (e) { return null; }
}

function saveCustomerInfo(name, phone) {
    localStorage.setItem('sp_customer_info', JSON.stringify({ name, phone }));
}

// Decide whether to show the quick-confirm card or the edit form
function prepareNameSubstep() {
    const saved = getSavedCustomerInfo();
    const savedCard = document.getElementById('saved-info-card');
    const editForm = document.getElementById('edit-info-form');

    let bestName = '';
    let bestPhone = '';

    if (saved && saved.name) bestName = saved.name;
    else if (googleUser && googleUser.name && googleUser.name !== 'Guest') bestName = googleUser.name;

    if (saved && saved.phone) bestPhone = saved.phone;

    // Pre-fill form fields
    const nameField = document.getElementById('f-name');
    if (!nameField.value && bestName) nameField.value = bestName;
    if (!document.getElementById('f-phone').value && bestPhone) {
        document.getElementById('f-phone').value = bestPhone;
    }

    // If we have both saved, show confirmation card
    if (bestName && bestPhone && bestPhone.length === 10) {
        document.getElementById('saved-name-display').textContent = bestName;
        document.getElementById('saved-phone-display').textContent = bestPhone;
        savedCard.style.display = 'block';
        editForm.style.display = 'none';
    } else {
        savedCard.style.display = 'none';
        editForm.style.display = 'block';
    }
}

// User confirms saved info — check if address exists, then proceed
function confirmSavedInfo() {
    const saved = getSavedCustomerInfo();
    if (saved) {
        document.getElementById('f-name').value = saved.name;
        document.getElementById('f-phone').value = saved.phone;
    }

    // If address is already filled (from location detection), go straight to step 3
    const address = document.getElementById('f-address').value.trim();
    if (address) {
        goToStep(3);
    } else {
        // Need address — show the address entry step
        goToSubstep('substep-address');
    }
}

// User wants to change saved info
function showEditInfoForm() {
    document.getElementById('saved-info-card').style.display = 'none';
    document.getElementById('edit-info-form').style.display = 'block';
    setTimeout(() => { document.getElementById('f-name').focus(); }, 200);
}

// From address step → validate address, then go to name step
function goToNameFromAddress() {
    const address = document.getElementById('f-address').value.trim();
    if (!address) {
        showToast('Please enter your delivery address');
        document.getElementById('f-address').focus();
        return;
    }
    goToSubstep('substep-name');
}

// Back from name step → go to address (if skipped) or location (if detected)
function goBackFromName() {
    if (_locationWasDetected) {
        goToSubstep('substep-location');
    } else {
        goToSubstep('substep-address');
    }
}

// Validate name+phone, save, and go to Step 3
function goToStep3FromName() {
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const address = document.getElementById('f-address').value.trim();
    if (!name) {
        showToast('Please enter your name');
        document.getElementById('f-name').focus();
        return;
    }
    if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
        showToast('Enter a valid 10-digit phone number');
        document.getElementById('f-phone').focus();
        return;
    }
    if (!address) {
        showToast('Please enter your delivery address');
        return;
    }

    // Save customer info for next time
    saveCustomerInfo(name, phone);

    goToStep(3);
}

// Reset sub-steps when entering Step 2
function resetStep2Substeps() {
    document.querySelectorAll('.substep-panel').forEach(p => {
        p.style.display = 'none';
    });
    document.getElementById('substep-location').style.display = 'block';
    _locationWasDetected = false;
}


// --- Location ---
function detectLocation() {
    const btn = document.getElementById('detect-btn');
    const detectText = document.getElementById('detect-text');
    detectText.textContent = 'Detecting...';

    if (!navigator.geolocation) {
        showToast('Location not supported. Enter address manually.');
        detectText.textContent = 'Detect My Location';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            btn.classList.add('detected');
            detectText.textContent = 'Location Detected ✓';

            document.getElementById('location-result').style.display = 'flex';
            document.getElementById('loc-coords').textContent = 
                latitude.toFixed(6) + '°N, ' + longitude.toFixed(6) + '°E (±' + Math.round(accuracy) + 'm)';

            // Store EXACT coordinates for order (full precision)
            window._customerLat = latitude;
            window._customerLng = longitude;

            // Check delivery radius
            if (!isWithinDeliveryRange()) {
                const maxKm = SHOP_STATUS.maxDeliveryKm || 5;
                const dist = window._customerDistanceKm;
                btn.classList.remove('detected');
                btn.classList.add('out-of-range');
                detectText.textContent = 'Out of range';
                document.getElementById('loc-coords').textContent = 
                    `You are ${dist} km away. We deliver within ${maxKm} km only.`;
                document.getElementById('loc-coords').style.color = '#fca5a5';
                showToast(`Sorry! We currently deliver within ${maxKm} km only. You are ${dist} km away.`);
                // Disable the Place Order button
                const placeBtn = document.getElementById('place-btn');
                if (placeBtn) placeBtn.disabled = true;
                return;
            }

            console.log('📍 Exact GPS:', latitude, longitude, 'Accuracy:', accuracy + 'm');
            showToast('Exact location captured ±' + Math.round(accuracy) + 'm');

            // Auto-fill address via reverse geocoding, then advance to name step
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                .then(r => r.json())
                .then(data => {
                    if (data.display_name) {
                        document.getElementById('f-address').value = data.display_name;
                    }
                    if (data.address?.postcode) {
                        document.getElementById('f-pincode').value = data.address.postcode;
                    }
                    // Auto-advance to name step after a brief delay (skip address since location was detected)
                    _locationWasDetected = true;
                    setTimeout(() => {
                        goToSubstep('substep-name');
                    }, 800);
                })
                .catch(() => {
                    showToast('Address not found. You can type it manually.');
                    // Still advance to name step
                    _locationWasDetected = true;
                    setTimeout(() => {
                        goToSubstep('substep-name');
                    }, 800);
                });
        },
        () => {
            detectText.textContent = 'Detect My Location';
            showToast('Could not detect location. Enter address manually.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}


// --- Build Order Data ---
function buildOrderData(paymentMethod, paymentId) {
    const items = [];
    const extras = [];
    Object.keys(cart).forEach(itemKey => {
        if (cart[itemKey] <= 0) return;
        const item = MENU[itemKey];
        const lineExtras = [];
        Object.keys(item.extras || {}).forEach(key => {
            const el = document.getElementById('extra-' + key);
            if (el && el.checked) {
                lineExtras.push(key);
                extras.push(item.extrasLabels[key]);
            }
        });
        items.push({
            key: itemKey, name: item.name, qty: cart[itemKey],
            price: item.price, extras: lineExtras
        });
    });

    return {
        customerName: document.getElementById('f-name').value.trim(),
        email: googleUser ? googleUser.email : null,
        customerPic: googleUser ? googleUser.picture : null,
        phone: document.getElementById('f-phone').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        landmark: document.getElementById('f-landmark').value.trim(),
        pincode: document.getElementById('f-pincode').value.trim(),
        lat: window._customerLat || null,
        lng: window._customerLng || null,
        items: items,
        qty: getTotalQty(),
        extras: extras,
        total: total,
        paymentMethod: paymentMethod,
        paymentId: paymentId || null,
        deliveryTime: 'asap'
    };
}

function getCartSummary() {
    const parts = [];
    Object.keys(cart).forEach(k => {
        if (cart[k] > 0) parts.push(MENU[k].shortName + ' x' + cart[k]);
    });
    return parts.join(' + ');
}

// --- Save Order to AWS Backend ---
async function saveOrderToBackend(paymentMethod, paymentId, paymentProof) {
    const orderData = buildOrderData(paymentMethod, paymentId);

    // Proof the server checks against Razorpay before trusting "paid"
    if (paymentProof) Object.assign(orderData, paymentProof);

    const response = await fetch(API_URL + '/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });

    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Failed to create order');
    }

    return result.order;
}

// Shows a "Verifying payment…" spinner on the success screen while the server
// checks with Razorpay. No success messaging is shown until the server confirms.
function showPaymentChecking() {
    goToStep(4);

    // Change icon to a spinning orange circle (not the green checkmark)
    const iconWrap = document.getElementById('success-icon-wrap');
    if (iconWrap) {
        iconWrap.innerHTML = '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" style="animation:spin 1.2s linear infinite;"><circle cx="12" cy="12" r="10" stroke-dasharray="31.4" stroke-dashoffset="10"/></svg>' +
            '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
    }

    const heading = document.querySelector('#step-success h2');
    if (heading) heading.textContent = 'Verifying Payment…';

    const sub = document.querySelector('#step-success .success-card > p');
    if (sub) sub.textContent = 'Please wait while we confirm your payment with Razorpay…';

    const idEl = document.getElementById('s-order-id');
    if (idEl) idEl.textContent = 'Checking…';

    const payEl = document.getElementById('s-payment');
    if (payEl) payEl.textContent = 'Verifying…';

    const amountEl = document.getElementById('s-amount');
    if (amountEl) amountEl.textContent = '₹' + total;

    // Disable action links until we have a confirmed order
    ['track-link', 'wa-confirm-btn', 'share-loc-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.pointerEvents = 'none';
    });

    // Hide delivery code box until confirmed
    const codeBox = document.getElementById('s-code-box');
    if (codeBox) codeBox.style.display = 'none';
}

// Payment was NOT confirmed — the user cancelled, the UPI app timed out, etc.
// Show a clear message and let them retry or contact support.
function showPaymentNotConfirmed() {
    // Change icon to a red X
    const iconWrap = document.getElementById('success-icon-wrap');
    if (iconWrap) {
        iconWrap.innerHTML = '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    }

    const heading = document.querySelector('#step-success h2');
    if (heading) heading.textContent = 'Payment Not Completed';

    const sub = document.querySelector('#step-success .success-card > p');
    if (sub) {
        sub.innerHTML = 'We could not confirm your payment. If money was deducted, ' +
            'it will be refunded automatically. You can retry or ' +
            '<a href="https://wa.me/918805211717" style="color:#f59e0b;">message us on WhatsApp</a> for help.';
    }

    const idEl = document.getElementById('s-order-id');
    if (idEl) idEl.textContent = '—';

    const payEl = document.getElementById('s-payment');
    if (payEl) payEl.textContent = 'Not confirmed';

    // Show a retry button
    const btn = document.getElementById('place-btn');
    if (btn) {
        btn.disabled = false;
        btn.onclick = () => { goToStep(3); btn.onclick = placeOrder; };
    }

    // Show a "Go back" link
    const trackLink = document.getElementById('track-link');
    if (trackLink) {
        trackLink.style.pointerEvents = '';
        trackLink.href = 'order.html';
        trackLink.textContent = '← Go Back & Retry';
    }
}

// Asks the server to finish a checkout. The server confirms with Razorpay
// directly, so this works even if the browser lost the callback. Retries a few
// times because Razorpay can take a moment to mark a UPI payment captured.
async function completePayment(razorpayOrderId, attempts = 12) {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(API_URL + '/payment/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ razorpayOrderId })
            });
            const data = await res.json();

            if (data.success && data.order) {
                localStorage.removeItem('sp_pending_payment');
                showSuccess(data.order.orderId, 'Paid via Razorpay', data.order.deliveryCode);
                return data.order;
            }

            // 202 means Razorpay has not marked it captured yet — wait and retry
            if (res.status !== 202) {
                if (data.error) showToast(data.error);
                if (res.status === 409) localStorage.removeItem('sp_pending_payment');
                return null;
            }
        } catch (err) {
            // network hiccup — fall through to the retry
        }
        // Wait 3 seconds between retries (UPI payments can be slow)
        await new Promise(r => setTimeout(r, 3000));
    }
    return null;
}

// Returning from a UPI app fires a visibility change, not a page load. Without
// this the customer sits on the checkout screen until they think to refresh.
function watchForReturnFromPayment() {
    if (watchForReturnFromPayment.armed) return;
    watchForReturnFromPayment.armed = true;

    const check = () => {
        if (document.visibilityState !== 'visible') return;
        if (!localStorage.getItem('sp_pending_payment')) return;
        resumePendingPayment();
    };

    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
}

// Runs on page load. If the customer paid and never made it back, this puts
// them straight on the success screen with their order and delivery code.
async function resumePendingPayment() {
    if (resumePendingPayment.running) return;
    resumePendingPayment.running = true;
    try {
        await resumePendingPaymentInner();
    } finally {
        resumePendingPayment.running = false;
    }
}

async function resumePendingPaymentInner() {
    let pending;
    try {
        pending = JSON.parse(localStorage.getItem('sp_pending_payment') || 'null');
    } catch (err) {
        return;
    }
    if (!pending || !pending.razorpayOrderId) return;

    // Anything older than a day is stale; a real checkout resolves in minutes
    if (Date.now() - (pending.at || 0) > 86400000) {
        localStorage.removeItem('sp_pending_payment');
        return;
    }

    showToast('Checking your last payment…');
    await completePayment(pending.razorpayOrderId, 3);
}

// --- Place Order (login required here, not on page load) ---
async function placeOrder() {
    // If not logged in, ask for Google login first
    if (!googleUser) {
        showLoginModal(() => {
            // After successful login, retry placing the order
            placeOrder();
        });
        return;
    }

    // Check delivery radius before proceeding
    if (!isWithinDeliveryRange()) {
        const maxKm = SHOP_STATUS.maxDeliveryKm || 5;
        const dist = window._customerDistanceKm || '?';
        showToast(`Sorry! We currently deliver within ${maxKm} km only. You are ${dist} km away.`);
        return;
    }

    const payMethod = document.querySelector('input[name="pay"]:checked').value;

    // Re-check the shop and the cart before taking any money.
    if (!(await cartStillOrderable())) return;

    if (payMethod === 'online') {
        initiateRazorpay();
    } else {
        processCODOrder();
    }
}

// Refreshes live config and confirms every item in the cart can still be sold.
async function cartStillOrderable() {
    const btn = document.getElementById('place-btn');
    const placeText = document.getElementById('place-text');
    const placeLoader = document.getElementById('place-loader');
    
    // Show checking state without destroying the button's inner structure
    if (btn) btn.disabled = true;
    if (placeText) placeText.textContent = 'Checking…';

    try {
        await loadShopConfig();
    } catch (err) {
        // If the check itself fails, let the order attempt proceed as before
    }

    if (btn) btn.disabled = false;
    // Restore the button text
    updatePayBtn();

    // HARD FAILSAFE: Always check client-side time before allowing order
    if (!isWithinOperatingHours()) {
        SHOP_STATUS.isOpen = false;
        SHOP_STATUS.closed = true;
        checkOperatingHours();
        showToast('Sorry, we are closed right now. Open daily 10:00 AM – 10:00 PM');
        return false;
    }

    if (!SHOP_STATUS.isOpen) {
        checkOperatingHours();
        showToast(SHOP_STATUS.message || 'Sorry, we are closed right now');
        return false;
    }

    // Block Shriyan Chinese items outside 3 PM - 10 PM
    if (!isChineseOpen()) {
        const chineseInCart = Object.keys(cart).filter(k => cart[k] > 0 && isShriyanChineseItem(k));
        if (chineseInCart.length > 0) {
            chineseInCart.forEach(k => { cart[k] = 0; });
            renderMenu();
            recalc();
            showToast('Shriyan Chinese items removed — available only 3 PM – 10 PM');
            // Check if cart is now empty
            const remaining = Object.keys(cart).filter(k => cart[k] > 0);
            if (remaining.length === 0) return false;
        }
    }

    // Block Mauli Veg Rol items outside 5 PM - 10 PM
    if (!isRollsOpen()) {
        const rollsInCart = Object.keys(cart).filter(k => cart[k] > 0 && isMauliRolItem(k));
        if (rollsInCart.length > 0) {
            rollsInCart.forEach(k => { cart[k] = 0; });
            renderMenu();
            recalc();
            showToast('Mauli Veg Rol items removed — available only 5 PM – 10 PM');
            const remaining = Object.keys(cart).filter(k => cart[k] > 0);
            if (remaining.length === 0) return false;
        }
    }

    const unavailable = Object.keys(cart).filter(key =>
        cart[key] > 0 && (!MENU[key] || MENU[key].available === false));

    if (unavailable.length) {
        const names = unavailable.map(k => (MENU[k] && MENU[k].name) || k).join(', ');
        unavailable.forEach(k => { cart[k] = 0; });
        renderMenu();
        recalc();
        showToast(names + ' just sold out — removed from your cart');
        return false;
    }

    return true;
}

// --- Razorpay Payment ---
async function initiateRazorpay() {
    const btn = document.getElementById('place-btn');
    btn.disabled = true;

    // Step 1: Ask the server to create a Razorpay order
    let payment;
    try {
        const res = await fetch(API_URL + '/payment/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...buildOrderData('online', null), paymentMethod: 'online' })
        });
        payment = await res.json();
        if (!payment.success) throw new Error(payment.error || 'Could not start the payment');
    } catch (err) {
        showToast(err.message);
        btn.disabled = false;
        return;
    }

    // Save pending payment for recovery
    localStorage.setItem('sp_pending_payment', JSON.stringify({
        razorpayOrderId: payment.razorpayOrderId,
        total: payment.total,
        at: Date.now()
    }));

    // Step 2: Open pay.html in Chrome — UPI (GPay/PhonePe) works there
    const key = payment.keyId || RAZORPAY_KEY;
    const customerName = document.getElementById('f-name').value.trim();
    const customerPhone = document.getElementById('f-phone').value.trim();
    const customerEmail = googleUser ? googleUser.email : '';

    const payUrl = 'https://aaplaswad.store/pay.html?' + new URLSearchParams({
        key: key,
        order_id: payment.razorpayOrderId,
        amount: payment.amount,
        name: customerName,
        contact: customerPhone,
        email: customerEmail,
        desc: getCartSummary(),
        api: API_URL
    }).toString();

    // Open in Chrome via Android intent
    const chromeIntent = 'intent://' + payUrl.replace('https://', '') +
        '#Intent;scheme=https;package=com.android.chrome;end';

    try {
        window.location.href = chromeIntent;
    } catch(e) {
        window.open(payUrl, '_blank');
    }

    // When user returns from Chrome, auto-check if payment completed
    const checkOnReturn = () => {
        if (document.visibilityState === 'visible') {
            document.removeEventListener('visibilitychange', checkOnReturn);
            showPaymentChecking();
            setTimeout(async () => {
                const order = await completePayment(payment.razorpayOrderId);
                if (!order) {
                    showPaymentNotConfirmed();
                    btn.disabled = false;
                }
            }, 2000);
        }
    };
    setTimeout(() => {
        document.addEventListener('visibilitychange', checkOnReturn);
    }, 1000);
}

// --- COD Order ---
async function processCODOrder() {
    const btn = document.getElementById('place-btn');
    document.getElementById('place-text').style.display = 'none';
    document.getElementById('place-loader').style.display = 'flex';
    btn.disabled = true;

    try {
        const order = await saveOrderToBackend('cod', null);
        showSuccess(order.orderId, 'Cash on Delivery', order.deliveryCode);
    } catch (err) {
        showToast('Order failed: ' + err.message);
        btn.disabled = false;
        document.getElementById('place-text').style.display = '';
        document.getElementById('place-loader').style.display = 'none';
    }
}

// --- Show Success ---
function showSuccess(orderId, paymentLabel, deliveryCode) {
    // Restore green checkmark icon
    const iconWrap = document.getElementById('success-icon-wrap');
    if (iconWrap) {
        iconWrap.innerHTML = '<svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 16 7 13"/></svg>';
    }

    document.getElementById('s-order-id').textContent = orderId;

    // The delivery partner has to be told this before they can close the order
    if (deliveryCode) {
        const box = document.getElementById('s-code-box');
        if (box) {
            box.style.display = 'block';
            document.getElementById('s-delivery-code').textContent = deliveryCode;
        }
    }
    document.getElementById('s-amount').textContent = '₹' + total;
    document.getElementById('s-payment').textContent = paymentLabel;

    // Set tracking link with order ID
    document.getElementById('track-link').href = 'track.html?id=' + encodeURIComponent(orderId);
    ['track-link', 'wa-confirm-btn', 'share-loc-btn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.pointerEvents = '';
    });

    const heading = document.querySelector('#step-success h2');
    if (heading) heading.textContent = 'Order Booked!';
    const sub = document.querySelector('#step-success .success-card > p');
    if (sub) sub.textContent = 'Your food is being prepared fresh.';

    // Best moment to ask about offers — they have just happily ordered
    if (typeof spShowOfferOptIn === 'function') {
        spShowOfferOptIn(document.querySelector('#step-success .success-card'));
    }

    // Show delivery estimate
    const estEl = document.getElementById('s-delivery-est');
    if (estEl) estEl.textContent = 'Estimated delivery: 25-35 minutes';

    // Save to local orders for reorder & loyalty
    // Also persist customer info for future orders
    const customerName = document.getElementById('f-name')?.value?.trim();
    const customerPhone = document.getElementById('f-phone')?.value?.trim();
    if (customerName && customerPhone) {
        saveCustomerInfo(customerName, customerPhone);
    }

    const localOrders = JSON.parse(localStorage.getItem('sp_orders') || '[]');
    localOrders.push({
        orderId: orderId,
        deliveryCode: deliveryCode || null,
        items: getCartSummary(),
        cart: JSON.parse(JSON.stringify(cart)),
        qty: getTotalQty(),
        total: total,
        extras: buildOrderData('', null).extras,
        // Kept on this device so the tracking map can show where the food is
        // going without the API ever handing the address back out
        lat: window._customerLat || null,
        lng: window._customerLng || null,
        date: new Date().toISOString(),
        payment: paymentLabel
    });
    localStorage.setItem('sp_orders', JSON.stringify(localOrders));

    // Update loyalty stamps
    const stamps = parseInt(localStorage.getItem('sp_loyalty_stamps') || '0') + 1;
    localStorage.setItem('sp_loyalty_stamps', stamps.toString());
    const stampEl = document.getElementById('s-loyalty');
    if (stampEl) {
        if (stamps >= 5) {
            stampEl.textContent = 'Congrats! Your next order is FREE! (Stamp ' + stamps + '/5)';
            stampEl.style.color = '#22c55e';
        } else {
            stampEl.textContent = 'Loyalty stamp ' + stamps + '/5 — ' + (5 - stamps) + ' more for a free thali!';
        }
        stampEl.style.display = 'block';
    }

    // Update today's order counter
    const todayKey = 'sp_today_' + new Date().toDateString();
    const todayCount = parseInt(localStorage.getItem(todayKey) || '0') + 1;
    localStorage.setItem(todayKey, todayCount.toString());

    // Reset button
    const btn = document.getElementById('place-btn');
    document.getElementById('place-text').style.display = '';
    document.getElementById('place-loader').style.display = 'none';
    btn.disabled = false;

    goToStep(4);

    // Send WhatsApp confirmation
    sendWhatsAppConfirmation(orderId, paymentLabel);
}

// --- WhatsApp Order Confirmation ---
function sendWhatsAppConfirmation(orderId, paymentLabel) {
    const name = document.getElementById('f-name').value.trim();
    const phone = document.getElementById('f-phone').value.trim();
    const address = document.getElementById('f-address').value.trim();
    const landmark = document.getElementById('f-landmark').value.trim();

    let msg = `✅ *Order Confirmed!*\n\n`;
    msg += `📋 *Order ID:* ${orderId}\n`;
    msg += `👤 *Name:* ${name}\n`;
    msg += `📞 *Phone:* ${phone}\n`;
    msg += `🍛 *Items:* ${getCartSummary()}\n`;
    msg += `💰 *Total:* ₹${total}\n`;
    msg += `💳 *Payment:* ${paymentLabel}\n`;
    msg += `📍 *Address:* ${address}\n`;
    if (landmark) msg += `📌 *Landmark:* ${landmark}\n`;
    msg += `\n🛵 *Delivery:* ~25-35 minutes\n`;
    msg += `\nTrack: https://aaplaswad.store/track.html?id=${orderId}`;

    // Show WhatsApp share button for confirmation
    const waBtn = document.getElementById('wa-confirm-btn');
    if (waBtn) {
        waBtn.href = `https://wa.me/91${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`;
        waBtn.style.display = 'flex';
    }

    // Also show share location button
    const locBtn = document.getElementById('share-loc-btn');
    if (locBtn && window._customerLat) {
        const locMsg = `📍 My delivery location for order ${orderId}:\nhttps://maps.google.com/maps?q=${window._customerLat},${window._customerLng}`;
        locBtn.href = `https://wa.me/91${PHONE_NUMBER}?text=${encodeURIComponent(locMsg)}`;
        locBtn.style.display = 'flex';
    }
}

// --- Operating Hours Check ---
function checkOperatingHours() {
    const closedBanner = document.getElementById('closed-banner');
    const placeBtn = document.getElementById('place-btn');
    const shut = !SHOP_STATUS.isOpen;

    if (closedBanner) {
        closedBanner.style.display = shut ? 'block' : 'none';
        if (shut) {
            const heading = closedBanner.querySelector('p');
            const sub = closedBanner.querySelector('span');
            if (heading) {
                heading.textContent = SHOP_STATUS.paused
                    ? 'We have paused new orders'
                    : "We're closed right now";
            }
            if (sub) {
                sub.textContent = SHOP_STATUS.message ||
                    ('Open daily ' + SHOP_STATUS.openTime + ' – ' + SHOP_STATUS.closeTime);
            }
        }
    }

    if (placeBtn) {
        placeBtn.disabled = shut;
        placeBtn.style.opacity = shut ? '0.4' : '';
    }
}

// Re-check operating hours every 60 seconds (catches users who leave page open past closing)
setInterval(function() {
    if (!isWithinOperatingHours()) {
        SHOP_STATUS.isOpen = false;
        SHOP_STATUS.closed = true;
    }
    checkOperatingHours();
}, 60000);

// --- First Order Badge ---
function showFirstOrderBadge() {
    const existingOrders = JSON.parse(localStorage.getItem('sp_orders') || '[]');
    if (existingOrders.length === 0) {
        const badge = document.getElementById('first-order-badge');
        if (badge) badge.style.display = 'flex';
    }
    // Initial recalc to apply discount
    recalc();
}

// --- Toast ---
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2500);
}
