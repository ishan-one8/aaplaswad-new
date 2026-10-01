const db = require('./db');
const fs = require('fs');
const path = require('path');

async function run() {
    const res = await db.ddb.send(new db.GetCommand({ TableName: db.CONFIG_TABLE, Key: { configId: 'menu' } }));
    const menu = res.Item ? res.Item.items : {};

    // ── Read the canonical menu from order.js ──
    // This is the single source of truth: every item the customer app shows
    // must exist in DynamoDB for orders to go through and for the admin panel
    // to display them.
    const orderJsPath = path.join(__dirname, '..', 'order.js');
    const source = fs.readFileSync(orderJsPath, 'utf8');
    const match = source.match(/const FALLBACK_MENU = (\{[\s\S]*?\n\});/);
    if (!match) {
        console.error('Could not find FALLBACK_MENU in order.js');
        process.exit(1);
    }
    const FALLBACK_MENU = eval('(' + match[1] + ')');

    let added = 0, updated = 0;
    let order = 0;

    // First, set sortOrder based on existing items to maintain admin ordering
    const existingKeys = Object.keys(menu);
    if (existingKeys.length) {
        order = Math.max(...existingKeys.map(k => menu[k].sortOrder || 0)) + 1;
    }

    for (const [key, item] of Object.entries(FALLBACK_MENU)) {
        if (!menu[key]) {
            // Brand-new item: full entry with availability defaults
            menu[key] = {
                ...item,
                available: true,
                extrasAvailable: Object.fromEntries(
                    Object.keys(item.extras || {}).map(k => [k, true])
                ),
                sortOrder: order++
            };
            console.log(`✅ ADDED  ${key}: ${item.name} — ₹${item.price}`);
            added++;
        } else {
            // Existing item: sync price and metadata, but preserve admin overrides
            // for availability and sortOrder
            const existing = menu[key];
            menu[key] = {
                ...item,                              // all fields from FALLBACK_MENU
                available: existing.available !== undefined ? existing.available : true,
                extrasAvailable: existing.extrasAvailable || Object.fromEntries(
                    Object.keys(item.extras || {}).map(k => [k, true])
                ),
                sortOrder: existing.sortOrder !== undefined ? existing.sortOrder : order++
            };
            console.log(`🔄 SYNCED ${key}: ${item.name} — ₹${item.price}`);
            updated++;
        }
    }

    await db.ddb.send(new db.PutCommand({
        TableName: db.CONFIG_TABLE,
        Item: { configId: 'menu', items: menu, updatedAt: new Date().toISOString() }
    }));

    console.log(`\n🎉 Menu sync complete: ${added} added, ${updated} updated, ${Object.keys(menu).length} total items`);
}

run().catch(console.error);
