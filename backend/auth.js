// === SAI PRASAD — Auth helpers ===
// PIN hashing, staff tokens, and Google ID token verification.
// Uses only Node's built-in crypto — no extra Lambda dependencies.

const crypto = require('crypto');

const PBKDF2_ITERATIONS = 120000;
const PBKDF2_KEYLEN = 32;
const PBKDF2_DIGEST = 'sha256';

const STAFF_TOKEN_TTL = 7 * 24 * 60 * 60;        // 7 days
const CUSTOMER_TOKEN_TTL = 30 * 24 * 60 * 60;    // 30 days

// ── PIN hashing ──

function hashPin(pin, existingSalt) {
    const salt = existingSalt || crypto.randomBytes(16).toString('hex');
    const hash = crypto
        .pbkdf2Sync(String(pin), salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
        .toString('hex');
    return { hash, salt };
}

function verifyPin(pin, expectedHash, salt) {
    if (!pin || !expectedHash || !salt) return false;
    const { hash } = hashPin(pin, salt);
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(expectedHash, 'hex');
    // timingSafeEqual throws on length mismatch, so guard first
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── Base64url ──

function b64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input) {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded, 'base64');
}

// ── Our own tokens (HMAC-SHA256, JWT-shaped) ──

function getSecret() {
    const secret = process.env.TOKEN_SECRET;
    if (!secret) throw new Error('TOKEN_SECRET is not configured');
    return secret;
}

function signToken(payload, ttlSeconds) {
    const now = Math.floor(Date.now() / 1000);
    const body = { ...payload, iat: now, exp: now + ttlSeconds };
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify(body));
    const signature = crypto
        .createHmac('sha256', getSecret())
        .update(`${header}.${claims}`)
        .digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `${header}.${claims}.${signature}`;
}

function verifyToken(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, claims, signature] = parts;
    const expected = crypto
        .createHmac('sha256', getSecret())
        .update(`${header}.${claims}`)
        .digest('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    let payload;
    try {
        payload = JSON.parse(b64urlDecode(claims).toString('utf8'));
    } catch {
        return null;
    }

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
}

function signStaffToken(staff) {
    return signToken({
        sub: staff.staffId,
        role: staff.role,
        name: staff.name,
        phone: staff.phone,
        kind: 'staff'
    }, STAFF_TOKEN_TTL);
}

function signCustomerToken(email, name) {
    return signToken({ sub: email, email, name, role: 'customer', kind: 'customer' }, CUSTOMER_TOKEN_TTL);
}

// ── Google ID token verification (RS256 against Google's JWKS) ──

const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
let jwksCache = { keys: null, fetchedAt: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getGoogleKeys() {
    const now = Date.now();
    if (jwksCache.keys && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
        return jwksCache.keys;
    }
    const res = await fetch(JWKS_URL);
    if (!res.ok) throw new Error('Failed to fetch Google JWKS');
    const data = await res.json();
    jwksCache = { keys: data.keys, fetchedAt: now };
    return data.keys;
}

async function verifyGoogleIdToken(idToken, clientId) {
    if (!idToken || idToken.split('.').length !== 3) return null;
    const [header, claims, signature] = idToken.split('.');

    let head;
    try {
        head = JSON.parse(b64urlDecode(header).toString('utf8'));
    } catch {
        return null;
    }
    if (head.alg !== 'RS256') return null;

    const keys = await getGoogleKeys();
    const jwk = keys.find(k => k.kid === head.kid);
    if (!jwk) return null;

    const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const valid = crypto.verify(
        'RSA-SHA256',
        Buffer.from(`${header}.${claims}`),
        publicKey,
        b64urlDecode(signature)
    );
    if (!valid) return null;

    let payload;
    try {
        payload = JSON.parse(b64urlDecode(claims).toString('utf8'));
    } catch {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    if (clientId && payload.aud !== clientId) return null;
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) return null;
    if (!payload.email) return null;

    return payload;
}

// ── Request helpers ──

function extractBearer(event) {
    const headers = event.headers || {};
    const raw = headers.authorization || headers.Authorization || '';
    if (!raw.toLowerCase().startsWith('bearer ')) return null;
    return raw.slice(7).trim();
}

// Returns the token payload, or null when absent/invalid.
function authenticate(event) {
    const token = extractBearer(event);
    if (!token) return null;
    return verifyToken(token);
}

module.exports = {
    hashPin,
    verifyPin,
    signToken,
    verifyToken,
    signStaffToken,
    signCustomerToken,
    verifyGoogleIdToken,
    extractBearer,
    authenticate,
    STAFF_TOKEN_TTL,
    CUSTOMER_TOKEN_TTL
};
