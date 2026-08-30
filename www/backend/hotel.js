// === SAI PRASAD — Kitchen operations ===

const db = require('./db');

// What the kitchen is allowed to do, and in what order
const KITCHEN_FLOW = {
    pending: ['confirmed', 'ready', 'cancelled'],
    confirmed: ['preparing', 'ready', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['preparing']   // undo, in case it was marked ready too early
};

async function queue() {
    const orders = await db.activeOrders();

    const counts = {
        new: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        preparing: orders.filter(o => o.status === 'preparing').length,
        ready: orders.filter(o => o.status === 'ready').length,
        onTheWay: orders.filter(o => ['picked_up', 'on_the_way'].includes(o.status)).length
    };

    // Item totals across everything not yet cooked, so the kitchen can batch
    // instead of working order by order.
    const prepping = orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
    const prepTotals = {};
    for (const order of prepping) {
        for (const line of (order.items || [])) {
            const key = line.key || line.name;
            if (!key) continue;
            if (!prepTotals[key]) {
                prepTotals[key] = { key, name: line.name || key, qty: 0, extras: {} };
            }
            prepTotals[key].qty += line.qty || 1;
            for (const extra of (line.extras || [])) {
                const label = extra.label || extra.key;
                prepTotals[key].extras[label] = (prepTotals[key].extras[label] || 0) + (line.qty || 1);
            }
        }
    }

    return {
        counts,
        prepTotals: Object.values(prepTotals).sort((a, b) => b.qty - a.qty),
        orders: orders.map(({ statusHistory, customerPic, deliveryCode, ...o }) => ({
            ...o,
            // The kitchen needs to know if someone is already on the way for it
            partnerName: o.deliveryPartner ? o.deliveryPartner.name : null,
            waitingMinutes: Math.floor((Date.now() - new Date(o.createdAt)) / 60000)
        }))
    };
}

async function setStatus(orderId, nextStatus, actor) {
    const order = await db.getOrder(orderId);
    if (!order) return { ok: false, code: 404, error: 'Order not found' };

    const allowed = KITCHEN_FLOW[order.status] || [];
    if (!allowed.includes(nextStatus)) {
        return {
            ok: false, code: 409,
            error: `Cannot move an order from ${order.status} to ${nextStatus}`
        };
    }

    const history = [...(order.statusHistory || []),
        { status: nextStatus, at: db.nowIso(), by: actor }];

    const updates = {
        UpdateExpression: 'SET #s = :next, statusHistory = :h, updatedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':next': nextStatus, ':h': history, ':now': db.nowIso() }
    };

    if (nextStatus === 'ready') {
        updates.UpdateExpression += ', readyAt = :ready';
        updates.ExpressionAttributeValues[':ready'] = db.nowIso();
    }

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.TABLE, Key: { orderId }, ...updates
    }));

    return { ok: true, order: await db.getOrder(orderId) };
}

// Kitchen rejects an order — usually because something has run out
async function reject(orderId, reason, actor) {
    const order = await db.getOrder(orderId);
    if (!order) return { ok: false, code: 404, error: 'Order not found' };
    if (['delivered', 'cancelled'].includes(order.status)) {
        return { ok: false, code: 409, error: `This order is already ${order.status}` };
    }

    const history = [...(order.statusHistory || []),
        { status: 'cancelled', at: db.nowIso(), by: actor }];

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.TABLE,
        Key: { orderId },
        UpdateExpression: 'SET #s = :c, cancelReason = :r, cancelledBy = :by, ' +
            'deliveryPartner = :null, statusHistory = :h, updatedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
            ':c': 'cancelled',
            ':r': reason || 'Rejected by kitchen',
            ':by': actor,
            ':null': null,     // release any partner who had already claimed it
            ':h': history,
            ':now': db.nowIso()
        }
    }));

    return { ok: true, order: await db.getOrder(orderId) };
}

module.exports = { queue, setStatus, reject, KITCHEN_FLOW };
