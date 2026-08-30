// === SAI PRASAD — Delivery partner operations ===

const db = require('./db');
const shopConfig = require('./shop');

const CLAIMABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

function withDistance(order, shop) {
    // Never hand the delivery code to the partner — the customer reads it out.
    // statusHistory and the avatar are dropped too: nothing on this screen uses
    // them, and they are polled every few seconds by every rider.
    const { deliveryCode, statusHistory, customerPic, ...safe } = order;
    return {
        ...safe,
        distanceKm: shopConfig.distanceKm(shop.hotelLat, shop.hotelLng, order.lat, order.lng),
        mapsUrl: order.lat && order.lng
            ? `https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                [order.address, order.landmark, order.pincode].filter(Boolean).join(', '))}`,
        waitingMinutes: Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
    };
}

// The unclaimed pool. Anything already claimed is filtered out here, which is
// what makes an accepted order disappear from every other partner's screen.
async function available() {
    const [orders, shop] = await Promise.all([db.activeOrders(), shopConfig.getShop()]);
    return orders
        .filter(o => CLAIMABLE_STATUSES.includes(o.status) && !o.deliveryPartner)
        .map(o => withDistance(o, shop));
}

async function mine(staffId) {
    const [orders, shop] = await Promise.all([db.activeOrders(), shopConfig.getShop()]);
    return orders
        .filter(o => o.deliveryPartner && o.deliveryPartner.id === staffId)
        .map(o => withDistance(o, shop));
}

// Atomic claim: the condition is what stops two partners taking one order.
// Whoever writes first wins; everyone else gets a 409.
async function claim(orderId, partner) {
    const order = await db.getOrder(orderId);
    if (!order) return { ok: false, code: 404, error: 'Order not found' };
    if (!CLAIMABLE_STATUSES.includes(order.status)) {
        return { ok: false, code: 409, error: `This order is ${order.status}` };
    }

    const history = [...(order.statusHistory || []),
        { status: 'claimed', at: db.nowIso(), by: partner.name }];

    try {
        await db.ddb.send(new db.UpdateCommand({
            TableName: db.TABLE,
            Key: { orderId },
            UpdateExpression:
                'SET deliveryPartner = :p, claimedAt = :now, statusHistory = :h, updatedAt = :now',
            ConditionExpression:
                '(attribute_not_exists(deliveryPartner) OR deliveryPartner = :null) AND #s IN ' +
                '(:s0, :s1, :s2, :s3)',
            ExpressionAttributeNames: { '#s': 'status' },
            ExpressionAttributeValues: {
                ':p': { id: partner.staffId, name: partner.name, phone: partner.phone },
                ':now': db.nowIso(),
                ':h': history,
                ':null': null,
                ':s0': 'pending', ':s1': 'confirmed', ':s2': 'preparing', ':s3': 'ready'
            }
        }));
    } catch (err) {
        if (err.name === 'ConditionalCheckFailedException') {
            return { ok: false, code: 409, error: 'Another partner already took this order' };
        }
        throw err;
    }

    return { ok: true, order: await db.getOrder(orderId) };
}

// Hand an order back to the pool
async function release(orderId, staffId) {
    const order = await db.getOrder(orderId);
    if (!order) return { ok: false, code: 404, error: 'Order not found' };
    if (!order.deliveryPartner || order.deliveryPartner.id !== staffId) {
        return { ok: false, code: 403, error: 'This order is not yours' };
    }
    if (order.status === 'delivered') {
        return { ok: false, code: 409, error: 'This order is already delivered' };
    }

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.TABLE,
        Key: { orderId },
        UpdateExpression: 'SET deliveryPartner = :null, updatedAt = :now REMOVE claimedAt',
        ExpressionAttributeValues: { ':null': null, ':now': db.nowIso() }
    }));

    return { ok: true, order: await db.getOrder(orderId) };
}

async function setStatus(orderId, nextStatus, partner, code) {
    if (!['preparing', 'on_the_way', 'picked_up', 'delivered'].includes(nextStatus)) {
        return { ok: false, code: 400, error: 'Unsupported status' };
    }

    const order = await db.getOrder(orderId);
    if (!order) return { ok: false, code: 404, error: 'Order not found' };
    if (!order.deliveryPartner || order.deliveryPartner.id !== partner.staffId) {
        return { ok: false, code: 403, error: 'This order is not yours' };
    }

    // Status transition rules: preparing → picked_up → on_the_way → delivered
    if (nextStatus === 'preparing' && !['pending', 'confirmed'].includes(order.status)) {
        return { ok: false, code: 409, error: `Cannot mark preparing when order is ${order.status}` };
    }
    if (nextStatus === 'picked_up' && !['preparing', 'confirmed', 'ready'].includes(order.status)) {
        return { ok: false, code: 409, error: `Cannot pick up an order that is ${order.status}` };
    }
    if (nextStatus === 'on_the_way' && order.status !== 'picked_up') {
        return { ok: false, code: 409, error: 'Pick up the order first' };
    }
    if (nextStatus === 'delivered' && order.status !== 'on_the_way') {
        return { ok: false, code: 409, error: 'Mark the order "On the Way" first' };
    }

    // Proof of delivery: the customer reads out their code. Either the short
    // code or the full order ID is accepted. Orders placed before this existed
    // have no code, so they stay deliverable without one.
    if (nextStatus === 'delivered' && order.deliveryCode) {
        const entered = String(code || '').trim().toUpperCase().replace(/^#/, '');
        const expected = String(order.deliveryCode).toUpperCase();
        const fullId = String(order.orderId).toUpperCase().replace(/^#/, '');

        if (!entered) {
            return { ok: false, code: 400, error: 'Ask the customer for their delivery code' };
        }
        if (entered !== expected && entered !== fullId) {
            return { ok: false, code: 400, error: 'That code does not match this order' };
        }
    }

    const history = [...(order.statusHistory || []),
        { status: nextStatus, at: db.nowIso(), by: partner.name }];

    const values = {
        ':next': nextStatus, ':h': history, ':now': db.nowIso()
    };
    let expression = 'SET #s = :next, statusHistory = :h, updatedAt = :now';

    if (nextStatus === 'picked_up') {
        expression += ', pickedUpAt = :now';
    }

    if (nextStatus === 'delivered') {
        expression += ', deliveredAt = :now, deliveryPayout = :payout';
        // Stamp the rate in force right now, so a later raise doesn't rewrite
        // what this delivery was worth.
        values[':payout'] = Number(partner.payoutPerDelivery || 0);

        if (order.paymentMethod === 'cod') {
            expression += ', paymentStatus = :paid, cashCollected = :cash';
            values[':paid'] = 'paid';
            values[':cash'] = order.total || 0;
        }
    }

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.TABLE,
        Key: { orderId },
        UpdateExpression: expression,
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: values
    }));

    return { ok: true, order: await db.getOrder(orderId) };
}

// Partner's live position, stamped onto whichever orders they are carrying.
// Storing it on the order (rather than the staff record) means the customer's
// tracking page reads it without ever seeing the partner's other jobs.
async function updateLocation(staffId, lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) {
        return { ok: false, code: 400, error: 'Invalid coordinates' };
    }

    const orders = await db.activeOrders();
    const carrying = orders.filter(o =>
        o.deliveryPartner && o.deliveryPartner.id === staffId && o.status !== 'delivered');

    await Promise.all(carrying.map(order => db.ddb.send(new db.UpdateCommand({
        TableName: db.TABLE,
        Key: { orderId: order.orderId },
        UpdateExpression:
            'SET partnerLat = :lat, partnerLng = :lng, partnerLocationAt = :now',
        ExpressionAttributeValues: { ':lat': lat, ':lng': lng, ':now': db.nowIso() }
    }))));

    return { ok: true, updated: carrying.length };
}

// A partner's own day + month: what they earned versus the cash they're carrying
async function earnings(staffId, date) {
    const day = date || db.istDate();
    const orders = await db.ordersForDate(day);

    const delivered = orders.filter(o =>
        o.status === 'delivered' && o.deliveryPartner && o.deliveryPartner.id === staffId);

    const cashCollected = delivered
        .filter(o => o.paymentMethod === 'cod')
        .reduce((sum, o) => sum + (o.total || 0), 0);

    const earned = delivered.reduce((sum, o) => sum + (o.deliveryPayout || 0), 0);

    // Monthly stats: from 1st of current month to today
    const monthStart = day.slice(0, 7) + '-01'; // e.g. 2026-08-01
    let monthDeliveries = delivered.length;
    let monthEarned = earned;

    if (monthStart !== day) {
        try {
            const monthOrders = await db.ordersForRange(monthStart, day);
            const monthDelivered = monthOrders.filter(o =>
                o.status === 'delivered' && o.deliveryPartner && o.deliveryPartner.id === staffId);
            monthDeliveries = monthDelivered.length;
            monthEarned = monthDelivered.reduce((sum, o) => sum + (o.deliveryPayout || 0), 0);
        } catch (e) {
            console.error('Monthly earnings error:', e);
        }
    }

    return {
        date: day,
        deliveries: delivered.length,
        earned,
        cashCollected,
        netToHandOver: cashCollected - earned,
        monthDeliveries,
        monthEarned
    };
}

module.exports = {
    available, mine, claim, release, setStatus, earnings, updateLocation, CLAIMABLE_STATUSES
};
