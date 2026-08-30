// === SAI PRASAD — Shared DynamoDB access ===

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocumentClient, PutCommand, ScanCommand, GetCommand,
    UpdateCommand, QueryCommand, DeleteCommand
} = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'ap-south-1';

const TABLE = process.env.TABLE_NAME || 'sai_prasad_orders';
const STAFF_TABLE = process.env.STAFF_TABLE || 'sai_prasad_staff';
const CONFIG_TABLE = process.env.CONFIG_TABLE || 'sai_prasad_config';
const SUBSCRIBER_TABLE = process.env.SUBSCRIBER_TABLE || 'sai_prasad_subscribers';
const CUSTOMER_TABLE = process.env.CUSTOMER_TABLE || 'sai_prasad_customers';
const DATE_INDEX = 'date-index';
const EMAIL_INDEX = 'email-index';

const client = new DynamoDBClient({ region: REGION });
const ddb = DynamoDBDocumentClient.from(client);

// ── Time helpers (the business runs on IST) ──

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function nowIso() {
    return new Date().toISOString();
}

// 'YYYY-MM-DD' for the given instant, in IST
function istDate(date) {
    return new Date((date || new Date()).getTime() + IST_OFFSET_MS)
        .toISOString().slice(0, 10);
}

// Minutes since IST midnight — used for opening-hours checks
function istMinutes(date) {
    const shifted = new Date((date || new Date()).getTime() + IST_OFFSET_MS);
    return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

function istWeekday(date) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const shifted = new Date((date || new Date()).getTime() + IST_OFFSET_MS);
    return days[shifted.getUTCDay()];
}

// Inclusive list of 'YYYY-MM-DD' between two dates. The cap stops one request
// fanning out into thousands of queries; when it bites we say so in the logs
// and the caller reports the range it actually covered, because a report that
// silently drops nine months of data is worse than one that refuses.
const MAX_RANGE_DAYS = 400;

function dateRange(from, to, maxDays = MAX_RANGE_DAYS) {
    const out = [];
    let cursor = new Date(from + 'T00:00:00Z');
    const end = new Date(to + 'T00:00:00Z');
    while (cursor <= end && out.length < maxDays) {
        out.push(cursor.toISOString().slice(0, 10));
        cursor = new Date(cursor.getTime() + 86400000);
    }
    if (cursor <= end) {
        console.warn('DATE_RANGE_TRUNCATED', JSON.stringify({
            from, to, covered: out.length, cap: maxDays
        }));
    }
    return out;
}

// ── Query helpers ──

// All orders for one IST date, via the reports index
async function ordersForDate(orderDate) {
    const items = [];
    let lastKey;
    do {
        const res = await ddb.send(new QueryCommand({
            TableName: TABLE,
            IndexName: DATE_INDEX,
            KeyConditionExpression: 'orderDate = :d',
            ExpressionAttributeValues: { ':d': orderDate },
            ...(lastKey && { ExclusiveStartKey: lastKey })
        }));
        items.push(...(res.Items || []));
        lastKey = res.LastEvaluatedKey;
    } while (lastKey);
    return items;
}

async function ordersForRange(from, to) {
    const dates = dateRange(from, to);

    // A year of queries at once would open 400 connections; go in waves.
    const results = [];
    const WAVE = 20;
    for (let i = 0; i < dates.length; i += WAVE) {
        const wave = await Promise.all(dates.slice(i, i + WAVE).map(d => ordersForDate(d)));
        results.push(...wave);
    }

    const orders = results.flat();
    orders.coveredDays = dates.length;
    return orders;
}

// Orders still moving through the kitchen — today plus yesterday, since a late
// order placed at 11:50 PM is still active after midnight.
const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way'];

async function activeOrders() {
    const today = istDate();
    const yesterday = istDate(new Date(Date.now() - 86400000));
    const [a, b] = await Promise.all([ordersForDate(yesterday), ordersForDate(today)]);
    return [...a, ...b]
        .filter(o => ACTIVE_STATUSES.includes(o.status))
        .sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt));
}

// A customer's own order history. Scanning the table for this got slower and
// more expensive with every order the business ever took.
async function ordersForEmail(email, limit = 50) {
    const res = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: EMAIL_INDEX,
        KeyConditionExpression: 'email = :e',
        ExpressionAttributeValues: { ':e': email },
        ScanIndexForward: false,      // newest first
        Limit: limit
    }));
    return res.Items || [];
}

async function getOrder(orderId) {
    const res = await ddb.send(new GetCommand({ TableName: TABLE, Key: { orderId } }));
    return res.Item || null;
}

async function getStaff(staffId) {
    const res = await ddb.send(new GetCommand({ TableName: STAFF_TABLE, Key: { staffId } }));
    return res.Item || null;
}

async function allStaff() {
    const res = await ddb.send(new ScanCommand({ TableName: STAFF_TABLE }));
    return res.Items || [];
}

module.exports = {
    ddb, PutCommand, ScanCommand, GetCommand, UpdateCommand, QueryCommand, DeleteCommand,
    TABLE, STAFF_TABLE, CONFIG_TABLE, SUBSCRIBER_TABLE, CUSTOMER_TABLE, DATE_INDEX, EMAIL_INDEX,
    nowIso, istDate, istMinutes, istWeekday, dateRange, MAX_RANGE_DAYS,
    ordersForDate, ordersForRange, ordersForEmail, activeOrders, getOrder, getStaff, allStaff,
    ACTIVE_STATUSES
};
