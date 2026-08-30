// === SAI PRASAD — Push notifications (Firebase Cloud Messaging v1) ===
// Wakes a phone that has the app closed. Everything here is a no-op until a
// service account is configured, so the rest of the API is unaffected if
// Firebase is never set up.
//
// Uses only Node built-ins: a signed JWT is exchanged for an access token,
// which is then used against the FCM v1 endpoint.

const crypto = require('crypto');
const db = require('./db');

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function serviceAccount() {
    const raw = process.env.FCM_SERVICE_ACCOUNT;
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.error('FCM_SERVICE_ACCOUNT is not valid JSON');
        return null;
    }
}

function isConfigured() {
    return !!serviceAccount();
}

// Access tokens last an hour; the Lambda container usually outlives that,
// so caching saves a round trip on most sends.
let cachedToken = { value: null, expiresAt: 0 };

function b64url(input) {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getAccessToken() {
    const account = serviceAccount();
    if (!account) return null;

    const now = Math.floor(Date.now() / 1000);
    if (cachedToken.value && cachedToken.expiresAt > now + 60) {
        return cachedToken.value;
    }

    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = b64url(JSON.stringify({
        iss: account.client_email,
        scope: SCOPE,
        aud: TOKEN_ENDPOINT,
        iat: now,
        exp: now + 3600
    }));

    const signature = crypto
        .createSign('RSA-SHA256')
        .update(`${header}.${claims}`)
        .sign(account.private_key, 'base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${header}.${claims}.${signature}`
        })
    });

    if (!res.ok) {
        console.error('FCM token exchange failed:', await res.text());
        return null;
    }

    const data = await res.json();
    cachedToken = {
        value: data.access_token,
        expiresAt: now + (data.expires_in || 3600)
    };
    return cachedToken.value;
}

// Sends to one device. Returns false when the token is dead so the caller
// can clear it — stale tokens otherwise accumulate forever.
async function sendToDevice(accessToken, projectId, deviceToken, notification, data) {
    const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    token: deviceToken,
                    notification,
                    data: data || {},
                    android: {
                        priority: 'HIGH',
                        notification: {
                            channel_id: 'orders',
                            sound: 'order_alert',
                            notification_priority: 'PRIORITY_MAX',
                            default_vibrate_timings: true
                        }
                    }
                }
            })
        }
    );

    if (res.ok) return true;

    const body = await res.text();
    // UNREGISTERED / INVALID_ARGUMENT mean the app was uninstalled or the
    // token was rotated
    if (res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(body)) {
        return false;
    }
    console.error('FCM send failed:', res.status, body);
    return true;   // transient — keep the token
}

// Notifies every active staff member holding one of the given roles.
async function notifyRoles(roles, title, body, data) {
    if (!isConfigured()) return { sent: 0, skipped: 'not configured' };

    const account = serviceAccount();
    const accessToken = await getAccessToken();
    if (!accessToken) return { sent: 0, skipped: 'no access token' };

    const staff = await db.allStaff();
    const targets = staff.filter(member =>
        roles.includes(member.role) && member.active !== false && member.fcmToken);

    let sent = 0;
    const dead = [];

    await Promise.all(targets.map(async (member) => {
        try {
            const ok = await sendToDevice(
                accessToken, account.project_id, member.fcmToken,
                { title, body }, data
            );
            if (ok) sent++;
            else dead.push(member.staffId);
        } catch (err) {
            console.error('Push failed for', member.staffId, err.message);
        }
    }));

    // Clear tokens for uninstalled apps
    await Promise.all(dead.map(staffId => db.ddb.send(new db.UpdateCommand({
        TableName: db.STAFF_TABLE,
        Key: { staffId },
        UpdateExpression: 'REMOVE fcmToken'
    }))));

    return { sent, cleared: dead.length };
}

// Notifications must never break the request that triggered them
function notifyRolesSafely(roles, title, body, data) {
    return notifyRoles(roles, title, body, data).catch(err => {
        console.error('Push notification error:', err.message);
        return { sent: 0 };
    });
}

// ── Customer broadcasts ──

// Sends one notification to many devices. FCM v1 has no true multicast, so
// this fans out with a bounded concurrency rather than firing thousands of
// requests at once and tripping rate limits.
async function sendBroadcast(subscribers, title, body, data) {
    if (!isConfigured()) {
        return { ok: false, code: 503, error: 'Push notifications are not configured' };
    }

    const account = serviceAccount();
    const accessToken = await getAccessToken();
    if (!accessToken) {
        return { ok: false, code: 502, error: 'Could not authenticate with Firebase' };
    }

    const BATCH = 50;
    let sent = 0;
    const dead = [];

    for (let i = 0; i < subscribers.length; i += BATCH) {
        const batch = subscribers.slice(i, i + BATCH);
        await Promise.all(batch.map(async (sub) => {
            try {
                const ok = await sendToDevice(
                    accessToken, account.project_id, sub.token, { title, body }, data
                );
                if (ok) sent++;
                else dead.push(sub.subscriberId);
            } catch (err) {
                console.error('Broadcast send failed:', err.message);
            }
        }));
    }

    return { ok: true, sent, failed: subscribers.length - sent, dead };
}

async function registerDevice(staffId, fcmToken) {
    if (!fcmToken || typeof fcmToken !== 'string') {
        return { ok: false, code: 400, error: 'Device token is required' };
    }
    await db.ddb.send(new db.UpdateCommand({
        TableName: db.STAFF_TABLE,
        Key: { staffId },
        UpdateExpression: 'SET fcmToken = :t, fcmUpdatedAt = :now',
        ExpressionAttributeValues: { ':t': fcmToken, ':now': db.nowIso() }
    }));
    return { ok: true, pushEnabled: isConfigured() };
}

module.exports = {
    isConfigured, notifyRoles, notifyRolesSafely, registerDevice, sendBroadcast
};
