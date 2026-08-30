// === Handler tests — auth, roles, shop gating, kitchen flow, claim race ===
// Run with:  node backend/test/handler.test.js
// Uses an in-memory DynamoDB fake; no AWS account or network needed.

process.env.TOKEN_SECRET = 'test-secret';
process.env.TABLE_NAME = 'orders';
process.env.STAFF_TABLE = 'staff';
process.env.CONFIG_TABLE = 'config';
process.env.SUBSCRIBER_TABLE = 'subscribers';
process.env.CUSTOMER_TABLE = 'customers';
process.env.GOOGLE_CLIENT_ID = 'test-google-client';
process.env.ALLOWED_ORIGINS = 'https://aaplaswad.store,https://localhost';
process.env.ENFORCE_AUTH = 'true';

const fake = require('./fake-dynamo');
const auth = require('../auth');
const db = require('../db');

let pass = 0, fail = 0;
const t = (name, cond, extra) => {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
};

function req(method, path, opts = {}) {
    return {
        requestContext: { http: { method } },
        rawPath: path,
        headers: { origin: 'https://aaplaswad.store', ...(opts.headers || {}) },
        queryStringParameters: opts.qs || null,
        body: opts.body ? JSON.stringify(opts.body) : null
    };
}
const bearer = (token) => ({ authorization: 'Bearer ' + token });

// ── Fixtures ──

const PIN = auth.hashPin('143913');
const mkStaff = (id, role, extra = {}) => ({
    staffId: id, name: role, phone: '9000000000',
    role, pinHash: PIN.hash, pinSalt: PIN.salt, active: true, failedAttempts: 0, ...extra
});

const ADMIN = mkStaff('admin-1', 'admin', { phone: '7887907363', name: 'Owner' });
const KITCHEN = mkStaff('hotel-1', 'hotel', { phone: '9111111111', name: 'Kitchen' });
const RAJU = mkStaff('delivery-1', 'delivery', { phone: '9222222222', name: 'Raju', payoutPerDelivery: 25 });
const SANJAY = mkStaff('delivery-2', 'delivery', { phone: '9333333333', name: 'Sanjay', payoutPerDelivery: 30 });

const MENU_CONFIG = {
    configId: 'menu',
    items: {
        'dal-bati': {
            name: 'Dal Bati Churma Thali', price: 80, category: 'veg', available: true,
            extras: { 'db-ghee': 10 }, extrasLabels: { 'db-ghee': 'Extra Ghee' }
        },
        'chicken-thali': {
            name: 'Chicken Thali', price: 199, category: 'nonveg', available: false
        }
    }
};
const SHOP_CONFIG = {
    configId: 'shop', isOpen: true, autoSchedule: false, pauseOrders: false,
    hotelLat: 20.9, hotelLng: 75.56, deliveryFee: 0, minOrderValue: 0,
    codEnabled: true, onlineEnabled: true, prepTimeMinutes: 30
};

const today = db.istDate();
const mkOrder = (id, extra = {}) => ({
    orderId: id, orderDate: today, status: 'pending',
    customerName: 'Ravi Kumar', email: 'ravi@example.com', phone: '9876543210',
    address: '12 MG Road', landmark: 'Near temple', pincode: '425001',
    lat: 20.91, lng: 75.57, total: 240, paymentMethod: 'cod', paymentStatus: 'pending',
    items: [{ key: 'dal-bati', name: 'Dal Bati Churma Thali', qty: 3, price: 80, extras: [] }],
    deliveryPartner: null, createdAt: new Date().toISOString(), statusHistory: [],
    ...extra
});

const baseState = () => ({
    staff: { 'admin-1': ADMIN, 'hotel-1': KITCHEN, 'delivery-1': RAJU, 'delivery-2': SANJAY },
    config: { shop: SHOP_CONFIG, menu: MENU_CONFIG },
    orders: {}
});

const adminToken = auth.signStaffToken(ADMIN);
const kitchenToken = auth.signStaffToken(KITCHEN);
const rajuToken = auth.signStaffToken(RAJU);
const sanjayToken = auth.signStaffToken(SANJAY);
const customerToken = auth.signCustomerToken('ravi@example.com', 'Ravi');

const handler = require('../index.js').handler;

(async () => {
    let res, body;

    // ════════ AUTH ════════
    console.log('\n── Authentication ──');

    fake.reset(baseState());
    res = await handler(req('POST', '/staff/login', { body: { phone: '7887907363', pin: '143913' } }));
    body = JSON.parse(res.body);
    t('login with correct PIN issues a token', res.statusCode === 200 && !!body.token, res.body);
    t('login response never leaks the PIN hash', !res.body.includes(PIN.hash));

    fake.reset(baseState());
    res = await handler(req('POST', '/staff/login', { body: { phone: '7887907363', pin: '999999' } }));
    t('wrong PIN rejected', res.statusCode === 401);
    t('failed attempt recorded', fake.tableOf('staff')['admin-1'].failedAttempts === 1);

    fake.reset(baseState());
    fake.tableOf('staff')['admin-1'].failedAttempts = 4;
    await handler(req('POST', '/staff/login', { body: { phone: '7887907363', pin: '999999' } }));
    t('fifth failure locks the account', !!fake.tableOf('staff')['admin-1'].lockedUntil);
    res = await handler(req('POST', '/staff/login', { body: { phone: '7887907363', pin: '143913' } }));
    t('locked account refuses even the correct PIN', res.statusCode === 429);

    fake.reset(baseState());
    fake.tableOf('staff')['delivery-1'].active = false;
    res = await handler(req('GET', '/delivery/available', { headers: bearer(rajuToken) }));
    t('deactivated partner is locked out immediately', res.statusCode === 401, res.body);

    // ════════ ROLE SEPARATION ════════
    console.log('\n── Role separation ──');

    fake.reset(baseState());
    res = await handler(req('GET', '/admin/reports', { headers: bearer(rajuToken) }));
    t('delivery partner cannot open admin reports', res.statusCode === 403, res.body);

    res = await handler(req('GET', '/admin/staff', { headers: bearer(kitchenToken) }));
    t('kitchen cannot manage staff', res.statusCode === 403, res.body);

    res = await handler(req('GET', '/delivery/available', { headers: bearer(kitchenToken) }));
    t('kitchen cannot see the delivery pool', res.statusCode === 403, res.body);

    res = await handler(req('GET', '/hotel/queue', { headers: bearer(rajuToken) }));
    t('delivery partner cannot open the kitchen queue', res.statusCode === 403, res.body);

    res = await handler(req('GET', '/hotel/queue', { headers: bearer(adminToken) }));
    t('admin can open the kitchen queue', res.statusCode === 200, res.body);

    res = await handler(req('GET', '/admin/reports'));
    t('anonymous cannot open admin reports', res.statusCode === 401, res.body);

    res = await handler(req('GET', '/admin/config', { headers: bearer(customerToken) }));
    t('customer token cannot open admin config', res.statusCode === 403, res.body);

    // ════════ SHOP GATING ════════
    console.log('\n── Shop open / closed ──');

    const validOrder = {
        customerName: 'Test', phone: '9876543210', address: 'x', paymentMethod: 'cod',
        items: [{ key: 'dal-bati', qty: 2, extras: ['db-ghee'] }], total: 180
    };

    fake.reset(baseState());
    res = await handler(req('POST', '/orders', { body: validOrder }));
    body = JSON.parse(res.body);
    t('order placed while open', res.statusCode === 201, res.body);
    t('server computes the total from its own prices', body.order.total === 180, String(body.order.total));
    t('order stores priced line items', body.order.items[0].price === 80);
    t('order gets an IST orderDate', body.order.orderDate === today);

    fake.reset(baseState());
    fake.tableOf('config').shop.isOpen = false;
    fake.tableOf('config').shop.closedMessage = 'Closed for the day';
    res = await handler(req('POST', '/orders', { body: validOrder }));
    t('closed shop refuses new orders', res.statusCode === 423, res.body);
    t('closed shop returns the admin message', JSON.parse(res.body).error === 'Closed for the day');

    fake.reset(baseState());
    fake.tableOf('config').shop.pauseOrders = true;
    res = await handler(req('POST', '/orders', { body: validOrder }));
    t('paused shop refuses new orders', res.statusCode === 423, res.body);

    fake.reset(baseState());
    res = await handler(req('POST', '/orders', {
        body: { ...validOrder, items: [{ key: 'chicken-thali', qty: 1 }], total: 199 }
    }));
    t('sold-out item refuses the order', res.statusCode === 409, res.body);
    t('sold-out message names the item', /Chicken Thali/.test(JSON.parse(res.body).error));

    fake.reset(baseState());
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 10 } }));
    t('under-priced total is refused', res.statusCode === 409, res.body);

    fake.reset(baseState());
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 500 } }));
    t('over-paid total is honoured, not silently reduced',
        JSON.parse(res.body).order.total === 500, res.body);

    // The customer app takes 10% off a customer's first order, so its total is
    // legitimately below the menu sum. Rejecting that blocks every new customer.
    fake.reset(baseState());
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 162 } }));
    body = JSON.parse(res.body);
    t('first-order 10% discount is accepted', res.statusCode === 201, res.body);
    t('discount is recorded on the order', body.order.discount === 18, String(body.order.discount));
    t('discounted total is kept', body.order.total === 162);

    fake.reset(baseState());
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 100 } }));
    t('a discount deeper than 10% is refused', res.statusCode === 409, res.body);

    // A window that is closed *right now*, whatever the clock says. Hardcoding
    // 00:00–00:01 made this pass every minute of the day except one.
    const istNow = new Date(Date.now() + 5.5 * 3600000);
    const shut = (offsetMinutes) => {
        const t = new Date(istNow.getTime() + offsetMinutes * 60000);
        return String(t.getUTCHours()).padStart(2, '0') + ':' +
               String(t.getUTCMinutes()).padStart(2, '0');
    };

    fake.reset(baseState());
    Object.assign(fake.tableOf('config').shop, {
        autoSchedule: true, openTime: shut(90), closeTime: shut(150)
    });
    res = await handler(req('POST', '/orders', { body: validOrder }));
    t('outside opening hours the order is refused', res.statusCode === 423, res.body);

    fake.reset(baseState());
    Object.assign(fake.tableOf('config').shop, {
        autoSchedule: true, openTime: shut(-60), closeTime: shut(60)
    });
    res = await handler(req('GET', '/shop-status'));
    t('shop-status reports open during hours', JSON.parse(res.body).isOpen === true, res.body);

    // ════════ MENU + PRICING ════════
    console.log('\n── Menu management ──');

    fake.reset(baseState());
    res = await handler(req('PATCH', '/admin/menu/dal-bati', {
        headers: bearer(adminToken), body: { price: 95 }
    }));
    t('admin can change a price', res.statusCode === 200 && JSON.parse(res.body).item.price === 95, res.body);
    res = await handler(req('GET', '/menu'));
    t('new price is live for customers', JSON.parse(res.body).menu['dal-bati'].price === 95);

    res = await handler(req('POST', '/orders', { body: validOrder }));
    t('an order at the old price is now refused', res.statusCode === 409, res.body);

    fake.reset(baseState());
    res = await handler(req('PATCH', '/admin/menu/dal-bati', {
        headers: bearer(adminToken), body: { available: false }
    }));
    t('admin can mark an item sold out', res.statusCode === 200);
    res = await handler(req('POST', '/orders', { body: validOrder }));
    t('sold-out item blocks ordering immediately', res.statusCode === 409, res.body);

    fake.reset(baseState());
    res = await handler(req('PATCH', '/admin/menu/dal-bati', {
        headers: bearer(adminToken), body: { price: -5 }
    }));
    t('negative price refused', res.statusCode === 400, res.body);

    // ════════ KITCHEN ════════
    console.log('\n── Kitchen queue ──');

    fake.reset({ ...baseState(), orders: { '#SP1': mkOrder('#SP1'), '#SP2': mkOrder('#SP2', { status: 'preparing' }) } });
    res = await handler(req('GET', '/hotel/queue', { headers: bearer(kitchenToken) }));
    body = JSON.parse(res.body);
    t('queue returns active orders', body.orders.length === 2, res.body);
    t('queue counts new orders', body.counts.new === 1, JSON.stringify(body.counts));
    t('queue aggregates item totals for batch prep',
        body.prepTotals[0].name === 'Dal Bati Churma Thali' && body.prepTotals[0].qty === 6,
        JSON.stringify(body.prepTotals));

    res = await handler(req('PATCH', '/hotel/orders/%23SP1/status', {
        headers: bearer(kitchenToken), body: { status: 'confirmed' }
    }));
    t('kitchen can confirm a pending order', res.statusCode === 200, res.body);

    res = await handler(req('PATCH', '/hotel/orders/%23SP1/status', {
        headers: bearer(kitchenToken), body: { status: 'delivered' }
    }));
    t('kitchen cannot jump straight to delivered', res.statusCode === 409, res.body);

    fake.reset({ ...baseState(), orders: { '#SP1': mkOrder('#SP1', { deliveryPartner: { id: 'delivery-1', name: 'Raju' } }) } });
    res = await handler(req('POST', '/hotel/orders/%23SP1/reject', {
        headers: bearer(kitchenToken), body: { reason: 'Bombil finished' }
    }));
    t('kitchen can reject with a reason', res.statusCode === 200, res.body);
    t('rejecting frees the delivery partner',
        fake.tableOf('orders')['#SP1'].deliveryPartner === null);
    t('rejection reason stored', fake.tableOf('orders')['#SP1'].cancelReason === 'Bombil finished');

    // ════════ DELIVERY CLAIM RACE ════════
    console.log('\n── Delivery claim (the exclusivity requirement) ──');

    fake.reset({ ...baseState(), orders: { '#SP1': mkOrder('#SP1', { status: 'confirmed' }) } });

    res = await handler(req('GET', '/delivery/available', { headers: bearer(rajuToken) }));
    body = JSON.parse(res.body);
    t('unclaimed order is visible to a partner', body.orders.length === 1, res.body);
    t('distance from the hotel is calculated', typeof body.orders[0].distanceKm === 'number',
        String(body.orders[0].distanceKm));
    t('a maps link is provided', body.orders[0].mapsUrl.includes('google.com/maps'));

    res = await handler(req('POST', '/delivery/orders/%23SP1/claim', { headers: bearer(rajuToken) }));
    t('first partner claims the order', res.statusCode === 200, res.body);

    res = await handler(req('POST', '/delivery/orders/%23SP1/claim', { headers: bearer(sanjayToken) }));
    t('second partner is refused the same order', res.statusCode === 409, res.body);
    t('refusal explains why', /already took/i.test(JSON.parse(res.body).error), res.body);

    res = await handler(req('GET', '/delivery/available', { headers: bearer(sanjayToken) }));
    t('claimed order disappears from the other partner pool',
        JSON.parse(res.body).orders.length === 0, res.body);

    res = await handler(req('GET', '/delivery/mine', { headers: bearer(rajuToken) }));
    t('claimed order appears for the claiming partner',
        JSON.parse(res.body).orders.length === 1, res.body);

    res = await handler(req('GET', '/delivery/mine', { headers: bearer(sanjayToken) }));
    t('claimed order is not in the other partner list',
        JSON.parse(res.body).orders.length === 0, res.body);

    res = await handler(req('PATCH', '/delivery/orders/%23SP1/status', {
        headers: bearer(sanjayToken), body: { status: 'picked_up' }
    }));
    t('a partner cannot progress an order they do not hold', res.statusCode === 403, res.body);

    res = await handler(req('PATCH', '/delivery/orders/%23SP1/status', {
        headers: bearer(rajuToken), body: { status: 'delivered' }
    }));
    t('delivered is refused before pickup', res.statusCode === 409, res.body);

    res = await handler(req('PATCH', '/delivery/orders/%23SP1/status', {
        headers: bearer(rajuToken), body: { status: 'picked_up' }
    }));
    t('owner can mark picked up', res.statusCode === 200, res.body);

    res = await handler(req('PATCH', '/delivery/orders/%23SP1/status', {
        headers: bearer(rajuToken), body: { status: 'delivered' }
    }));
    t('owner can mark delivered', res.statusCode === 200, res.body);

    const done = fake.tableOf('orders')['#SP1'];
    t('payout stamped at the rate in force', done.deliveryPayout === 25, String(done.deliveryPayout));
    t('COD marked paid on delivery', done.paymentStatus === 'paid');
    t('cash collected recorded', done.cashCollected === 240, String(done.cashCollected));

    fake.reset({ ...baseState(), orders: { '#SP2': mkOrder('#SP2', { status: 'confirmed' }) } });
    await handler(req('POST', '/delivery/orders/%23SP2/claim', { headers: bearer(rajuToken) }));
    res = await handler(req('POST', '/delivery/orders/%23SP2/release', { headers: bearer(sanjayToken) }));
    t('a partner cannot release an order they do not hold', res.statusCode === 403, res.body);
    res = await handler(req('POST', '/delivery/orders/%23SP2/release', { headers: bearer(rajuToken) }));
    t('owner can release the order', res.statusCode === 200, res.body);
    res = await handler(req('GET', '/delivery/available', { headers: bearer(sanjayToken) }));
    t('released order returns to the pool', JSON.parse(res.body).orders.length === 1, res.body);

    // ════════ EARNINGS + PAYOUTS ════════
    console.log('\n── Earnings and payouts ──');

    const deliveredOrder = mkOrder('#SP9', {
        status: 'delivered', deliveryPartner: { id: 'delivery-1', name: 'Raju', phone: '9222222222' },
        deliveryPayout: 25, paymentMethod: 'cod', paymentStatus: 'paid', total: 240
    });
    fake.reset({ ...baseState(), orders: { '#SP9': deliveredOrder } });

    res = await handler(req('GET', '/delivery/earnings', { headers: bearer(rajuToken) }));
    body = JSON.parse(res.body);
    t('partner sees deliveries done', body.deliveries === 1, res.body);
    t('partner sees money earned', body.earned === 25);
    t('partner sees cash carried', body.cashCollected === 240);
    t('net to hand over is cash minus earnings', body.netToHandOver === 215);

    res = await handler(req('GET', '/admin/payouts', { headers: bearer(adminToken) }));
    body = JSON.parse(res.body);
    const raju = body.partners.find(p => p.staffId === 'delivery-1');
    t('admin payout report totals per partner', raju.deliveries === 1 && raju.earned === 25, res.body);
    t('admin payout report shows the rate', raju.rate === 25);

    res = await handler(req('GET', '/admin/reports', { headers: bearer(adminToken) }));
    body = JSON.parse(res.body);
    t('reports split cash from online', body.cash.count === 1 && body.online.count === 0, res.body);
    t('reports total revenue', body.revenue === 240);
    t('reports rank item sales', body.itemSales[0].qty === 3, JSON.stringify(body.itemSales));

    // ════════ STAFF MANAGEMENT ════════
    console.log('\n── Staff management ──');

    fake.reset(baseState());
    res = await handler(req('POST', '/admin/staff', {
        headers: bearer(adminToken),
        body: { name: 'New Partner', phone: '9444444444', role: 'delivery', pin: '4321', payoutPerDelivery: 22 }
    }));
    body = JSON.parse(res.body);
    t('admin can add a delivery partner', res.statusCode === 201, res.body);
    t('new partner gets their payout rate', body.staff.payoutPerDelivery === 22);
    t('created staff never returns a PIN hash', !res.body.includes('pinHash'));
    t('new partner must change PIN on first login', body.staff.mustChangePin === true);

    res = await handler(req('POST', '/staff/login', { body: { phone: '9444444444', pin: '4321' } }));
    t('the new partner can log in', res.statusCode === 200, res.body);

    res = await handler(req('POST', '/admin/staff', {
        headers: bearer(adminToken),
        body: { name: 'Dup', phone: '9444444444', role: 'delivery', pin: '4321' }
    }));
    t('duplicate phone refused', res.statusCode === 409, res.body);

    res = await handler(req('POST', '/admin/staff', {
        headers: bearer(adminToken), body: { name: 'Bad', phone: '123', role: 'delivery', pin: '4321' }
    }));
    t('short phone refused', res.statusCode === 400, res.body);

    res = await handler(req('PATCH', '/admin/staff/admin-1', {
        headers: bearer(adminToken), body: { active: false }
    }));
    t('admin cannot deactivate their own account', res.statusCode === 400, res.body);

    res = await handler(req('PATCH', '/admin/staff/delivery-1', {
        headers: bearer(adminToken), body: { payoutPerDelivery: 40 }
    }));
    t('admin can change a partner rate', JSON.parse(res.body).staff.payoutPerDelivery === 40, res.body);

    // ════════ TRACKING PRIVACY ════════
    console.log('\n── Customer privacy ──');

    fake.reset({ ...baseState(), orders: { '#SP1': mkOrder('#SP1') } });

    res = await handler(req('GET', '/orders/%23SP1'));
    body = JSON.parse(res.body);
    t('guest can still track an order', res.statusCode === 200);
    t('tracking hides the phone', body.order.phone === undefined);
    t('tracking hides the address', body.order.address === undefined);
    t('tracking still shows status', body.order.status === 'pending');

    res = await handler(req('GET', '/orders/%23SP1', { headers: bearer(customerToken) }));
    t('the owner sees full details', JSON.parse(res.body).order.phone === '9876543210');

    res = await handler(req('GET', '/orders'));
    t('full order list still requires staff', res.statusCode === 401, res.body);

    res = await handler(req('GET', '/orders', { qs: { email: 'ravi@example.com' } }));
    t('orders-by-email requires a token', res.statusCode === 401, res.body);

    res = await handler(req('GET', '/orders', {
        qs: { email: 'someone@else.com' }, headers: bearer(customerToken)
    }));
    t('a customer cannot read another customer orders', res.statusCode === 401, res.body);

    // ════════ PROOF OF DELIVERY ════════
    console.log('\n── Delivery confirmation code ──');

    fake.reset(baseState());
    res = await handler(req('POST', '/orders', { body: validOrder }));
    body = JSON.parse(res.body);
    const codedOrderId = body.order.orderId;
    const theCode = body.order.deliveryCode;
    t('order gets a 4-digit delivery code', /^\d{4}$/.test(theCode || ''), String(theCode));
    t('customer receives the code when ordering', !!body.order.deliveryCode);

    const encoded = encodeURIComponent(codedOrderId);
    const carried = {
        ...mkOrder(codedOrderId, {
            status: 'picked_up', deliveryCode: theCode,
            deliveryPartner: { id: 'delivery-1', name: 'Raju', phone: '9222222222' }
        })
    };

    // The code is worthless if the rider can read it off the API
    fake.reset({ ...baseState(), orders: { [codedOrderId]: carried } });
    res = await handler(req('GET', '/delivery/mine', { headers: bearer(rajuToken) }));
    t('rider cannot see the code in their own order list',
        JSON.parse(res.body).orders[0].deliveryCode === undefined, res.body);

    res = await handler(req('GET', '/orders/' + encoded, { headers: bearer(rajuToken) }));
    t('rider cannot look the code up on the order',
        JSON.parse(res.body).order.deliveryCode === undefined, res.body);

    res = await handler(req('GET', '/orders/' + encoded));
    t('a stranger cannot read the code either',
        JSON.parse(res.body).order.deliveryCode === undefined, res.body);

    res = await handler(req('GET', '/orders/' + encoded, { headers: bearer(customerToken) }));
    t('the customer can see their own code',
        JSON.parse(res.body).order.deliveryCode === theCode, res.body);

    res = await handler(req('GET', '/orders/' + encoded, { headers: bearer(kitchenToken) }));
    t('the kitchen can see it (to help over the phone)',
        JSON.parse(res.body).order.deliveryCode === theCode, res.body);

    // Delivering requires the code
    fake.reset({ ...baseState(), orders: { [codedOrderId]: carried } });
    res = await handler(req('PATCH', `/delivery/orders/${encoded}/status`, {
        headers: bearer(rajuToken), body: { status: 'delivered' }
    }));
    t('cannot mark delivered without a code', res.statusCode === 400, res.body);

    res = await handler(req('PATCH', `/delivery/orders/${encoded}/status`, {
        headers: bearer(rajuToken), body: { status: 'delivered', code: '0000' }
    }));
    t('a wrong code is refused', res.statusCode === 400, res.body);
    t('order is still not delivered',
        fake.tableOf('orders')[codedOrderId].status === 'picked_up');

    res = await handler(req('PATCH', `/delivery/orders/${encoded}/status`, {
        headers: bearer(rajuToken), body: { status: 'delivered', code: theCode }
    }));
    t('the right code completes the delivery', res.statusCode === 200, res.body);
    t('payout still stamped', fake.tableOf('orders')[codedOrderId].deliveryPayout === 25);

    // The full order ID is accepted as an alternative
    fake.reset({ ...baseState(), orders: { [codedOrderId]: carried } });
    res = await handler(req('PATCH', `/delivery/orders/${encoded}/status`, {
        headers: bearer(rajuToken), body: { status: 'delivered', code: codedOrderId }
    }));
    t('the full order ID works as the code too', res.statusCode === 200, res.body);

    // Orders placed before this feature must stay deliverable
    fake.reset({
        ...baseState(),
        orders: {
            '#SPOLD': mkOrder('#SPOLD', {
                status: 'picked_up',
                deliveryPartner: { id: 'delivery-1', name: 'Raju', phone: '9222222222' }
            })
        }
    });
    res = await handler(req('PATCH', '/delivery/orders/%23SPOLD/status', {
        headers: bearer(rajuToken), body: { status: 'delivered' }
    }));
    t('older orders without a code still deliver', res.statusCode === 200, res.body);

    // Admin override, for when a customer loses the code
    fake.reset({ ...baseState(), orders: { [codedOrderId]: carried } });
    res = await handler(req('PATCH', '/admin/orders/' + encoded, {
        headers: bearer(adminToken), body: { status: 'delivered' }
    }));
    t('admin can force a delivery through without the code', res.statusCode === 200, res.body);

    // ════════ LIVE TRACKING ════════
    console.log('\n── Live delivery tracking ──');

    fake.reset({
        ...baseState(),
        orders: {
            '#SP1': mkOrder('#SP1', {
                status: 'picked_up',
                deliveryPartner: { id: 'delivery-1', name: 'Raju', phone: '9222222222' }
            })
        }
    });

    res = await handler(req('POST', '/delivery/location', {
        headers: bearer(rajuToken), body: { lat: 20.905, lng: 75.565 }
    }));
    t('partner can post their location', res.statusCode === 200, res.body);
    t('location lands on the order they are carrying',
        fake.tableOf('orders')['#SP1'].partnerLat === 20.905);

    res = await handler(req('POST', '/delivery/location', {
        headers: bearer(rajuToken), body: { lat: 'abc', lng: null }
    }));
    t('bad coordinates refused', res.statusCode === 400, res.body);

    res = await handler(req('GET', '/orders/%23SP1'));
    body = JSON.parse(res.body);
    t('customer sees the rider position while on the way',
        body.order.partnerLat === 20.905, res.body);
    t('customer sees an arrival estimate', typeof body.order.etaMinutes === 'number',
        String(body.order.etaMinutes));
    t('customer sees the rider name', body.order.partnerName === 'Raju');
    t('customer can call the rider once carrying', body.order.partnerPhone === '9222222222');
    t('delivery address is still withheld from strangers', body.order.address === undefined);

    // Before pickup the rider position must not leak
    fake.reset({
        ...baseState(),
        orders: {
            '#SP2': mkOrder('#SP2', {
                status: 'preparing', partnerLat: 20.905, partnerLng: 75.565,
                deliveryPartner: { id: 'delivery-1', name: 'Raju', phone: '9222222222' }
            })
        }
    });
    res = await handler(req('GET', '/orders/%23SP2'));
    body = JSON.parse(res.body);
    t('rider position hidden before pickup', body.order.partnerLat === undefined, res.body);
    t('rider phone hidden before pickup', body.order.partnerPhone === null);
    t('estimate still given while cooking', typeof body.order.etaMinutes === 'number');

    fake.reset({ ...baseState(), orders: { '#SP3': mkOrder('#SP3', { status: 'delivered' }) } });
    res = await handler(req('GET', '/orders/%23SP3'));
    t('no estimate once delivered', JSON.parse(res.body).order.etaMinutes === null);

    // ════════ ADMIN-CONTROLLED DISCOUNT ════════
    console.log('\n── First-order discount switch ──');

    fake.reset(baseState());
    fake.tableOf('config').shop.firstOrderDiscountEnabled = true;
    fake.tableOf('config').shop.firstOrderDiscountPercent = 10;
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 162 } }));
    t('discount accepted while the offer is on', res.statusCode === 201, res.body);

    fake.reset(baseState());
    fake.tableOf('config').shop.firstOrderDiscountEnabled = false;
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 162 } }));
    t('same discount refused once the admin turns the offer off',
        res.statusCode === 409, res.body);

    fake.reset(baseState());
    fake.tableOf('config').shop.firstOrderDiscountEnabled = false;
    res = await handler(req('GET', '/shop-status'));
    t('shop-status reports the offer as off',
        JSON.parse(res.body).firstOrderDiscountPercent === 0, res.body);

    fake.reset(baseState());
    res = await handler(req('PATCH', '/admin/config', {
        headers: bearer(adminToken),
        body: { firstOrderDiscountEnabled: true, firstOrderDiscountPercent: 25 }
    }));
    t('admin can change the discount percentage',
        JSON.parse(res.body).config.firstOrderDiscountPercent === 25, res.body);

    fake.reset(baseState());
    fake.tableOf('config').shop.firstOrderDiscountPercent = 90;
    res = await handler(req('POST', '/orders', { body: { ...validOrder, total: 20 } }));
    t('discount is capped at 50% however it is configured', res.statusCode === 409, res.body);

    // ════════ ROLLOUT WINDOW MUST NOT LEAK ════════
    // With ENFORCE_AUTH=false the two retired pages still work unauthenticated.
    // Nothing else may inherit that exemption — a broadcast endpoint open to
    // the world would let anyone spam every customer who opted in.
    console.log('\n── Legacy exemption is scoped ──');

    process.env.ENFORCE_AUTH = 'false';
    for (const key of Object.keys(require.cache)) {
        if (key.includes('/backend/') && !key.includes('/test/')) delete require.cache[key];
    }
    const lenient = require('../index.js').handler;

    fake.reset(baseState());
    res = await lenient(req('GET', '/orders'));
    t('old admin page still reads orders during rollout', res.statusCode === 200, res.body);

    fake.reset({ ...baseState(), orders: { '#SP1': mkOrder('#SP1') } });
    res = await lenient(req('PATCH', '/orders/%23SP1', { body: { status: 'confirmed' } }));
    t('old delivery page still updates orders during rollout', res.statusCode === 200, res.body);

    fake.reset(baseState());
    res = await lenient(req('POST', '/admin/broadcast', {
        body: { title: 'Free food', body: 'Everything is free', audience: 'all' }
    }));
    t('anonymous CANNOT broadcast to customers', res.statusCode === 401, res.body);

    res = await lenient(req('GET', '/admin/reports'));
    t('anonymous cannot read reports even during rollout', res.statusCode === 401, res.body);

    res = await lenient(req('POST', '/admin/staff', {
        body: { name: 'Sneak', phone: '9000000123', role: 'admin', pin: '1111' }
    }));
    t('anonymous cannot create an admin account', res.statusCode === 401, res.body);

    res = await lenient(req('GET', '/admin/payouts'));
    t('anonymous cannot read payouts', res.statusCode === 401, res.body);

    res = await lenient(req('GET', '/hotel/queue'));
    t('anonymous cannot read the kitchen queue', res.statusCode === 401, res.body);

    res = await lenient(req('GET', '/delivery/available'));
    t('anonymous cannot read the delivery pool', res.statusCode === 401, res.body);

    fake.reset(baseState());
    res = await lenient(req('POST', '/admin/broadcast', {
        headers: bearer(rajuToken),
        body: { title: 'x', body: 'y', audience: 'all' }
    }));
    t('a delivery partner cannot broadcast either', res.statusCode === 403, res.body);

    process.env.ENFORCE_AUTH = 'true';

    // ════════ PAYMENT VERIFICATION ════════
    // Without this an "online" order is just a claim the browser makes, and
    // anyone with curl eats for free.
    console.log('\n── Razorpay verification ──');

    process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_value';
    process.env.ENFORCE_AUTH = 'true';
    for (const key of Object.keys(require.cache)) {
        if (key.includes('/backend/') && !key.includes('/test/')) delete require.cache[key];
    }
    const paid = require('../index.js').handler;
    const crypto = require('crypto');

    fake.reset(baseState());
    res = await paid(req('POST', '/orders', {
        body: { ...validOrder, paymentMethod: 'online', paymentId: 'pay_FAKE', total: 180 }
    }));
    t('online order with no signature is refused', res.statusCode === 400, res.body);
    t('nothing was written', Object.keys(fake.tableOf('orders')).length === 0);

    fake.reset(baseState());
    res = await paid(req('POST', '/orders', {
        body: {
            ...validOrder, paymentMethod: 'online', total: 180,
            paymentId: 'pay_FAKE', razorpayOrderId: 'order_FAKE',
            razorpaySignature: 'deadbeef'
        }
    }));
    t('a forged signature is refused', res.statusCode === 400, res.body);

    // A correctly signed request still has to match a real captured payment,
    // which our fake Razorpay is about to provide.
    const realSig = crypto.createHmac('sha256', 'test_secret_value')
        .update('order_REAL|pay_REAL').digest('hex');

    const originalFetch = global.fetch;
    global.fetch = async (url) => {
        if (String(url).includes('/payments/pay_REAL')) {
            return { ok: true, json: async () => ({
                id: 'pay_REAL', status: 'captured', order_id: 'order_REAL', amount: 18000
            }) };
        }
        if (String(url).includes('/payments/pay_SHORT')) {
            return { ok: true, json: async () => ({
                id: 'pay_SHORT', status: 'captured', order_id: 'order_REAL', amount: 100
            }) };
        }
        return { ok: false, status: 404, text: async () => 'not found', json: async () => ({}) };
    };

    fake.reset(baseState());
    res = await paid(req('POST', '/orders', {
        body: {
            ...validOrder, paymentMethod: 'online', total: 180,
            paymentId: 'pay_REAL', razorpayOrderId: 'order_REAL', razorpaySignature: realSig
        }
    }));
    body = JSON.parse(res.body);
    t('a genuine signed payment is accepted', res.statusCode === 201, res.body);
    t('order is marked paid', body.order && body.order.paymentStatus === 'paid');
    t('the verified amount is recorded', body.order && body.order.paidAmount === 180);

    // Same payment again — must return the same order, not make a second one.
    // A customer refreshing after paying must never be charged twice, and must
    // never end up with two meals on the way.
    const firstOrderId = body.order.orderId;
    const ordersBefore = Object.keys(fake.tableOf('orders')).length;

    res = await paid(req('POST', '/orders', {
        body: {
            ...validOrder, paymentMethod: 'online', total: 180,
            paymentId: 'pay_REAL', razorpayOrderId: 'order_REAL', razorpaySignature: realSig
        }
    }));
    body = JSON.parse(res.body);
    t('replaying a payment returns the original order',
        body.order && body.order.orderId === firstOrderId, res.body);
    t('and creates no second order',
        Object.keys(fake.tableOf('orders')).length === ordersBefore,
        String(Object.keys(fake.tableOf('orders')).length));
    t('and says so', body.alreadyPlaced === true);

    // Correct signature, but only ₹1 actually paid
    const shortSig = crypto.createHmac('sha256', 'test_secret_value')
        .update('order_REAL|pay_SHORT').digest('hex');
    fake.reset(baseState());
    res = await paid(req('POST', '/orders', {
        body: {
            ...validOrder, paymentMethod: 'online', total: 180,
            paymentId: 'pay_SHORT', razorpayOrderId: 'order_REAL', razorpaySignature: shortSig
        }
    }));
    t('underpaying is refused even with a valid signature', res.statusCode === 400, res.body);

    global.fetch = originalFetch;

    // Cash on delivery must keep working untouched
    fake.reset(baseState());
    res = await paid(req('POST', '/orders', { body: validOrder }));
    t('cash orders are unaffected by payment checks', res.statusCode === 201, res.body);

    // The browser can vanish mid-payment when Android switches to a UPI app.
    // The server must be able to finish the order without it.
    console.log('\n── Payment recovery (browser never came back) ──');

    fake.reset(baseState());

    global.fetch = async (url, init) => {
        const target = String(url);
        if (target.endsWith('/v1/orders') && init && init.method === 'POST') {
            return { ok: true, json: async () => ({ id: 'order_LOST', amount: 18000 }) };
        }
        if (target.includes('/orders/order_LOST/payments')) {
            return { ok: true, json: async () => ({ items: [
                { id: 'pay_LOST', status: 'captured', order_id: 'order_LOST', amount: 18000 }
            ] }) };
        }
        if (target.includes('/orders/order_NONE/payments')) {
            return { ok: true, json: async () => ({ items: [] }) };
        }
        return { ok: false, status: 404, text: async () => 'nope', json: async () => ({}) };
    };

    res = await paid(req('POST', '/payment/order', {
        body: { ...validOrder, paymentMethod: 'online', total: 180 }
    }));
    t('checkout parks the cart on the server', res.statusCode === 200, res.body);

    // Customer pays, then the browser dies. Nothing calls POST /orders.
    t('no order exists yet', Object.keys(fake.tableOf('orders')).length === 0);

    res = await paid(req('POST', '/payment/complete', { body: { razorpayOrderId: 'order_LOST' } }));
    body = JSON.parse(res.body);
    t('the server completes the order on its own', res.statusCode === 201, res.body);
    t('the order is marked paid', body.order && body.order.paymentStatus === 'paid');
    t('with the real payment id', body.order && body.order.paymentId === 'pay_LOST');
    t('and a delivery code', /^\d{4}$/.test((body.order || {}).deliveryCode || ''));

    const recoveredId = body.order.orderId;
    res = await paid(req('POST', '/payment/complete', { body: { razorpayOrderId: 'order_LOST' } }));
    body = JSON.parse(res.body);
    t('calling recovery again returns the same order',
        body.order && body.order.orderId === recoveredId, res.body);
    t('and never creates a duplicate', Object.keys(fake.tableOf('orders')).length === 1);

    res = await paid(req('POST', '/payment/complete', { body: { razorpayOrderId: 'order_NONE' } }));
    t('an unpaid checkout is reported as pending, not completed',
        res.statusCode === 202, res.body);

    global.fetch = originalFetch;

    // ════════ CUSTOMER DATA BOUNDARIES ════════
    console.log('\n── Customer order history ──');

    fake.reset({ ...baseState(), orders: { '#SP1': mkOrder('#SP1') } });

    res = await paid(req('GET', '/orders', { qs: { email: '' } }));
    t('a guest with a blank email gets nothing, not everyone\'s orders',
        res.statusCode === 401, res.body);

    res = await paid(req('GET', '/orders', {
        qs: { email: 'ravi@example.com' }, headers: bearer(customerToken)
    }));
    t('a signed-in customer can read their own orders', res.statusCode === 200, res.body);
    t('and gets their order back', JSON.parse(res.body).orders.length === 1);

    res = await paid(req('GET', '/orders', { qs: { email: 'ravi@example.com' } }));
    t('without a token they get nothing', res.statusCode === 401, res.body);

    // A guest orders without an email. Writing null there breaks the index and
    // takes the whole ordering flow down with it.
    console.log('\n── Guest orders ──');

    fake.reset(baseState());
    res = await paid(req('POST', '/orders', {
        body: { ...validOrder, email: null, customerName: 'Guest' }
    }));
    body = JSON.parse(res.body);
    t('a guest can order without an email', res.statusCode === 201, res.body);
    t('no null email is written', body.order && body.order.email === undefined,
        JSON.stringify(body.order && body.order.email));

    res = await paid(req('POST', '/orders', {
        body: { ...validOrder, email: 'ravi@example.com' }
    }));
    t('a signed-in customer still records their email',
        JSON.parse(res.body).order.email === 'ravi@example.com', res.body);

    // ════════ CUSTOMER REGISTRY ════════
    console.log('\n── Registered users ──');

    fake.reset(baseState());

    // Stand in for Google's token check so we can exercise the registry
    const realVerify = require('../auth').verifyGoogleIdToken;
    require('../auth').verifyGoogleIdToken = async (credential) => {
        if (credential === 'good-ravi') {
            return { email: 'ravi@example.com', name: 'Ravi Kumar', picture: 'p.jpg', aud: 'test-google-client' };
        }
        if (credential === 'good-sita') {
            return { email: 'sita@example.com', name: 'Sita', picture: null, aud: 'test-google-client' };
        }
        return null;
    };
    for (const key of Object.keys(require.cache)) {
        if (key.includes('/backend/index.js')) delete require.cache[key];
    }
    const reg = require('../index.js').handler;

    res = await reg(req('POST', '/auth/customer', { body: { credential: 'good-ravi', platform: 'android' } }));
    t('signing in issues a customer token', res.statusCode === 200, res.body);
    t('the user is recorded', !!fake.tableOf('customers')['ravi@example.com']);
    t('sign-in count starts at 1',
        fake.tableOf('customers')['ravi@example.com'].signInCount === 1);
    t('platform is recorded',
        fake.tableOf('customers')['ravi@example.com'].platform === 'android');

    await reg(req('POST', '/auth/customer', { body: { credential: 'good-ravi' } }));
    t('signing in again does not duplicate the user',
        Object.keys(fake.tableOf('customers')).length === 1);
    t('but counts the extra sign-in',
        fake.tableOf('customers')['ravi@example.com'].signInCount === 2);

    await reg(req('POST', '/auth/customer', { body: { credential: 'good-sita' } }));
    t('a second person is a second user', Object.keys(fake.tableOf('customers')).length === 2);

    res = await reg(req('POST', '/auth/customer', { body: { credential: 'forged' } }));
    t('a forged credential registers nobody',
        res.statusCode === 401 && Object.keys(fake.tableOf('customers')).length === 2, res.body);

    res = await reg(req('GET', '/admin/customers', { headers: bearer(adminToken) }));
    body = JSON.parse(res.body);
    t('admin sees the user count', body.total === 2, res.body);
    t('admin sees new sign-ups this week', body.newThisWeek === 2);
    t('admin sees who has never ordered', body.neverOrdered === 2);
    t('recent list is returned', body.recent.length === 2);

    res = await reg(req('GET', '/admin/customers'));
    t('user numbers are not public', res.statusCode === 401, res.body);

    require('../auth').verifyGoogleIdToken = realVerify;

    // ════════ CORS ════════
    console.log('\n── CORS ──');
    res = await handler(req('GET', '/shop-status', { headers: { origin: 'https://localhost' } }));
    t('capacitor origin allowed', res.headers['Access-Control-Allow-Origin'] === 'https://localhost');
    res = await handler(req('GET', '/shop-status', { headers: { origin: 'https://evil.example.com' } }));
    t('unknown origin not echoed back',
        res.headers['Access-Control-Allow-Origin'] === 'https://aaplaswad.store');

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
})();
