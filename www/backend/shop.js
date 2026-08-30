// === SAI PRASAD — Shop config, menu, and order validation ===
// The server is the source of truth: the customer app reflects these values,
// but this file is what actually decides whether an order can be placed.

const db = require('./db');
const { DEFAULT_SHOP } = require('./defaults');

const SHOP_KEY = 'shop';
const MENU_KEY = 'menu';

// How much the customer app may take off a first order. Admin-controlled, and
// capped here so a tampered client cannot invent a bigger discount.
function firstOrderDiscountRate(shop) {
    if (!shop.firstOrderDiscountEnabled) return 0;
    const percent = Number(shop.firstOrderDiscountPercent);
    if (!isFinite(percent) || percent <= 0) return 0;
    return Math.min(percent, 50) / 100;
}

function toMinutes(hhmm) {
    const [h, m] = String(hhmm || '00:00').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

async function getShop() {
    const res = await db.ddb.send(new db.GetCommand({
        TableName: db.CONFIG_TABLE, Key: { configId: SHOP_KEY }
    }));
    return { ...DEFAULT_SHOP, ...(res.Item || {}) };
}

async function getMenu() {
    const res = await db.ddb.send(new db.GetCommand({
        TableName: db.CONFIG_TABLE, Key: { configId: MENU_KEY }
    }));
    return (res.Item && res.Item.items) || {};
}

// Why the shop is closed, or null when it's open for business.
function closedReason(shop, at) {
    if (!shop.isOpen) return shop.closedMessage;

    if (shop.autoSchedule) {
        const day = db.istWeekday(at);
        if ((shop.weeklyOff || []).includes(day)) {
            return `We are closed on ${day.charAt(0).toUpperCase() + day.slice(1)}s.`;
        }
        if ((shop.holidayDates || []).includes(db.istDate(at))) {
            return shop.closedMessage;
        }

        const now = db.istMinutes(at);
        const open = toMinutes(shop.openTime);
        const close = toMinutes(shop.closeTime);
        // A close time past midnight (e.g. 23:00 → 01:00) wraps around
        const within = close > open
            ? (now >= open && now < close)
            : (now >= open || now < close);
        if (!within) {
            return `We are closed. Orders open at ${shop.openTime}.`;
        }
    }

    return null;
}

async function shopStatus() {
    const shop = await getShop();
    const reason = closedReason(shop);
    return {
        isOpen: !reason && !shop.pauseOrders,
        closed: !!reason,
        paused: !reason && !!shop.pauseOrders,
        message: reason || (shop.pauseOrders ? shop.pauseMessage : ''),
        openTime: shop.openTime,
        closeTime: shop.closeTime,
        prepTimeMinutes: shop.prepTimeMinutes,
        deliveryFee: shop.deliveryFee,
        minOrderValue: shop.minOrderValue,
        codEnabled: shop.codEnabled,
        onlineEnabled: shop.onlineEnabled,
        hotelLat: shop.hotelLat || null,
        hotelLng: shop.hotelLng || null,
        maxDeliveryKm: shop.maxDeliveryKm || 5,
        firstOrderDiscountEnabled: !!shop.firstOrderDiscountEnabled,
        firstOrderDiscountPercent: shop.firstOrderDiscountEnabled
            ? Number(shop.firstOrderDiscountPercent) || 0 : 0
    };
}

// Validates a submitted order against live config, and recomputes the total
// from server-side prices so a tampered client can't set its own price.
async function validateOrder(body) {
    const [shop, menu] = await Promise.all([getShop(), getMenu()]);

    const reason = closedReason(shop);
    if (reason) return { ok: false, code: 423, error: reason };
    if (shop.pauseOrders) return { ok: false, code: 423, error: shop.pauseMessage };

    const submitted = Array.isArray(body.items) ? body.items : [];
    if (submitted.length === 0) {
        return { ok: false, code: 400, error: 'Your cart is empty.' };
    }

    const priced = [];
    let subtotal = 0;

    for (const line of submitted) {
        const item = menu[line.key];
        if (!item) {
            return { ok: false, code: 409, error: `${line.name || line.key} is no longer on the menu.` };
        }
        if (item.available === false) {
            return { ok: false, code: 409, error: `${item.name} is sold out right now.` };
        }

        const qty = Math.max(1, parseInt(line.qty, 10) || 1);

        // Only extras that still exist and are available count
        const extras = [];
        let extrasTotal = 0;
        for (const key of (line.extras || [])) {
            const price = item.extras ? item.extras[key] : undefined;
            if (price === undefined) continue;
            if (item.extrasAvailable && item.extrasAvailable[key] === false) {
                return {
                    ok: false, code: 409,
                    error: `${(item.extrasLabels && item.extrasLabels[key]) || 'An extra'} is unavailable.`
                };
            }
            extras.push({ key, label: (item.extrasLabels || {})[key] || key, price });
            extrasTotal += price;
        }

        const lineTotal = (item.price + extrasTotal) * qty;
        subtotal += lineTotal;

        priced.push({
            key: line.key, name: item.name, qty,
            price: item.price, extras, lineTotal
        });
    }

    // The customer app gives first-time customers a discount, so the total it
    // submits is legitimately below the sum of the menu prices. The allowance is
    // recomputed here rather than trusted, so a tampered client cannot invent
    // its own — and it drops to zero the moment the admin turns the offer off.
    const grossTotal = subtotal + (shop.deliveryFee || 0);
    const maxDiscount = Math.round(subtotal * firstOrderDiscountRate(shop));
    const total = grossTotal;

    if (shop.minOrderValue && subtotal < shop.minOrderValue) {
        return {
            ok: false, code: 400,
            error: `Minimum order value is ₹${shop.minOrderValue}.`
        };
    }

    const method = body.paymentMethod || 'cod';
    if (method === 'cod' && !shop.codEnabled) {
        return { ok: false, code: 409, error: 'Cash on delivery is unavailable right now.' };
    }
    if (method !== 'cod' && !shop.onlineEnabled) {
        return { ok: false, code: 409, error: 'Online payment is unavailable right now.' };
    }

    return {
        ok: true,
        items: priced,
        subtotal,
        deliveryFee: shop.deliveryFee || 0,
        total,
        maxDiscount,
        minAcceptableTotal: grossTotal - maxDiscount,
        prepTimeMinutes: shop.prepTimeMinutes,
        shop
    };
}

// Straight-line distance, good enough for showing partners how far a drop is
function distanceKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some(v => v === null || v === undefined || isNaN(v))) return null;
    const R = 6371;
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// Minutes until the customer should expect their food. Once the partner is
// carrying the order we measure from where they actually are; before that,
// from the kitchen, plus whatever cooking time is left.
function etaMinutes(order, shop) {
    if (['delivered', 'cancelled'].includes(order.status)) return null;

    const speed = Number(shop.avgSpeedKmph) || 20;
    const carrying = order.status === 'picked_up' &&
        order.partnerLat !== undefined && order.partnerLat !== null;

    const distance = carrying
        ? distanceKm(order.partnerLat, order.partnerLng, order.lat, order.lng)
        : distanceKm(shop.hotelLat, shop.hotelLng, order.lat, order.lng);

    // Without coordinates all we can honestly offer is the prep estimate
    const travel = distance === null ? null : (distance / speed) * 60;

    let prepLeft = 0;
    if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
        const elapsed = (Date.now() - new Date(order.createdAt)) / 60000;
        prepLeft = Math.max(0, (Number(shop.prepTimeMinutes) || 30) - elapsed);
    }

    if (travel === null) {
        return prepLeft > 0 ? Math.ceil(prepLeft) + 15 : null;
    }
    return Math.max(2, Math.ceil(prepLeft + travel + 3));
}

module.exports = {
    SHOP_KEY, MENU_KEY, DEFAULT_SHOP, firstOrderDiscountRate,
    getShop, getMenu, shopStatus, closedReason, validateOrder,
    distanceKm, etaMinutes, toMinutes
};
