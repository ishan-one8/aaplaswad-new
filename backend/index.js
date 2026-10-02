// === SAI PRASAD — AWS Lambda API Handler ===
// Routes every customer, admin, kitchen and delivery request.
// Runtime: Node.js 20.x (AWS SDK v3 included)

const db = require('./db');
const auth = require('./auth');
const shop = require('./shop');
const admin = require('./admin');
const hotel = require('./hotel');
const delivery = require('./delivery');
const push = require('./push');
const broadcast = require('./broadcast');
const payments = require('./payments');
const customers = require('./customers');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// Rollout flag. While false, legacy unauthenticated calls still work (and are
// logged) so the old admin/delivery pages keep running. Flip to 'true' once
// the staff app and the updated customer app are live.
const ENFORCE_AUTH = process.env.ENFORCE_AUTH === 'true';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const STAFF_ROLES = ['admin', 'hotel', 'delivery'];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ||
    'https://aaplaswad.store,https://localhost,capacitor://localhost')
    .split(',').map(o => o.trim()).filter(Boolean);

function corsHeaders(event, contentType) {
    const headers = event.headers || {};
    const origin = headers.origin || headers.Origin || '';
    const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowed,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Content-Type': contentType || 'application/json'
    };
}

function respond(event, statusCode, body) {
    return { statusCode, headers: corsHeaders(event), body: JSON.stringify(body) };
}

function respondCsv(event, filename, csv) {
    return {
        statusCode: 200,
        headers: {
            ...corsHeaders(event, 'text/csv'),
            'Content-Disposition': `attachment; filename="${filename}"`
        },
        body: csv
    };
}

// Turns a handler result ({ ok, code, error, ...rest }) into an HTTP response
function fromResult(event, result, successCode) {
    if (!result.ok) {
        return respond(event, result.code || 400, { success: false, error: result.error });
    }
    const { ok, ...rest } = result;
    return respond(event, successCode || 200, { success: true, ...rest });
}

// ── Caller resolution ──

async function resolveCaller(event) {
    const payload = auth.authenticate(event);
    if (!payload) return { payload: null, staff: null };

    if (payload.kind === 'staff') {
        const staff = await db.getStaff(payload.sub);
        if (!staff || staff.active === false) return { payload: null, staff: null };
        // Role and payout changes take effect immediately, not on token expiry
        return { payload: { ...payload, role: staff.role }, staff };
    }

    return { payload, staff: null };
}

// The ENFORCE_AUTH=false rollout window exists only so the old admin.html and
// delivery.html pages keep working. It is granted per call site, never blanket:
// a new endpoint must not inherit an exemption meant for legacy clients.
function guard(event, payload, allowedRoles, context, allowLegacy) {
    if (payload && allowedRoles.includes(payload.role)) return null;

    if (allowLegacy && !ENFORCE_AUTH) {
        console.warn('LEGACY_UNAUTH', JSON.stringify({
            context, hadToken: !!payload, role: payload ? payload.role : null
        }));
        return null;
    }

    return respond(event, payload ? 403 : 401, {
        success: false,
        error: payload ? 'Not allowed for this role' : 'Authentication required'
    });
}

// ── Redaction for unauthenticated order tracking ──

const PUBLIC_ORDER_FIELDS = [
    'orderId', 'status', 'items', 'extras', 'qty', 'total',
    'paymentMethod', 'paymentStatus', 'deliveryTime', 'createdAt', 'updatedAt'
];

function redactOrder(order) {
    const out = {};
    for (const field of PUBLIC_ORDER_FIELDS) {
        if (order[field] !== undefined) out[field] = order[field];
    }
    out.customerName = order.customerName ? String(order.customerName).split(' ')[0] : '';
    out.deliveryPartnerName = order.deliveryPartner ? order.deliveryPartner.name : null;

    // The rider's live position is shown so the customer can watch them
    // approach. The delivery address is still withheld — the customer's own
    // device already knows where it is.
    if (order.status === 'picked_up' && order.partnerLat) {
        out.partnerLat = order.partnerLat;
        out.partnerLng = order.partnerLng;
        out.partnerLocationAt = order.partnerLocationAt;
    }
    out.redacted = true;
    return out;
}

function canSeeFullOrder(payload, order) {
    if (!payload) return false;
    if (STAFF_ROLES.includes(payload.role)) return true;
    return !!(payload.email && order.email && payload.email === order.email);
}


// Creates an order. Both the customer's browser and the payment-recovery path
// come through here, so a change to pricing or notifications can never apply
// to one and not the other.
//
// opts.verifiedPayment / opts.razorpayOrderId are supplied when the server has
// already confirmed the payment with Razorpay itself.
async function placeOrder(body, opts = {}) {
    const check = await shop.validateOrder(body);
    if (!check.ok) return { ok: false, code: check.code, error: check.error };

    const submitted = Number(body.total) || 0;
    if (submitted && submitted < check.minAcceptableTotal) {
        return {
            ok: false, code: 409,
            error: 'Our prices have changed. Please refresh and try again.'
        };
    }

    const total = submitted || check.total;
    const discount = Math.max(0, check.total - total);

    const now = new Date();
    const orderId = '#SP' + now.getTime().toString(36).toUpperCase() +
        Math.random().toString(36).substring(2, 6).toUpperCase();

    // Short code the customer reads out at the door. The full order ID works
    // too, but nobody wants to dictate 14 characters on a doorstep.
    const deliveryCode = String(Math.floor(1000 + Math.random() * 9000));

    const paymentMethod = body.paymentMethod || 'cod';
    let verifiedPayment = opts.verifiedPayment || null;
    let razorpayOrderId = opts.razorpayOrderId || body.razorpayOrderId || null;

    if (paymentMethod !== 'cod') {
        if (!verifiedPayment) {
            const verdict = await payments.verifyOnlinePayment(body, total);
            if (!verdict.ok) return verdict;
            verifiedPayment = verdict.payment;
            razorpayOrderId = body.razorpayOrderId;
        }

        // One payment, one order. If the claim fails someone already completed
        // this checkout — hand back that order rather than charging again.
        const claimed = await payments.claimPayment(razorpayOrderId, orderId);
        if (!claimed) {
            const existingId = await payments.existingOrderFor(razorpayOrderId);
            const existing = existingId ? await db.getOrder(existingId) : null;
            if (existing) return { ok: true, order: existing, alreadyPlaced: true };
            return {
                ok: false, code: 409,
                error: 'This payment has already been used for another order.'
            };
        }
    }

    const order = {
        orderId,
        deliveryCode,
        orderDate: db.istDate(now),
        status: 'pending',
        customerName: body.customerName || '',
        // Omitted entirely when absent: guests order without an email, and
        // DynamoDB refuses a null value on an index key.
        ...(body.email ? { email: body.email } : {}),
        customerPic: body.customerPic || null,
        phone: body.phone || '',
        address: body.address || '',
        landmark: body.landmark || '',
        pincode: body.pincode || '',
        lat: body.lat || null,
        lng: body.lng || null,
        qty: body.qty || check.items.reduce((sum, i) => sum + i.qty, 0),
        items: check.items,
        extras: body.extras || [],
        subtotal: check.subtotal,
        deliveryFee: check.deliveryFee,
        discount,
        total,
        paymentMethod,
        paymentId: verifiedPayment ? verifiedPayment.id : null,
        razorpayOrderId: razorpayOrderId || null,
        paidAmount: verifiedPayment ? verifiedPayment.amount / 100 : null,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid',
        deliveryTime: body.deliveryTime || 'asap',
        deliveryPartner: null,
        prepTimeMinutes: check.prepTimeMinutes,
        statusHistory: [{ status: 'pending', at: now.toISOString(), by: 'customer' }],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
    };

    await db.ddb.send(new db.PutCommand({ TableName: db.TABLE, Item: order }));

    // Online paid → notify kitchen + delivery only (admin not needed).
    // COD → notify admin only first. Kitchen gets notified after admin confirms.
    const summary = order.items.map(i => `${i.name} x${i.qty}`).join(', ');
    if (paymentMethod === 'cod') {
        await push.notifyRolesSafely(
            ['admin'],
            '📞 COD Order — Confirm!',
            `${order.customerName || 'Customer'} — ${summary} — ₹${order.total}`,
            { orderId: order.orderId, type: 'new_order' }
        );
    } else {
        await push.notifyRolesSafely(
            ['hotel', 'delivery'],
            '🔔 New order (Paid ✅)',
            `${order.customerName || 'Customer'} — ${summary} — ₹${order.total}`,
            { orderId: order.orderId, type: 'new_order' }
        );
    }

    return { ok: true, order };
}

function createOrderFromPayment(pending, razorpayOrderId, captured) {
    return placeOrder(pending, { verifiedPayment: captured, razorpayOrderId });
}

// ── Handler ──

exports.handler = async (event) => {
    // Background work this function scheduled for itself — no HTTP involved
    if (event && event.__task === 'broadcast') {
        try {
            const result = await broadcast.runBroadcastTask(event);
            console.log('BROADCAST_DONE', JSON.stringify(result));
        } catch (err) {
            console.error('BROADCAST_FAILED', err);
        }
        return { ok: true };
    }

    const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
    const rawPath = event.path || event.rawPath || '/';
    const path = rawPath.replace(/\/+$/, '') || '/';
    const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
    const qs = event.queryStringParameters || {};
    const body = event.body ? JSON.parse(event.body) : {};

    if (method === 'OPTIONS') return respond(event, 200, { ok: true });

    try {
        const { payload, staff } = await resolveCaller(event);
        const actor = payload ? (payload.name || payload.sub) : 'system';

        const isAdmin = () => guard(event, payload, ['admin'], `${method} ${path}`);
        const isKitchen = () => guard(event, payload, ['admin', 'hotel'], `${method} ${path}`);
        const isPartner = () => guard(event, payload, ['delivery'], `${method} ${path}`);
        // The retired admin.html / delivery.html only ever called these two
        const isLegacyStaff = () =>
            guard(event, payload, STAFF_ROLES, `${method} ${path}`, true);

        // ════════ AUTH ════════

        if (method === 'POST' && path === '/staff/login') {
            const phone = String(body.phone || '').replace(/\D/g, '');
            const pin = String(body.pin || '');
            if (!phone || !pin) {
                return respond(event, 400, { success: false, error: 'Phone and PIN are required' });
            }

            const all = await db.allStaff();
            const member = all.find(s => s.phone === phone);
            const invalid = { success: false, error: 'Invalid phone or PIN' };

            if (!member || member.active === false) return respond(event, 401, invalid);

            if (member.lockedUntil && new Date(member.lockedUntil) > new Date()) {
                return respond(event, 429, {
                    success: false,
                    error: 'Too many failed attempts. Try again in a few minutes.',
                    lockedUntil: member.lockedUntil
                });
            }

            if (!auth.verifyPin(pin, member.pinHash, member.pinSalt)) {
                const failed = (member.failedAttempts || 0) + 1;
                const update = {
                    UpdateExpression: 'SET failedAttempts = :f',
                    ExpressionAttributeValues: { ':f': failed }
                };
                if (failed >= MAX_FAILED_ATTEMPTS) {
                    update.UpdateExpression += ', lockedUntil = :l';
                    update.ExpressionAttributeValues[':l'] =
                        new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
                }
                await db.ddb.send(new db.UpdateCommand({
                    TableName: db.STAFF_TABLE, Key: { staffId: member.staffId }, ...update
                }));
                return respond(event, 401, invalid);
            }

            await db.ddb.send(new db.UpdateCommand({
                TableName: db.STAFF_TABLE,
                Key: { staffId: member.staffId },
                UpdateExpression: 'SET failedAttempts = :z, lastLoginAt = :now REMOVE lockedUntil',
                ExpressionAttributeValues: { ':z': 0, ':now': db.nowIso() }
            }));

            return respond(event, 200, {
                success: true,
                token: auth.signStaffToken(member),
                staffId: member.staffId,
                role: member.role,
                name: member.name,
                mustChangePin: member.mustChangePin === true
            });
        }

        if (method === 'GET' && path === '/staff/me') {
            if (!payload || !STAFF_ROLES.includes(payload.role)) {
                return respond(event, 401, { success: false, error: 'Authentication required' });
            }
            const result = {
                success: true, staffId: payload.sub, role: payload.role,
                name: staff ? staff.name : payload.name,
                payoutPerDelivery: staff ? staff.payoutPerDelivery : undefined
            };
            // Auto-renew: issue a fresh token when past the halfway mark so
            // staff who use the app daily are never forced to log in again.
            const now = Math.floor(Date.now() / 1000);
            const halfLife = auth.STAFF_TOKEN_TTL / 2;
            if (payload.iat && (now - payload.iat) > halfLife && staff) {
                result.token = auth.signStaffToken(staff);
            }
            return respond(event, 200, result);
        }

        if (method === 'POST' && path === '/staff/device') {
            if (!payload || !STAFF_ROLES.includes(payload.role)) {
                return respond(event, 401, { success: false, error: 'Authentication required' });
            }
            return fromResult(event, await push.registerDevice(payload.sub, body.fcmToken));
        }

        if (method === 'POST' && path === '/staff/pin') {
            if (!payload || !STAFF_ROLES.includes(payload.role)) {
                return respond(event, 401, { success: false, error: 'Authentication required' });
            }
            const newPin = String(body.newPin || '');
            if (!/^\d{4,8}$/.test(newPin)) {
                return respond(event, 400, { success: false, error: 'PIN must be 4-8 digits' });
            }
            const member = await db.getStaff(payload.sub);
            if (!member || !auth.verifyPin(String(body.currentPin || ''), member.pinHash, member.pinSalt)) {
                return respond(event, 401, { success: false, error: 'Current PIN is incorrect' });
            }
            const { hash, salt } = auth.hashPin(newPin);
            await db.ddb.send(new db.UpdateCommand({
                TableName: db.STAFF_TABLE,
                Key: { staffId: payload.sub },
                UpdateExpression: 'SET pinHash = :h, pinSalt = :s, mustChangePin = :f, updatedAt = :now',
                ExpressionAttributeValues: { ':h': hash, ':s': salt, ':f': false, ':now': db.nowIso() }
            }));
            return respond(event, 200, { success: true });
        }

        if (method === 'POST' && path === '/auth/customer') {
            // Path 1: Google ID Token (web browsers, Android with SHA-1 registered)
            if (body.credential) {
                const googlePayload = await auth.verifyGoogleIdToken(body.credential, GOOGLE_CLIENT_ID);
                if (!googlePayload) {
                    return respond(event, 401, { success: false, error: 'Invalid Google credential' });
                }

                await customers.recordSignIn({
                    email: googlePayload.email,
                    name: googlePayload.name,
                    picture: googlePayload.picture,
                    platform: body.platform === 'android' ? 'android' : 'web'
                }).catch(err => console.error('Customer registry write failed:', err.message));

                return respond(event, 200, {
                    success: true,
                    token: auth.signCustomerToken(googlePayload.email, googlePayload.name),
                    email: googlePayload.email,
                    name: googlePayload.name,
                    picture: googlePayload.picture
                });
            }

            // Path 2: Google Access Token (Android native when idToken unavailable)
            // Verify by calling Google's userinfo endpoint with the access token
            if (body.accessToken) {
                try {
                    const gRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: 'Bearer ' + body.accessToken }
                    });
                    if (!gRes.ok) {
                        return respond(event, 401, { success: false, error: 'Invalid access token' });
                    }
                    const gUser = await gRes.json();
                    if (!gUser.email) {
                        return respond(event, 401, { success: false, error: 'No email in Google profile' });
                    }

                    await customers.recordSignIn({
                        email: gUser.email,
                        name: gUser.name || '',
                        picture: gUser.picture || '',
                        platform: 'android'
                    }).catch(err => console.error('Customer registry write failed:', err.message));

                    return respond(event, 200, {
                        success: true,
                        token: auth.signCustomerToken(gUser.email, gUser.name || ''),
                        email: gUser.email,
                        name: gUser.name || '',
                        picture: gUser.picture || ''
                    });
                } catch (err) {
                    console.error('Access token verification failed:', err);
                    return respond(event, 401, { success: false, error: 'Could not verify access token' });
                }
            }

            return respond(event, 400, { success: false, error: 'No credential or access token provided' });
        }

        // ════════ PAYMENTS ════════

        // Creates the Razorpay order to pay against. The amount comes from the
        // server's own pricing, never from the browser.
        if (method === 'POST' && path === '/payment/order') {
            const check = await shop.validateOrder(body);
            if (!check.ok) {
                return respond(event, check.code, { success: false, error: check.error });
            }

            const submitted = Number(body.total) || 0;
            if (submitted && submitted < check.minAcceptableTotal) {
                return respond(event, 409, {
                    success: false,
                    error: 'Our prices have changed. Please refresh and try again.'
                });
            }
            const payable = submitted || check.total;

            const created = await payments.createOrder(payable, 'sp-' + Date.now());
            if (!created.ok) {
                return respond(event, created.code, { success: false, error: created.error });
            }

            // Park the cart against this checkout. If the customer's phone
            // switches to a UPI app and never comes back, the server can still
            // finish the job from here.
            await payments.savePending(created.razorpayOrderId, {
                ...body, paymentMethod: 'online', total: payable
            });

            return respond(event, 200, {
                success: true,
                razorpayOrderId: created.razorpayOrderId,
                amount: created.amount,
                total: payable,
                keyId: created.keyId
            });
        }

        // Completes a checkout using Razorpay as the source of truth. Safe to
        // call repeatedly: it returns the same order rather than making a new
        // one, so a customer refreshing cannot be charged twice.
        if (method === 'POST' && path === '/payment/complete') {
            const razorpayOrderId = String(body.razorpayOrderId || '');
            if (!razorpayOrderId) {
                return respond(event, 400, { success: false, error: 'Missing payment reference' });
            }

            const alreadyId = await payments.existingOrderFor(razorpayOrderId);
            if (alreadyId) {
                const existing = await db.getOrder(alreadyId);
                return respond(event, 200, { success: true, order: existing, alreadyPlaced: true });
            }

            const captured = await payments.capturedPaymentFor(razorpayOrderId);
            if (!captured) {
                return respond(event, 202, {
                    success: false, pending: true,
                    error: 'Payment not completed yet.'
                });
            }

            const pending = await payments.getPending(razorpayOrderId);
            if (!pending) {
                console.error('ORPHAN_PAYMENT', JSON.stringify({
                    razorpayOrderId, paymentId: captured.id, amount: captured.amount
                }));
                return respond(event, 409, {
                    success: false,
                    error: 'We received your payment but lost the order details. Please contact us on WhatsApp.'
                });
            }

            const placed = await createOrderFromPayment(pending, razorpayOrderId, captured);
            if (!placed.ok) {
                return respond(event, placed.code, { success: false, error: placed.error });
            }
            return respond(event, 201, { success: true, order: placed.order });
        }

        // Razorpay tells us directly when money is captured. This is the
        // backstop for a customer who pays and never reopens the site at all.
        if (method === 'POST' && path === '/payment/webhook') {
            const signature = (event.headers || {})['x-razorpay-signature'] ||
                (event.headers || {})['X-Razorpay-Signature'];

            if (!payments.webhookValid(event.body || '', signature)) {
                console.warn('REJECTED_WEBHOOK: bad signature');
                return respond(event, 401, { success: false, error: 'Invalid signature' });
            }

            const entity = body.payload && body.payload.payment && body.payload.payment.entity;
            if (body.event !== 'payment.captured' || !entity || !entity.order_id) {
                return respond(event, 200, { success: true, ignored: true });
            }

            const already = await payments.existingOrderFor(entity.order_id);
            if (already) return respond(event, 200, { success: true, alreadyPlaced: true });

            const pending = await payments.getPending(entity.order_id);
            if (!pending) {
                console.error('ORPHAN_PAYMENT_WEBHOOK', JSON.stringify({
                    razorpayOrderId: entity.order_id, paymentId: entity.id
                }));
                return respond(event, 200, { success: true, orphan: true });
            }

            const placed = await createOrderFromPayment(pending, entity.order_id, entity);
            console.log('WEBHOOK_ORDER', JSON.stringify({
                razorpayOrderId: entity.order_id,
                orderId: placed.ok ? placed.order.orderId : null,
                error: placed.ok ? null : placed.error
            }));
            return respond(event, 200, { success: true });
        }

        // ════════ CUSTOMER NOTIFICATION OPT-IN ════════

        if (method === 'POST' && path === '/customer/subscribe') {
            return fromResult(event, await broadcast.subscribe(body));
        }
        if (method === 'POST' && path === '/customer/unsubscribe') {
            return fromResult(event, await broadcast.unsubscribe(body.token));
        }

        // ════════ PUBLIC SHOP INFO ════════

        if (method === 'GET' && path === '/menu') {
            const items = await shop.getMenu();
            // Customers never need to see unavailable items priced up
            return respond(event, 200, { success: true, menu: items });
        }

        if (method === 'GET' && path === '/shop-status') {
            return respond(event, 200, { success: true, ...(await shop.shopStatus()) });
        }

        // ════════ ADMIN ════════

        if (seg[0] === 'admin') {
            const rejected = isAdmin();
            if (rejected) return rejected;

            if (method === 'GET' && path === '/admin/config') {
                return respond(event, 200, { success: true, config: await shop.getShop() });
            }
            if (method === 'PATCH' && path === '/admin/config') {
                return respond(event, 200, {
                    success: true, config: await admin.updateShopConfig(body)
                });
            }
            if (method === 'GET' && path === '/admin/menu') {
                return respond(event, 200, { success: true, menu: await shop.getMenu() });
            }
            if (method === 'PATCH' && seg[1] === 'menu' && seg[2]) {
                return fromResult(event, await admin.updateMenuItem(seg[2], body));
            }
            if (method === 'GET' && path === '/admin/reports') {
                const to = qs.to || db.istDate();
                const from = qs.from || to;
                return respond(event, 200, { success: true, ...(await admin.reports(from, to)) });
            }
            if (method === 'GET' && path === '/admin/payouts') {
                const to = qs.to || db.istDate();
                const from = qs.from || to;
                return respond(event, 200, { success: true, ...(await admin.payouts(from, to)) });
            }
            if (method === 'GET' && path === '/admin/orders') {
                const to = qs.to || qs.date || db.istDate();
                const from = qs.from || qs.date || to;
                let orders = await db.ordersForRange(from, to);
                if (qs.status) orders = orders.filter(o => o.status === qs.status);
                if (qs.search) {
                    const needle = qs.search.toLowerCase();
                    orders = orders.filter(o =>
                        (o.orderId || '').toLowerCase().includes(needle) ||
                        (o.phone || '').includes(needle) ||
                        (o.customerName || '').toLowerCase().includes(needle));
                }
                orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                return respond(event, 200, { success: true, orders });
            }
            if (method === 'PATCH' && seg[1] === 'orders' && seg[2]) {
                return fromResult(event, await admin.updateOrder(seg[2], body, actor));
            }
            if (method === 'GET' && path === '/admin/staff') {
                return respond(event, 200, { success: true, staff: await admin.listStaff() });
            }
            if (method === 'POST' && path === '/admin/staff') {
                return fromResult(event, await admin.createStaff(body), 201);
            }
            if (method === 'PATCH' && seg[1] === 'staff' && seg[2]) {
                return fromResult(event, await admin.updateStaff(seg[2], body, payload && payload.sub));
            }
            if (method === 'GET' && path === '/admin/broadcast') {
                const [audienceCounts, past] = await Promise.all([
                    broadcast.counts(), broadcast.history()
                ]);
                return respond(event, 200, {
                    success: true,
                    counts: audienceCounts,
                    history: past,
                    audiences: broadcast.AUDIENCES,
                    pushConfigured: push.isConfigured()
                });
            }
            if (method === 'POST' && path === '/admin/broadcast') {
                return fromResult(event, await broadcast.send(body, actor));
            }
            if (method === 'GET' && path === '/admin/customers') {
                return respond(event, 200, {
                    success: true, ...(await customers.summary())
                });
            }
            if (method === 'GET' && path === '/admin/export') {
                const to = qs.to || db.istDate();
                const from = qs.from || to;
                const orders = await db.ordersForRange(from, to);
                orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                return respondCsv(event, `sai-prasad-${from}-to-${to}.csv`, admin.toCsv(orders));
            }

            return respond(event, 404, { success: false, error: 'Unknown admin route' });
        }

        // ════════ KITCHEN ════════

        if (seg[0] === 'hotel') {
            const rejected = isKitchen();
            if (rejected) return rejected;

            if (method === 'GET' && path === '/hotel/queue') {
                return respond(event, 200, { success: true, ...(await hotel.queue()) });
            }
            if (method === 'PATCH' && seg[1] === 'orders' && seg[3] === 'status') {
                const result = await hotel.setStatus(seg[2], body.status, actor);

                // Once confirmed, notify delivery + kitchen (for COD orders that admin just approved)
                if (result.ok && body.status === 'confirmed') {
                    // COD orders: admin confirmed → now alert the kitchen to start cooking
                    if (result.order.paymentMethod === 'cod') {
                        const items = (result.order.items || []).map(i => `${i.name} x${i.qty}`).join(', ');
                        await push.notifyRolesSafely(
                            ['hotel'],
                            '🔔 Order Approved — Start Cooking!',
                            `${result.order.customerName || 'Customer'} — ${items} — ₹${result.order.total}`,
                            { orderId: result.order.orderId, type: 'new_order' }
                        );
                    }
                    // Notify delivery partners
                    if (!result.order.deliveryPartner) {
                        await push.notifyRolesSafely(
                            ['delivery'],
                            '📦 Order ready to pick up',
                            `${result.order.customerName || 'Customer'} — ₹${result.order.total}`,
                            { orderId: result.order.orderId, type: 'order_available' }
                        );
                    }
                }
                return fromResult(event, result);
            }
            if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'reject') {
                return fromResult(event, await hotel.reject(seg[2], body.reason, actor));
            }

            return respond(event, 404, { success: false, error: 'Unknown kitchen route' });
        }

        // ════════ DELIVERY ════════

        if (seg[0] === 'delivery') {
            const rejected = isPartner();
            if (rejected) return rejected;

            const partner = staff || {};

            if (method === 'GET' && path === '/delivery/available') {
                return respond(event, 200, { success: true, orders: await delivery.available() });
            }
            if (method === 'GET' && path === '/delivery/mine') {
                return respond(event, 200, { success: true, orders: await delivery.mine(partner.staffId) });
            }
            if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'claim') {
                return fromResult(event, await delivery.claim(seg[2], partner));
            }
            if (method === 'POST' && seg[1] === 'orders' && seg[3] === 'release') {
                return fromResult(event, await delivery.release(seg[2], partner.staffId));
            }
            if (method === 'PATCH' && seg[1] === 'orders' && seg[3] === 'status') {
                return fromResult(event,
                    await delivery.setStatus(seg[2], body.status, partner, body.code));
            }
            if (method === 'POST' && path === '/delivery/location') {
                return fromResult(event, await delivery.updateLocation(
                    partner.staffId, Number(body.lat), Number(body.lng)));
            }
            if (method === 'GET' && path === '/delivery/earnings') {
                return respond(event, 200, {
                    success: true, ...(await delivery.earnings(partner.staffId, qs.date))
                });
            }

            return respond(event, 404, { success: false, error: 'Unknown delivery route' });
        }


        // ════════ PUBLIC: CUSTOMER STATS (aggregate only, no PII) ════════

        if (method === 'GET' && path === '/customer-stats') {
            const stats = await customers.summary(30);
            // Strip PII — only return aggregate numbers and sign-up chart data
            return respond(event, 200, {
                success: true,
                total: stats.total,
                newThisWeek: stats.newThisWeek,
                activeThisWeek: stats.activeThisWeek,
                activeThisMonth: stats.activeThisMonth,
                ordering: stats.ordering,
                neverOrdered: stats.neverOrdered,
                signUpsByDate: stats.signUpsByDate
            });
        }

        // ════════ ORDERS ════════

        if (method === 'POST' && path === '/orders') {
            const placed = await placeOrder(body);
            if (!placed.ok) {
                return respond(event, placed.code, { success: false, error: placed.error });
            }
            return respond(event, placed.alreadyPlaced ? 200 : 201, {
                success: true, order: placed.order, alreadyPlaced: !!placed.alreadyPlaced
            });
        }

        if (method === 'GET' && path === '/orders') {
            // Note the `in` check: an empty ?email= is still a customer asking
            // for their own orders. Treating it as "no filter" used to drop the
            // request into the staff branch and hand a guest the whole table.
            if ('email' in qs) {
                const staffCaller = payload && STAFF_ROLES.includes(payload.role);
                const owner = payload && qs.email && payload.email === qs.email;
                if (!staffCaller && !owner) {
                    return respond(event, 401, { success: false, error: 'Authentication required' });
                }
            } else {
                const rejected = isLegacyStaff();
                if (rejected) return rejected;
            }

            // Indexed lookup for a customer; the staff list stays a bounded scan
            // and is only used by the retired admin page.
            let items;
            if (qs.email) {
                items = await db.ordersForEmail(qs.email, 50);
            } else {
                const result = await db.ddb.send(new db.ScanCommand({
                    TableName: db.TABLE, Limit: 200
                }));
                items = result.Items || [];
            }

            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return respond(event, 200, { success: true, orders: items });
        }

        if (method === 'GET' && seg[0] === 'orders' && seg[1]) {
            const order = await db.getOrder(seg[1]);
            if (!order) return respond(event, 404, { success: false, error: 'Order not found' });

            const shopConfig = await shop.getShop();
            const view = canSeeFullOrder(payload, order) ? { ...order } : redactOrder(order);

            // The code only works as proof of delivery if the person doing the
            // delivering cannot look it up. Customers and the kitchen still see it.
            if (payload && payload.role === 'delivery') delete view.deliveryCode;
            view.etaMinutes = shop.etaMinutes(order, shopConfig);
            view.partnerName = order.deliveryPartner ? order.deliveryPartner.name : null;
            // Only useful once someone is actually carrying the food
            view.partnerPhone = (order.status === 'picked_up' && order.deliveryPartner)
                ? order.deliveryPartner.phone : null;

            return respond(event, 200, { success: true, order: view });
        }

        if (method === 'PATCH' && seg[0] === 'orders' && seg[1]) {
            const rejected = isLegacyStaff();
            if (rejected) return rejected;
            return fromResult(event, await admin.updateOrder(seg[1], body, actor));
        }

        return respond(event, 404, { success: false, error: 'Not found' });

    } catch (err) {
        console.error('Error:', err);
        return respond(event, 500, { success: false, error: err.message });
    }
};
