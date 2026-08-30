// === SAI PRASAD — Customer notification broadcasts ===
// Deals and offers sent from the admin panel to customers who opted in.

const crypto = require('crypto');
const db = require('./db');
const push = require('./push');

// Sending to tens of thousands of phones takes minutes, far longer than a
// browser request may wait. Anything above this is handed to a background
// invocation of this same function and reported as it progresses.
const SYNC_LIMIT = 400;

const HISTORY_KEY = 'broadcasts';
const HISTORY_LIMIT = 50;

// A device is identified by its push token; hashing it keeps the key short
// and avoids putting the raw token in an index.
function subscriberId(token) {
    return crypto.createHash('sha256').update(token).digest('hex').slice(0, 32);
}

async function subscribe(body) {
    const token = String(body.token || '').trim();
    if (!token || token.length < 20) {
        return { ok: false, code: 400, error: 'A valid push token is required' };
    }

    const id = subscriberId(token);
    const existing = await db.ddb.send(new db.GetCommand({
        TableName: db.SUBSCRIBER_TABLE, Key: { subscriberId: id }
    }));

    const record = {
        subscriberId: id,
        token,
        email: body.email || (existing.Item && existing.Item.email) || null,
        name: body.name || (existing.Item && existing.Item.name) || null,
        platform: body.platform === 'android' ? 'android' : 'web',
        active: true,
        createdAt: (existing.Item && existing.Item.createdAt) || db.nowIso(),
        lastSeenAt: db.nowIso()
    };

    await db.ddb.send(new db.PutCommand({
        TableName: db.SUBSCRIBER_TABLE, Item: record
    }));

    return { ok: true, subscribed: true };
}

async function unsubscribe(token) {
    if (!token) return { ok: false, code: 400, error: 'Token required' };
    await db.ddb.send(new db.DeleteCommand({
        TableName: db.SUBSCRIBER_TABLE, Key: { subscriberId: subscriberId(token) }
    }));
    return { ok: true, unsubscribed: true };
}

async function allSubscribers() {
    const items = [];
    let lastKey;
    do {
        const res = await db.ddb.send(new db.ScanCommand({
            TableName: db.SUBSCRIBER_TABLE,
            ...(lastKey && { ExclusiveStartKey: lastKey })
        }));
        items.push(...(res.Items || []));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items.filter(s => s.active !== false);
}

// Customers who have actually ordered, for offers aimed at existing regulars
async function orderingEmails(days) {
    const to = db.istDate();
    const from = db.istDate(new Date(Date.now() - days * 86400000));
    const orders = await db.ordersForRange(from, to);
    return new Set(orders.map(o => o.email).filter(Boolean));
}

const AUDIENCES = {
    all: { label: 'Everyone who allowed notifications' },
    customers: { label: 'People who ordered in the last year' },
    recent: { label: 'Ordered in the last 30 days' }
};

async function audienceFor(audience) {
    const subscribers = await allSubscribers();
    if (audience === 'customers') {
        const emails = await orderingEmails(365);
        return subscribers.filter(s => s.email && emails.has(s.email));
    }
    if (audience === 'recent') {
        const emails = await orderingEmails(30);
        return subscribers.filter(s => s.email && emails.has(s.email));
    }
    return subscribers;
}

async function counts() {
    const subscribers = await allSubscribers();
    const [everCustomers, recentCustomers] = await Promise.all([
        orderingEmails(365), orderingEmails(30)
    ]);
    return {
        all: subscribers.length,
        customers: subscribers.filter(s => s.email && everCustomers.has(s.email)).length,
        recent: subscribers.filter(s => s.email && recentCustomers.has(s.email)).length,
        web: subscribers.filter(s => s.platform === 'web').length,
        android: subscribers.filter(s => s.platform === 'android').length
    };
}

async function history() {
    const res = await db.ddb.send(new db.GetCommand({
        TableName: db.CONFIG_TABLE, Key: { configId: HISTORY_KEY }
    }));
    return (res.Item && res.Item.sent) || [];
}

async function recordSend(entry) {
    const past = await history();
    const updated = [entry, ...past].slice(0, HISTORY_LIMIT);
    await db.ddb.send(new db.PutCommand({
        TableName: db.CONFIG_TABLE,
        Item: { configId: HISTORY_KEY, sent: updated, updatedAt: db.nowIso() }
    }));
}

// Runs in the background invocation. Not reached by any HTTP route.
async function runBroadcastTask(task) {
    const targets = await audienceFor(task.audience);
    const result = await push.sendBroadcast(targets, task.title, task.body, {
        type: 'offer', url: task.url || 'order.html'
    });

    await Promise.all(((result && result.dead) || []).map(id => db.ddb.send(new db.DeleteCommand({
        TableName: db.SUBSCRIBER_TABLE, Key: { subscriberId: id }
    }))));

    await updateHistoryEntry(task.entryId, {
        delivered: (result && result.sent) || 0,
        removed: ((result && result.dead) || []).length,
        status: result && result.ok ? 'sent' : 'failed',
        finishedAt: db.nowIso()
    });

    return result;
}

async function updateHistoryEntry(entryId, patch) {
    const past = await history();
    const updated = past.map(e => (e.entryId === entryId ? { ...e, ...patch } : e));
    await db.ddb.send(new db.PutCommand({
        TableName: db.CONFIG_TABLE,
        Item: { configId: HISTORY_KEY, sent: updated, updatedAt: db.nowIso() }
    }));
}

async function send(body, sentBy) {
    const title = String(body.title || '').trim();
    const message = String(body.body || '').trim();
    const audience = AUDIENCES[body.audience] ? body.audience : 'all';

    if (!title) return { ok: false, code: 400, error: 'Give the notification a title' };
    if (!message) return { ok: false, code: 400, error: 'Write a message' };
    if (title.length > 60) return { ok: false, code: 400, error: 'Title must be under 60 characters' };
    if (message.length > 180) return { ok: false, code: 400, error: 'Message must be under 180 characters' };

    const targets = await audienceFor(audience);
    if (!targets.length) {
        return {
            ok: false, code: 400,
            error: 'Nobody in that group has allowed notifications yet'
        };
    }

    const entryId = crypto.randomBytes(8).toString('hex');
    const entry = {
        entryId,
        title, body: message, audience,
        audienceLabel: AUDIENCES[audience].label,
        sentTo: targets.length,
        delivered: 0,
        removed: 0,
        status: 'sending',
        sentBy,
        at: db.nowIso()
    };

    // Big audiences: record it, hand off, and answer immediately. Holding the
    // admin's request open for ten minutes would simply time out.
    if (targets.length > SYNC_LIMIT) {
        await recordSend(entry);
        await handOff({
            __task: 'broadcast',
            entryId, title, body: message, audience, url: body.url
        });
        return {
            ok: true, ...entry,
            queued: true,
            message: `Sending to ${targets.length} phones in the background.`
        };
    }

    const result = await push.sendBroadcast(targets, title, message, {
        type: 'offer',
        url: body.url || 'order.html'
    });

    if (!result.ok) return result;

    // Tokens FCM rejected as gone — drop them so the count stays honest
    await Promise.all((result.dead || []).map(id => db.ddb.send(new db.DeleteCommand({
        TableName: db.SUBSCRIBER_TABLE, Key: { subscriberId: id }
    }))));

    entry.delivered = result.sent;
    entry.removed = (result.dead || []).length;
    entry.status = 'sent';
    await recordSend(entry);

    return { ok: true, ...entry };
}

async function handOff(payload) {
    // Required here rather than at the top so ordinary requests never load it
    const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
    const client = new LambdaClient({ region: process.env.AWS_REGION || 'ap-south-1' });
    await client.send(new InvokeCommand({
        FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
        InvocationType: 'Event',           // fire and forget
        Payload: Buffer.from(JSON.stringify(payload))
    }));
}

module.exports = {
    subscribe, unsubscribe, send, counts, history, runBroadcastTask, AUDIENCES, SYNC_LIMIT
};
