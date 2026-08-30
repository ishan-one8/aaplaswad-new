// === SAI PRASAD — Customer registry ===
// Everyone who has signed in, so the admin can see how many people are
// actually using the app rather than guessing from order counts.

const db = require('./db');

// Recorded on every sign-in. Cheap: one write per login, not per request.
async function recordSignIn(profile) {
    if (!profile || !profile.email) return null;

    const existing = await db.ddb.send(new db.GetCommand({
        TableName: db.CUSTOMER_TABLE,
        Key: { email: profile.email }
    }));

    const now = db.nowIso();
    const previous = existing.Item;

    const record = {
        email: profile.email,
        name: profile.name || (previous && previous.name) || '',
        picture: profile.picture || (previous && previous.picture) || null,
        platform: profile.platform || (previous && previous.platform) || 'web',
        signInCount: ((previous && previous.signInCount) || 0) + 1,
        firstSeenAt: (previous && previous.firstSeenAt) || now,
        lastSeenAt: now,
        firstSeenDate: (previous && previous.firstSeenDate) || db.istDate()
    };

    await db.ddb.send(new db.PutCommand({
        TableName: db.CUSTOMER_TABLE, Item: record
    }));

    return { isNew: !previous, record };
}

async function allCustomers() {
    const items = [];
    let lastKey;
    do {
        const res = await db.ddb.send(new db.ScanCommand({
            TableName: db.CUSTOMER_TABLE,
            ...(lastKey && { ExclusiveStartKey: lastKey })
        }));
        items.push(...(res.Items || []));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

function daysAgoIso(days) {
    return new Date(Date.now() - days * 86400000).toISOString();
}

// Who is registered, who is actually coming back, and who has ever ordered.
async function summary(days = 30) {
    const [customers, orders] = await Promise.all([
        allCustomers(),
        db.ordersForRange(db.istDate(new Date(Date.now() - days * 86400000)), db.istDate())
    ]);

    const week = daysAgoIso(7);
    const month = daysAgoIso(30);

    // An email that has placed at least one order in the window
    const ordered = new Set(orders.map(o => o.email).filter(Boolean));

    const spendByEmail = {};
    for (const order of orders) {
        if (!order.email || order.status === 'cancelled') continue;
        if (!spendByEmail[order.email]) spendByEmail[order.email] = { orders: 0, spent: 0 };
        spendByEmail[order.email].orders++;
        spendByEmail[order.email].spent += order.total || 0;
    }

    const newThisWeek = customers.filter(c => c.firstSeenAt >= week);
    const activeThisWeek = customers.filter(c => c.lastSeenAt >= week);

    // Signed up but never ordered — the gap worth acting on
    const neverOrdered = customers.filter(c => !ordered.has(c.email));

    const byDate = {};
    for (const c of customers) {
        const d = c.firstSeenDate || (c.firstSeenAt || '').slice(0, 10);
        if (!d) continue;
        byDate[d] = (byDate[d] || 0) + 1;
    }

    const top = Object.entries(spendByEmail)
        .map(([email, v]) => {
            const person = customers.find(c => c.email === email);
            return { email, name: person ? person.name : email, ...v };
        })
        .sort((a, b) => b.spent - a.spent)
        .slice(0, 10);

    return {
        total: customers.length,
        newThisWeek: newThisWeek.length,
        activeThisWeek: activeThisWeek.length,
        activeThisMonth: customers.filter(c => c.lastSeenAt >= month).length,
        neverOrdered: neverOrdered.length,
        ordering: customers.length - neverOrdered.length,
        signUpsByDate: Object.entries(byDate)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(-30),
        topCustomers: top,
        recent: customers
            .slice()
            .sort((a, b) => (b.firstSeenAt || '').localeCompare(a.firstSeenAt || ''))
            .slice(0, 25)
            .map(c => ({
                email: c.email,
                name: c.name,
                platform: c.platform,
                signInCount: c.signInCount,
                firstSeenAt: c.firstSeenAt,
                lastSeenAt: c.lastSeenAt,
                hasOrdered: ordered.has(c.email)
            }))
    };
}

module.exports = { recordSignIn, allCustomers, summary };
