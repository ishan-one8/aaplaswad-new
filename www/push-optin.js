/* ============================================
   SAI PRASAD — Customer offer notifications
   Asks permission at the one moment a customer is clearly happy to hear
   from us again: right after they place an order.
   ============================================ */

const SP_PUSH_API = 'https://f37z1y2xbg.execute-api.ap-south-1.amazonaws.com';
const SP_PUSH_ASKED_KEY = 'sp_push_asked';

let spMessaging = null;

async function spInitFirebase() {
    if (!SP_FIREBASE.configured) return null;
    if (spMessaging) return spMessaging;

    // Loaded on demand so the ordering page is not slowed down by an SDK most
    // visits never need.
    if (!window.firebase) {
        await spLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
        await spLoadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
    }

    firebase.initializeApp({
        apiKey: SP_FIREBASE.apiKey,
        authDomain: SP_FIREBASE.authDomain,
        projectId: SP_FIREBASE.projectId,
        messagingSenderId: SP_FIREBASE.messagingSenderId,
        appId: SP_FIREBASE.appId
    });

    spMessaging = firebase.messaging();
    return spMessaging;
}

function spLoadScript(src) {
    return new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = src;
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
    });
}

// Registers this browser/app for offers. Returns true once a token reaches us.
async function spEnableOffers() {
    if (!SP_FIREBASE.configured) return false;

    // --- Native App: Use Capacitor Push Notifications ---
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        try {
            const { PushNotifications } = window.Capacitor.Plugins;
            if (!PushNotifications) return false;

            const perm = await PushNotifications.requestPermissions();
            if (perm.receive !== 'granted') return false;

            await PushNotifications.register();

            return new Promise((resolve) => {
                PushNotifications.addListener('registration', async (token) => {
                    const user = JSON.parse(localStorage.getItem('sp_google_user') || 'null');
                    await fetch(SP_PUSH_API + '/customer/subscribe', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token.value,
                            platform: 'android',
                            email: user && user.email ? user.email : null,
                            name: user && user.name ? user.name : null
                        })
                    });
                    localStorage.setItem(SP_PUSH_ASKED_KEY, 'granted');
                    resolve(true);
                });
                PushNotifications.addListener('registrationError', () => resolve(false));
                setTimeout(() => resolve(false), 8000);
            });
        } catch (err) {
            console.warn('Native push registration failed', err);
            return false;
        }
    }

    // --- Web: Use Firebase Cloud Messaging ---
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return false;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
        const messaging = await spInitFirebase();
        if (!messaging) return false;

        const token = await messaging.getToken({
            vapidKey: SP_FIREBASE.vapidKey,
            serviceWorkerRegistration: registration
        });
        if (!token) return false;

        const user = JSON.parse(localStorage.getItem('sp_google_user') || 'null');

        await fetch(SP_PUSH_API + '/customer/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token,
                platform: 'web',
                email: user && user.email ? user.email : null,
                name: user && user.name ? user.name : null
            })
        });

        localStorage.setItem(SP_PUSH_ASKED_KEY, 'granted');
        return true;
    } catch (err) {
        console.warn('Could not enable offer notifications', err);
        return false;
    }
}

// Shows a small opt-in card. Only ever asked once — a second prompt after a
// refusal is just nagging, and browsers block repeat prompts anyway.
function spShowOfferOptIn(container) {
    if (!SP_FIREBASE.configured) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(SP_PUSH_ASKED_KEY)) return;
    if (!container) return;

    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);' +
        'border-radius:12px;padding:0.85rem;margin:0.6rem 0;text-align:center;';
    card.innerHTML =
        '<div style="font-size:0.82rem;font-weight:700;color:#f59e0b;margin-bottom:0.2rem;">' +
            '🔔 Get our offers first</div>' +
        '<div style="font-size:0.7rem;color:#9ca3af;margin-bottom:0.6rem;">' +
            'We will let you know about discounts and new thalis. No spam.</div>' +
        '<button id="sp-push-yes" style="padding:0.55rem 1.1rem;border:none;border-radius:9px;' +
            'background:linear-gradient(135deg,#ea580c,#f59e0b);color:#fff;font-weight:700;' +
            'font-size:0.78rem;font-family:inherit;cursor:pointer;">Yes, notify me</button>' +
        '<button id="sp-push-no" style="margin-left:0.5rem;padding:0.55rem 0.9rem;border:none;' +
            'border-radius:9px;background:transparent;color:#6b7280;font-size:0.75rem;' +
            'font-family:inherit;cursor:pointer;">No thanks</button>';

    container.appendChild(card);

    card.querySelector('#sp-push-yes').onclick = async () => {
        const ok = await spEnableOffers();
        card.innerHTML = ok
            ? '<div style="font-size:0.78rem;color:#22c55e;font-weight:600;">✅ You are on the list</div>'
            : '<div style="font-size:0.75rem;color:#9ca3af;">No problem — you can turn this on in your browser settings later.</div>';
        setTimeout(() => card.remove(), 3500);
    };

    card.querySelector('#sp-push-no').onclick = () => {
        localStorage.setItem(SP_PUSH_ASKED_KEY, 'declined');
        card.remove();
    };
}
