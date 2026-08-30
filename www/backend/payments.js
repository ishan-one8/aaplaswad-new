// === SAI PRASAD — Razorpay payment verification ===
// Without this, "paymentMethod: online" is just a claim the browser makes.
// Every online order must now carry a signature Razorpay produced, which only
// someone who actually paid can obtain.

const crypto = require('crypto');
const db = require('./db');

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const API = 'https://api.razorpay.com/v1';

// Guard records live in the config table under a "pay:" prefix so a captured
// payment can never be replayed into a second free order.
const USED_PREFIX = 'pay:';

// The cart is parked here when checkout opens, so the order can still be
// created if the customer's browser never comes back — which is exactly what
// happens when Android kills the tab during a UPI app switch.
const PENDING_PREFIX = 'pending:';

// Razorpay signs webhook bodies with a secret you set in their dashboard.
function webhookValid(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    if (!secret || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isConfigured() {
    return !!(KEY_ID && KEY_SECRET);
}

function authHeader() {
    return 'Basic ' + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
}

// Creates the Razorpay order the customer will pay against. Tying checkout to
// a server-created order is what makes the signature check meaningful.
async function createOrder(amountRupees, receipt) {
    if (!isConfigured()) {
        return { ok: false, code: 503, error: 'Online payment is not configured' };
    }

    const amount = Math.round(amountRupees * 100);   // Razorpay works in paise
    if (!amount || amount < 100) {
        return { ok: false, code: 400, error: 'Invalid payment amount' };
    }

    const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR', receipt, payment_capture: 1 })
    });

    if (!res.ok) {
        console.error('Razorpay order creation failed:', res.status, await res.text());
        return { ok: false, code: 502, error: 'Could not start the payment. Please try again.' };
    }

    const order = await res.json();
    return { ok: true, razorpayOrderId: order.id, amount, keyId: KEY_ID };
}

// Razorpay signs "<order_id>|<payment_id>" with our secret. Recomputing it is
// how we know the payment is real, belongs to this order, and was not forged.
function signatureValid(razorpayOrderId, paymentId, signature) {
    if (!razorpayOrderId || !paymentId || !signature) return false;

    const expected = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(`${razorpayOrderId}|${paymentId}`)
        .digest('hex');

    const a = Buffer.from(expected);
    const b = Buffer.from(String(signature));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function savePending(razorpayOrderId, payload) {
    await db.ddb.send(new db.PutCommand({
        TableName: db.CONFIG_TABLE,
        Item: {
            configId: PENDING_PREFIX + razorpayOrderId,
            payload,
            createdAt: db.nowIso()
        }
    }));
}

async function getPending(razorpayOrderId) {
    const res = await db.ddb.send(new db.GetCommand({
        TableName: db.CONFIG_TABLE,
        Key: { configId: PENDING_PREFIX + razorpayOrderId }
    }));
    return res.Item ? res.Item.payload : null;
}

// Which order (if any) a Razorpay order already produced
async function existingOrderFor(razorpayOrderId) {
    const res = await db.ddb.send(new db.GetCommand({
        TableName: db.CONFIG_TABLE,
        Key: { configId: USED_PREFIX + razorpayOrderId }
    }));
    return res.Item ? res.Item.orderId : null;
}

// Asks Razorpay directly what happened to a checkout. This is the source of
// truth when the browser cannot tell us.
async function capturedPaymentFor(razorpayOrderId) {
    const res = await fetch(`${API}/orders/${encodeURIComponent(razorpayOrderId)}/payments`, {
        headers: { Authorization: authHeader() }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.items || []).find(p => ['captured', 'authorized'].includes(p.status)) || null;
}

// Confirms with Razorpay that the money actually arrived and matches what we
// expect. The signature proves authenticity; this proves the amount.
async function fetchPayment(paymentId) {
    const res = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: authHeader() }
    });
    if (!res.ok) return null;
    return res.json();
}

// Marks a Razorpay order as spent. Conditional write, so two requests racing
// with the same payment cannot both win.
async function claimPayment(razorpayOrderId, orderId) {
    try {
        await db.ddb.send(new db.PutCommand({
            TableName: db.CONFIG_TABLE,
            Item: {
                configId: USED_PREFIX + razorpayOrderId,
                orderId,
                usedAt: db.nowIso()
            },
            ConditionExpression: 'attribute_not_exists(configId)'
        }));
        return true;
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') return false;
        throw err;
    }
}

// Full check run before an online order is accepted.
async function verifyOnlinePayment(body, expectedTotal) {
    if (!isConfigured()) {
        return { ok: false, code: 503, error: 'Online payment is not configured' };
    }

    const { razorpayOrderId, paymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !paymentId || !razorpaySignature) {
        return {
            ok: false, code: 400,
            error: 'Payment details are incomplete. If money was deducted, contact us on WhatsApp.'
        };
    }

    if (!signatureValid(razorpayOrderId, paymentId, razorpaySignature)) {
        console.warn('REJECTED_PAYMENT: bad signature', { razorpayOrderId, paymentId });
        return { ok: false, code: 400, error: 'Payment could not be verified.' };
    }

    const payment = await fetchPayment(paymentId);
    if (!payment) {
        return { ok: false, code: 502, error: 'Could not confirm the payment with Razorpay.' };
    }

    if (!['captured', 'authorized'].includes(payment.status)) {
        return { ok: false, code: 400, error: `Payment is ${payment.status}, not completed.` };
    }

    if (payment.order_id !== razorpayOrderId) {
        console.warn('REJECTED_PAYMENT: order mismatch', { paymentId });
        return { ok: false, code: 400, error: 'Payment does not belong to this order.' };
    }

    // Paise, so an off-by-one rupee cannot slip through
    const expectedPaise = Math.round(expectedTotal * 100);
    if (payment.amount < expectedPaise) {
        console.warn('REJECTED_PAYMENT: underpaid', {
            paymentId, paid: payment.amount, expected: expectedPaise
        });
        return { ok: false, code: 400, error: 'The amount paid does not match the order.' };
    }

    return { ok: true, payment };
}

module.exports = {
    isConfigured, createOrder, verifyOnlinePayment, claimPayment, signatureValid,
    savePending, getPending, existingOrderFor, capturedPaymentFor, webhookValid, KEY_ID
};
