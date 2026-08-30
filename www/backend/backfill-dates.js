#!/usr/bin/env node
// Reads a DynamoDB scan result on stdin and prints "orderId<TAB>orderDate" for
// every order still missing an orderDate, so deploy.sh can patch them. Existing
// orders need this or they fall outside the reports index entirely.

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const data = JSON.parse(input || '{"Items":[]}');
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

    for (const item of (data.Items || [])) {
        if (item.orderDate && item.orderDate.S) continue;

        const createdAt = item.createdAt && item.createdAt.S;
        if (!createdAt) continue;

        const orderDate = new Date(new Date(createdAt).getTime() + IST_OFFSET_MS)
            .toISOString().slice(0, 10);

        process.stdout.write(`${item.orderId.S}\t${orderDate}\n`);
    }
});
