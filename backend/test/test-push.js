#!/usr/bin/env node
/**
 * Test script: Sends a push notification via FCM v1 directly.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SA_PATH = path.join(__dirname, '..', '..', 'imp_colection', 'sai-prasad-7f021-firebase-adminsdk-fbsvc-b7b83703b8.json');
const account = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

function b64url(input) {
    return Buffer.from(input).toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function getAccessToken() {
    const now = Math.floor(Date.now() / 1000);
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
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    const res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: `${header}.${claims}.${signature}`
        })
    });
    const data = await res.json();
    if (!res.ok) throw new Error('Token exchange failed: ' + JSON.stringify(data));
    return data.access_token;
}

async function sendPush(accessToken, deviceToken) {
    const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
        {
            method: 'POST',
            headers: {
                Authorization: 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: {
                    token: deviceToken,
                    notification: {
                        title: '🔔 Order! Order!',
                        body: 'Test notification — this means push is working!'
                    },
                    data: { type: 'new_order' },
                    android: {
                        priority: 'HIGH',
                        notification: {
                            channel_id: 'orders',
                            sound: 'default',
                            default_vibrate_timings: true
                        }
                    }
                }
            })
        }
    );
    const body = await res.text();
    return { status: res.status, ok: res.ok, body };
}

(async () => {
    console.log('Getting FCM access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Got access token\n');

    // Staff tokens from DynamoDB
    const tokens = [
        { name: 'Sai_hotel (hotel)', token: 'dMmWJUKRRBW1AATwsfdQKO:APA91bGhNrNpNFdH38w8zZHGS6WNm4U-U55SHsUbu75WrbS3OdnywpsHYHAefkk2TAE_F8xd_IyTqZmVlxWL0JTettnPevMI3wBOy_A_xuBBelOMMeM-R60' },
        { name: 'Owner (admin)', token: 'cc7djizxQ3imfgMQZBFzZ1:APA91bF60lHbMquYdmeN_b5x7XI9fOeF9CAIICJUsUOSaiU_uUn9AIiaT1OuVxJ9JgF2LX9crvhb5hyzb-HIVxUdYVFbu6lA2yOf0fGoMnEh80i_44O7mZw' },
    ];

    for (const t of tokens) {
        console.log(`Sending to ${t.name}...`);
        const result = await sendPush(accessToken, t.token);
        console.log(`  Status: ${result.status} | OK: ${result.ok}`);
        console.log(`  Response: ${result.body}\n`);
    }
})().catch(e => console.error('❌ Error:', e.message));
