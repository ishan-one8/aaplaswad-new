#!/usr/bin/env node
// Extracts the MENU object out of order.js and writes DynamoDB-format JSON for
// the initial config rows, so the live menu starts as an exact copy of what
// customers see today. Run by deploy.sh; safe to run again (the put uses a
// condition so it never overwrites the admin's later edits).
//
//   node seed-config.js /tmp/out
//   → /tmp/out-menu.json, /tmp/out-shop.json

const fs = require('fs');
const path = require('path');
const { DEFAULT_SHOP } = require('./defaults');

const out = process.argv[2] || '/tmp/sai-prasad-config';
const orderJsPath = path.join(__dirname, '..', 'order.js');

const source = fs.readFileSync(orderJsPath, 'utf8');
const match = source.match(/const FALLBACK_MENU = (\{[\s\S]*?\n\});/);
if (!match) {
    console.error('Could not find the MENU object in order.js');
    process.exit(1);
}

// The literal is plain data, so evaluating it is how we avoid transcribing
// seven items (and their extras) by hand and getting a price wrong.
const MENU = eval('(' + match[1] + ')');

let order = 0;
const items = {};
for (const [key, item] of Object.entries(MENU)) {
    items[key] = {
        ...item,
        available: true,
        extrasAvailable: Object.fromEntries(
            Object.keys(item.extras || {}).map(k => [k, true])
        ),
        sortOrder: order++
    };
}

// ── DynamoDB wire format ──
function marshal(value) {
    if (value === null || value === undefined) return { NULL: true };
    if (typeof value === 'string') return { S: value };
    if (typeof value === 'number') return { N: String(value) };
    if (typeof value === 'boolean') return { BOOL: value };
    if (Array.isArray(value)) return { L: value.map(marshal) };
    if (typeof value === 'object') {
        return { M: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, marshal(v)])) };
    }
    throw new Error('Cannot marshal ' + typeof value);
}

const menuItem = marshal({ configId: 'menu', items, updatedAt: new Date().toISOString() }).M;
const shopItem = marshal({ ...DEFAULT_SHOP, updatedAt: new Date().toISOString() }).M;

fs.writeFileSync(out + '-menu.json', JSON.stringify(menuItem));
fs.writeFileSync(out + '-shop.json', JSON.stringify(shopItem));

console.log(`${Object.keys(items).length} menu items → ${out}-menu.json`);
console.log(`shop defaults → ${out}-shop.json`);
