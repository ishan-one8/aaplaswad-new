/* ============================================
   SAI PRASAD — Customer offer notifications
   On Android: automatically requests permission and registers on app startup.
   On Web: shows an opt-in banner on the first visit (not just after ordering).
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
    if (!SP_FIREBASE.webPushReady) return false;
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

// ── Auto-register on app startup ──
// For Android native: request permission immediately and silently register.
// For Web: show a prominent opt-in banner at the top of the page.

function spAutoRegisterOnStartup() {
    if (!SP_FIREBASE.configured) return;
    // Already registered — don't ask again
    if (localStorage.getItem(SP_PUSH_ASKED_KEY) === 'granted') return;

    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isNative) {
        // On Android, request permission immediately on app open.
        // Android will show the system permission dialog automatically.
        // Once granted, it stays granted forever — no need to ask again.
        setTimeout(() => {
            spEnableOffers().then(ok => {
                if (ok) console.log('Push notifications enabled on startup');
            }).catch(() => {});
        }, 1500); // Small delay to let the app finish loading
    } else {
        // On web, we can't request permission without a user gesture,
        // so show a banner at the top of the page instead.
        // Only if the user hasn't declined before.
        if (localStorage.getItem(SP_PUSH_ASKED_KEY) === 'declined') return;
        if (!('Notification' in window) || Notification.permission !== 'default') return;

        setTimeout(() => {
            spShowStartupBanner();
        }, 2000);
    }
}

// A fixed banner at top of page for web users
function spShowStartupBanner() {
    if (!SP_FIREBASE.webPushReady) return;
    if (document.getElementById('sp-push-startup')) return;

    const bar = document.createElement('div');
    bar.id = 'sp-push-startup';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
        'background:linear-gradient(135deg,#ea580c,#f59e0b);color:#fff;' +
        'padding:0.65rem 1rem;display:flex;align-items:center;justify-content:center;' +
        'gap:0.6rem;font-family:inherit;font-size:0.78rem;font-weight:600;' +
        'box-shadow:0 2px 12px rgba(0,0,0,0.3);';
    bar.innerHTML =
        '<span>🔔 Get deals & offers on your phone!</span>' +
        '<button id="sp-startup-yes" style="padding:0.4rem 0.8rem;border:2px solid #fff;border-radius:8px;' +
            'background:transparent;color:#fff;font-weight:700;font-size:0.72rem;cursor:pointer;font-family:inherit;">Allow</button>' +
        '<button id="sp-startup-no" style="padding:0.4rem 0.5rem;border:none;background:transparent;' +
            'color:rgba(255,255,255,0.7);font-size:0.72rem;cursor:pointer;font-family:inherit;">✕</button>';

    document.body.prepend(bar);

    bar.querySelector('#sp-startup-yes').onclick = async () => {
        const ok = await spEnableOffers();
        bar.innerHTML = ok
            ? '<span style="color:#fff">✅ You\'ll get our best offers!</span>'
            : '<span style="color:#fff">No problem — you can enable this later.</span>';
        setTimeout(() => bar.remove(), 2500);
    };

    bar.querySelector('#sp-startup-no').onclick = () => {
        localStorage.setItem(SP_PUSH_ASKED_KEY, 'declined');
        bar.remove();
    };
}

// Shows a small opt-in card (kept for post-order flow as backup).
function spShowOfferOptIn(container) {
    if (!SP_FIREBASE.configured) return;
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
    // On native, we already asked on startup — just silently try again
    if (isNative) {
        spEnableOffers().catch(() => {});
        return;
    }
    if (!SP_FIREBASE.webPushReady) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(SP_PUSH_ASKED_KEY)) return;
    if (!container) return;

    const card = document.createElement('div');
    card.style.cssText = 'background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);' +
        'border-radius:12px;padding:0.85rem;margin:0.6rem 0;text-align:center;';
    card.innerHTML =
        '<div style="font-size:0.82rem;font-weight:700;color:var(--brand-ink,#f59e0b);margin-bottom:0.2rem;">' +
            (window.ASIcon ? ASIcon('bell') : '') + ' Get our offers first</div>' +
        '<div style="font-size:0.7rem;color:var(--text-2,#9ca3af);margin-bottom:0.6rem;">' +
            'We will let you know about discounts and new thalis. No spam.</div>' +
        '<button id="sp-push-yes" style="padding:0.55rem 1.1rem;border:none;border-radius:9px;' +
            'background:linear-gradient(135deg,#ea580c,#f59e0b);color:#fff;font-weight:700;' +
            'font-size:0.78rem;font-family:inherit;cursor:pointer;">Yes, notify me</button>' +
        '<button id="sp-push-no" style="margin-left:0.5rem;padding:0.55rem 0.9rem;border:none;' +
            'border-radius:9px;background:transparent;color:var(--text-3,#6b7280);font-size:0.75rem;' +
            'font-family:inherit;cursor:pointer;">No thanks</button>';

    container.appendChild(card);

    card.querySelector('#sp-push-yes').onclick = async () => {
        const ok = await spEnableOffers();
        card.innerHTML = ok
            ? '<div style="font-size:0.78rem;color:#22c55e;font-weight:600;">' + (window.ASIcon ? ASIcon('check-circle') : '') + ' You are on the list</div>'
            : '<div style="font-size:0.75rem;color:var(--text-2,#9ca3af);">No problem — you can turn this on in your browser settings later.</div>';
        setTimeout(() => card.remove(), 3500);
    };

    card.querySelector('#sp-push-no').onclick = () => {
        localStorage.setItem(SP_PUSH_ASKED_KEY, 'declined');
        card.remove();
    };
}

// ── Kickstart on page load ──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', spAutoRegisterOnStartup);
} else {
    spAutoRegisterOnStartup();
}
