// === SAI PRASAD — Admin operations ===

const crypto = require('crypto');
const db = require('./db');
const shop = require('./shop');
const auth = require('./auth');

// Fields an admin is allowed to write. Anything else in the body is ignored,
// so a stray key can't overwrite unrelated config.
const SHOP_FIELDS = [
    'isOpen', 'autoSchedule', 'openTime', 'closeTime', 'weeklyOff', 'holidayDates',
    'closedMessage', 'pauseOrders', 'pauseMessage', 'hotelLat', 'hotelLng',
    'deliveryRadiusKm', 'deliveryFee', 'minOrderValue', 'codEnabled', 'onlineEnabled',
    'prepTimeMinutes', 'defaultPayoutPerDelivery',
    'firstOrderDiscountEnabled', 'firstOrderDiscountPercent', 'avgSpeedKmph'
];

const MENU_ITEM_FIELDS = [
    'name', 'shortName', 'price', 'oldPrice', 'discount', 'image', 'category',
    'includes', 'extras', 'extrasLabels', 'extrasAvailable', 'available', 'sortOrder'
];

async function updateShopConfig(body) {
    const current = await shop.getShop();
    const next = { ...current };

    for (const field of SHOP_FIELDS) {
        if (body[field] !== undefined) next[field] = body[field];
    }
    next.configId = shop.SHOP_KEY;
    next.updatedAt = db.nowIso();

    await db.ddb.send(new db.PutCommand({ TableName: db.CONFIG_TABLE, Item: next }));
    return next;
}

async function updateMenuItem(itemKey, body) {
    const items = await shop.getMenu();
    const existing = items[itemKey];
    if (!existing) return { ok: false, code: 404, error: 'Menu item not found' };

    const updated = { ...existing };
    for (const field of MENU_ITEM_FIELDS) {
        if (body[field] !== undefined) updated[field] = body[field];
    }

    if (updated.price !== undefined) {
        const price = Number(updated.price);
        if (!isFinite(price) || price < 0) {
            return { ok: false, code: 400, error: 'Price must be a positive number' };
        }
        updated.price = Math.round(price);

        // Auto-recalculate discount whenever price changes so the customer
        // website always shows an accurate "X% OFF" badge.
        if (updated.oldPrice && updated.oldPrice > updated.price) {
            const pct = Math.round((1 - updated.price / updated.oldPrice) * 100);
            updated.discount = pct + '% OFF';
        } else {
            // Price equals or exceeds the old MRP — no discount to show
            updated.discount = '';
        }
    }

    items[itemKey] = updated;

    await db.ddb.send(new db.PutCommand({
        TableName: db.CONFIG_TABLE,
        Item: { configId: shop.MENU_KEY, items, updatedAt: db.nowIso() }
    }));

    return { ok: true, item: updated };
}

// ── Reports ──

function summarise(orders) {
    const delivered = orders.filter(o => o.status === 'delivered');
    const cancelled = orders.filter(o => o.status === 'cancelled');
    const live = orders.filter(o => o.status !== 'cancelled');

    const cash = live.filter(o => o.paymentMethod === 'cod');
    const online = live.filter(o => o.paymentMethod !== 'cod');

    const revenue = live.reduce((sum, o) => sum + (o.total || 0), 0);

    // Item-wise sales, so the kitchen knows what to stock
    const itemSales = {};
    for (const order of live) {
        for (const line of (order.items || [])) {
            const key = line.key || line.name;
            if (!key) continue;
            if (!itemSales[key]) itemSales[key] = { name: line.name || key, qty: 0, revenue: 0 };
            itemSales[key].qty += line.qty || 1;
            itemSales[key].revenue += line.lineTotal || (line.price || 0) * (line.qty || 1);
        }
    }

    const hourly = new Array(24).fill(0);
    for (const order of live) {
        const istHour = new Date(new Date(order.createdAt).getTime() + 5.5 * 3600000).getUTCHours();
        hourly[istHour]++;
    }

    const byDate = {};
    for (const order of live) {
        const d = order.orderDate || (order.createdAt || '').slice(0, 10);
        if (!byDate[d]) byDate[d] = { date: d, orders: 0, revenue: 0 };
        byDate[d].orders++;
        byDate[d].revenue += order.total || 0;
    }

    return {
        totalOrders: live.length,
        revenue,
        avgOrderValue: live.length ? Math.round(revenue / live.length) : 0,
        delivered: delivered.length,
        cancelled: cancelled.length,
        cancelReasons: cancelled.map(o => o.cancelReason).filter(Boolean),
        cash: {
            count: cash.length,
            amount: cash.reduce((s, o) => s + (o.total || 0), 0),
            collected: cash.filter(o => o.paymentStatus === 'paid')
                .reduce((s, o) => s + (o.total || 0), 0)
        },
        online: {
            count: online.length,
            amount: online.reduce((s, o) => s + (o.total || 0), 0)
        },
        itemSales: Object.entries(itemSales)
            .map(([key, v]) => ({ key, ...v }))
            .sort((a, b) => b.qty - a.qty),
        hourly,
        byDate: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date))
    };
}

async function reports(from, to) {
    const orders = await db.ordersForRange(from, to);
    return { from, to, ...summarise(orders) };
}

// Partner payouts — deliveries done, what they earned, cash they carry
async function payouts(from, to) {
    const [orders, staff] = await Promise.all([
        db.ordersForRange(from, to),
        db.allStaff()
    ]);

    const partners = {};
    for (const member of staff.filter(s => s.role === 'delivery')) {
        partners[member.staffId] = {
            staffId: member.staffId,
            name: member.name,
            phone: member.phone,
            active: member.active !== false,
            rate: member.payoutPerDelivery || 0,
            deliveries: 0,
            earned: 0,
            cashCollected: 0
        };
    }

    for (const order of orders) {
        if (order.status !== 'delivered' || !order.deliveryPartner) continue;
        const id = order.deliveryPartner.id;
        if (!partners[id]) {
            // Keep payouts correct even for a partner who has since been removed
            partners[id] = {
                staffId: id, name: order.deliveryPartner.name, phone: order.deliveryPartner.phone,
                active: false, rate: 0, deliveries: 0, earned: 0, cashCollected: 0
            };
        }
        partners[id].deliveries++;
        partners[id].earned += order.deliveryPayout || 0;
        if (order.paymentMethod === 'cod') {
            partners[id].cashCollected += order.total || 0;
        }
    }

    const rows = Object.values(partners).map(p => ({
        ...p,
        // Positive means the partner hands cash over, negative means they're owed
        netToHandOver: p.cashCollected - p.earned
    })).sort((a, b) => b.deliveries - a.deliveries);

    return {
        from, to, partners: rows,
        totalPayout: rows.reduce((s, p) => s + p.earned, 0),
        totalCash: rows.reduce((s, p) => s + p.cashCollected, 0)
    };
}

// ── Staff management ──

function publicStaff(member) {
    const { pinHash, pinSalt, ...safe } = member;
    return safe;
}

async function listStaff() {
    const staff = await db.allStaff();
    return staff.map(publicStaff)
        .sort((a, b) => (a.role || '').localeCompare(b.role) || (a.name || '').localeCompare(b.name));
}

async function createStaff(body) {
    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').replace(/\D/g, '');
    const role = body.role;
    const pin = String(body.pin || '');

    if (!name) return { ok: false, code: 400, error: 'Name is required' };
    if (!/^\d{10}$/.test(phone)) return { ok: false, code: 400, error: 'Enter a valid 10-digit phone number' };
    if (!['admin', 'hotel', 'delivery'].includes(role)) {
        return { ok: false, code: 400, error: 'Role must be admin, hotel or delivery' };
    }
    if (!/^\d{4,8}$/.test(pin)) return { ok: false, code: 400, error: 'PIN must be 4-8 digits' };

    const existing = await db.allStaff();
    if (existing.some(s => s.phone === phone)) {
        return { ok: false, code: 409, error: 'That phone number already has an account' };
    }

    const { hash, salt } = auth.hashPin(pin);
    const member = {
        staffId: `${role}-${phone}-${crypto.randomBytes(3).toString('hex')}`,
        name, phone, role,
        pinHash: hash, pinSalt: salt,
        active: true,
        failedAttempts: 0,
        mustChangePin: true,
        payoutPerDelivery: role === 'delivery'
            ? Number(body.payoutPerDelivery || 0)
            : undefined,
        createdAt: db.nowIso()
    };
    if (member.payoutPerDelivery === undefined) delete member.payoutPerDelivery;

    await db.ddb.send(new db.PutCommand({ TableName: db.STAFF_TABLE, Item: member }));
    return { ok: true, staff: publicStaff(member) };
}

async function updateStaff(staffId, body, actingStaffId) {
    const member = await db.getStaff(staffId);
    if (!member) return { ok: false, code: 404, error: 'Staff member not found' };

    const updates = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.active !== undefined) updates.active = !!body.active;
    if (body.payoutPerDelivery !== undefined) {
        updates.payoutPerDelivery = Number(body.payoutPerDelivery) || 0;
    }
    if (body.role !== undefined && ['admin', 'hotel', 'delivery'].includes(body.role)) {
        updates.role = body.role;
    }

    // An admin locking themselves out would need a redeploy to recover
    if (staffId === actingStaffId && updates.active === false) {
        return { ok: false, code: 400, error: 'You cannot deactivate your own account' };
    }
    if (staffId === actingStaffId && updates.role && updates.role !== 'admin') {
        return { ok: false, code: 400, error: 'You cannot remove your own admin role' };
    }

    if (body.pin !== undefined) {
        const pin = String(body.pin);
        if (!/^\d{4,8}$/.test(pin)) return { ok: false, code: 400, error: 'PIN must be 4-8 digits' };
        const { hash, salt } = auth.hashPin(pin);
        updates.pinHash = hash;
        updates.pinSalt = salt;
        updates.mustChangePin = true;
        updates.failedAttempts = 0;
    }

    if (Object.keys(updates).length === 0) {
        return { ok: false, code: 400, error: 'Nothing to update' };
    }

    updates.updatedAt = db.nowIso();

    const names = {};
    const values = {};
    const sets = Object.keys(updates).map((key, i) => {
        names[`#k${i}`] = key;
        values[`:v${i}`] = updates[key];
        return `#k${i} = :v${i}`;
    });

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.STAFF_TABLE,
        Key: { staffId },
        UpdateExpression: 'SET ' + sets.join(', ') +
            (updates.pinHash ? ' REMOVE lockedUntil' : ''),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
    }));

    const fresh = await db.getStaff(staffId);
    return { ok: true, staff: publicStaff(fresh) };
}

// ── Order overrides ──

async function updateOrder(orderId, body, actor) {
    const order = await db.getOrder(orderId);
    if (!order) return { ok: false, code: 404, error: 'Order not found' };

    const updates = { updatedAt: db.nowIso() };
    const history = [...(order.statusHistory || [])];

    if (body.status && body.status !== order.status) {
        updates.status = body.status;
        history.push({ status: body.status, at: db.nowIso(), by: actor });
        if (body.status === 'cancelled') {
            updates.cancelReason = body.cancelReason || 'Cancelled by admin';
            updates.cancelledBy = actor;
            // Free the order so the partner's queue doesn't keep a dead job
            updates.deliveryPartner = null;
        }
    }
    if (body.paymentStatus) updates.paymentStatus = body.paymentStatus;
    if (body.deliveryPartner !== undefined) updates.deliveryPartner = body.deliveryPartner;

    updates.statusHistory = history;

    const names = {};
    const values = {};
    const sets = Object.keys(updates).map((key, i) => {
        names[`#k${i}`] = key;
        values[`:v${i}`] = updates[key];
        return `#k${i} = :v${i}`;
    });

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.TABLE,
        Key: { orderId },
        UpdateExpression: 'SET ' + sets.join(', '),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values
    }));

    return { ok: true, order: await db.getOrder(orderId) };
}

function toCsv(orders) {
    const headers = [
        'Order ID', 'Date', 'Time (IST)', 'Customer', 'Phone', 'Address',
        'Items', 'Total', 'Payment', 'Payment Status', 'Status', 'Delivery Partner', 'Payout'
    ];
    const escape = (v) => `"${String(v === undefined || v === null ? '' : v).replace(/"/g, '""')}"`;

    const rows = orders.map(o => [
        o.orderId,
        o.orderDate || '',
        new Date(new Date(o.createdAt).getTime() + 5.5 * 3600000).toISOString().slice(11, 16),
        o.customerName, o.phone,
        [o.address, o.landmark, o.pincode].filter(Boolean).join(', '),
        (o.items || []).map(i => `${i.name} x${i.qty}`).join('; '),
        o.total, o.paymentMethod, o.paymentStatus, o.status,
        o.deliveryPartner ? o.deliveryPartner.name : '',
        o.deliveryPayout || 0
    ].map(escape).join(','));

    return [headers.join(','), ...rows].join('\n');
}

module.exports = {
    updateShopConfig, updateMenuItem, reports, payouts,
    listStaff, createStaff, updateStaff, updateOrder, publicStaff, toCsv, summarise
};
