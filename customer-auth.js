/* ============================================
   SAI PRASAD — Customer identity
   Turns the Google sign-in into a token this site can prove itself with, so
   "My Orders" shows the signed-in customer's orders and nobody else's.
   ============================================ */

const SP_AUTH_API = 'https://f37z1y2xbg.execute-api.ap-south-1.amazonaws.com';
const SP_CUSTOMER_TOKEN_KEY = 'sp_customer_token';

function spCustomerToken() {
    return localStorage.getItem(SP_CUSTOMER_TOKEN_KEY) || '';
}

// Attach to any request that should return this customer's own data
function spAuthHeaders() {
    const token = spCustomerToken();
    return token ? { Authorization: 'Bearer ' + token } : {};
}

// Swaps the Google credential for our own longer-lived token. Google's own
// token expires in an hour, which would log people out mid-afternoon.
async function spExchangeGoogleCredential(credential, accessToken = null) {
    if (!credential && !accessToken) return null;
    try {
        const res = await fetch(SP_AUTH_API + '/auth/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credential: credential || undefined,
                accessToken: accessToken || undefined,
                platform: (window.Capacitor && window.Capacitor.isNativePlatform &&
                    window.Capacitor.isNativePlatform()) ? 'android' : 'web'
            })
        });
        const data = await res.json();
        if (data && data.success && data.token) {
            localStorage.setItem(SP_CUSTOMER_TOKEN_KEY, data.token);
            return data.token;
        }
    } catch (err) {
        // Signing in still works; only the order history needs this
        console.warn('Could not verify sign-in with the server', err);
    }
    return null;
}

const SP_GOOGLE_CLIENT_ID =
    '861754401920-c1gc6di0ne4cfurikkbnj3tv2obb8fu4.apps.googleusercontent.com';

function spLoadGoogleScript() {
    return new Promise((resolve) => {
        if (window.google && google.accounts && google.accounts.id) return resolve(true);
        const existing = document.querySelector('script[src*="accounts.google.com/gsi"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(true));
            setTimeout(() => resolve(!!(window.google && google.accounts)), 3000);
            return;
        }
        const el = document.createElement('script');
        el.src = 'https://accounts.google.com/gsi/client';
        el.async = true;
        el.onload = () => resolve(true);
        el.onerror = () => resolve(false);
        document.head.appendChild(el);
    });
}

// Anyone who signed in before tokens existed has a Google session on this
// device but nothing the server will accept. Ask Google for a fresh credential
// quietly — they are already signed in, so this usually needs no interaction.
//
// IMPORTANT: This must NEVER show a login dialog. The user should only see
// the "Sign in with Google" button when they explicitly navigate to it.
async function spEnsureCustomerToken(onReady) {
    if (spCustomerToken()) return true;

    const user = JSON.parse(localStorage.getItem('sp_google_user') || 'null');
    if (!user || !user.email) return false;          // guest — nothing to prove

    // --- Native App flow ---
    // Try SocialLogin.login() at most ONCE per app session to get a token.
    // After the first attempt (success or failure), skip silently.
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        if (sessionStorage.getItem('sp_native_token_tried')) {
            return false;  // Already tried this session — don't show picker again
        }
        sessionStorage.setItem('sp_native_token_tried', '1');
        try {
            const { SocialLogin } = window.Capacitor.Plugins;
            if (SocialLogin) {
                await SocialLogin.initialize({ google: { webClientId: SP_GOOGLE_CLIENT_ID } });
                const result = await SocialLogin.login({ provider: 'google', options: {} });
                if (result && result.result && result.result.idToken) {
                    const token = await spExchangeGoogleCredential(result.result.idToken);
                    if (token) {
                        if (typeof onReady === 'function') onReady();
                        return true;
                    }
                }
                if (result && result.result && result.result.accessToken) {
                    const token = await spExchangeGoogleCredential(null, result.result.accessToken);
                    if (token) {
                        if (typeof onReady === 'function') onReady();
                        return true;
                    }
                }
            }
        } catch (e) {
            console.error('Native token exchange failed', e);
        }
        return false;
    }

    // --- Web flow: try silent GSI auto-select (no UI shown) ---
    const loaded = await spLoadGoogleScript();
    if (!loaded) return false;

    return new Promise((resolve) => {
        let settled = false;
        const finish = (ok) => {
            if (settled) return;
            settled = true;
            if (ok && typeof onReady === 'function') onReady();
            resolve(ok);
        };

        try {
            google.accounts.id.initialize({
                client_id: SP_GOOGLE_CLIENT_ID,
                auto_select: true,
                callback: async (response) => {
                    const token = await spExchangeGoogleCredential(response.credential);
                    finish(!!token);
                }
            });
            google.accounts.id.prompt();
        } catch (err) {
            finish(false);
        }

        // Google may show nothing at all if the session cannot be reused
        setTimeout(() => finish(false), 6000);
    });
}

function spClearCustomerToken() {
    localStorage.removeItem(SP_CUSTOMER_TOKEN_KEY);
}

// Orders placed on this device, used when someone is browsing as a guest and
// therefore has no account for the server to match against.
function spLocalOrders() {
    try {
        return JSON.parse(localStorage.getItem('sp_orders') || '[]');
    } catch (err) {
        return [];
    }
}

// ========== WebView Detection ==========
// Google Sign-In (GSI/GIS) is blocked in WebViews by Google's policy.
// Detect WebView so we can use OAuth redirect flow instead.
function spIsWebView() {
    var ua = navigator.userAgent || '';
    // Android WebView markers
    if (/wv|WebView/.test(ua)) return true;
    // Android browser without Chrome (older WebViews)
    if (ua.includes('Android') && !ua.includes('Chrome/')) return true;
    // Capacitor WebView
    if (window.Capacitor && window.Capacitor.isNativePlatform &&
        window.Capacitor.isNativePlatform()) return true;
    // Facebook/Instagram in-app browsers
    if (/FBAN|FBAV|Instagram/.test(ua)) return true;
    return false;
}

// Check if native SocialLogin Capacitor plugin is available
function spHasNativeSocialLogin() {
    try {
        return !!(window.Capacitor && window.Capacitor.Plugins &&
                  window.Capacitor.Plugins.SocialLogin);
    } catch (e) {
        return false;
    }
}

// ========== OAuth Redirect Flow (WebView Fallback) ==========
// Opens Google OAuth 2.0 implicit grant in the same window.
// This works in WebViews where GSI is blocked.
function spStartOAuthRedirect() {
    // Save current page URL so oauth-callback.html can redirect back
    // Use localStorage because sessionStorage is lost during cross-origin navigation in WebViews
    localStorage.setItem('sp_oauth_return', window.location.href);

    var redirectUri = window.location.origin + '/oauth-callback.html';
    var params = [
        'client_id=' + encodeURIComponent(SP_GOOGLE_CLIENT_ID),
        'redirect_uri=' + encodeURIComponent(redirectUri),
        'response_type=token',
        'scope=' + encodeURIComponent('openid email profile'),
        'include_granted_scopes=true',
        'prompt=select_account'
    ];
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.join('&');
}
