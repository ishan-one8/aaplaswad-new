const db = require('./db');

async function run() {
    const res = await db.ddb.send(new db.GetCommand({ TableName: db.CONFIG_TABLE, Key: { configId: 'menu' } }));
    const menu = res.Item ? res.Item.items : {};
    
    // Sync all prices to match the frontend
    const correctPrices = {
        'dal-bati':          { price: 80,  oldPrice: 150, discount: '47% OFF', name: 'Normal Dal Batti', shortName: 'Dal Batti' },
        'zunka-bhakar':      { price: 117, oldPrice: 250, discount: '53% OFF', name: 'Zunka Bhakar Thali', shortName: 'Zunka Bhakar' },
        'bharit-bhakar':     { price: 121, oldPrice: 200, discount: '40% OFF', name: 'Bharit Bhakar Thali', shortName: 'Bharit Bhakar' },
        'bombil-thali':      { price: 130, oldPrice: 350, discount: '63% OFF', name: 'Bombil Thali', shortName: 'Bombil' },
        'zinga-thali':       { price: 1,   oldPrice: 125, discount: 'TEST',    name: 'Zinga Thali', shortName: 'Zinga' },
        'chicken-thali':     { price: 151, oldPrice: 350, discount: '57% OFF', name: 'Chicken Thali', shortName: 'Chicken' },
        'special-dal-batti': { price: 120, oldPrice: 220, discount: '45% OFF', name: 'Special Dal Batti Thali', shortName: 'Spl Dal Batti' },
        'rice-plate':        { price: 130, oldPrice: 220, discount: '41% OFF', name: 'Rice Plate', shortName: 'Rice Plate', available: true },
        // Shriyan Chinese
        'veg-manchurian-dry':       { price: 119, oldPrice: 180, discount: '34% OFF', name: 'Veg Manchurian Dry', shortName: 'Manchurian Dry' },
        'paneer-kentucky':          { price: 154, oldPrice: 220, discount: '30% OFF', name: 'Paneer Kentucky', shortName: 'Paneer Kentucky' },
        'paneer-chilli':            { price: 155, oldPrice: 230, discount: '33% OFF', name: 'Paneer Chilli', shortName: 'Paneer Chilli' },
        'veg-fried-rice':           { price: 113, oldPrice: 170, discount: '34% OFF', name: 'Veg Fried Rice', shortName: 'Fried Rice' },
        'veg-manchurian-rice':      { price: 121, oldPrice: 180, discount: '33% OFF', name: 'Veg Manchurian Rice', shortName: 'Manchurian Rice' },
        'veg-schezwan-rice':        { price: 129, oldPrice: 190, discount: '32% OFF', name: 'Veg Schezwan Rice', shortName: 'Schezwan Rice' },
        'veg-paneer-rice':          { price: 159, oldPrice: 230, discount: '31% OFF', name: 'Veg Paneer Rice', shortName: 'Paneer Rice' },
        'veg-schezwan-paneer-rice': { price: 149, oldPrice: 220, discount: '32% OFF', name: 'Veg Schezwan Paneer Rice', shortName: 'Schezwan Paneer Rice' },
        'veg-noodles':              { price: 109, oldPrice: 170, discount: '36% OFF', name: 'Veg Noodles', shortName: 'Veg Noodles' },
        'veg-manchurian-noodles':   { price: 119, oldPrice: 180, discount: '34% OFF', name: 'Veg Manchurian Noodles', shortName: 'Manchurian Noodles' },
        'veg-hakka-noodles':        { price: 122, oldPrice: 180, discount: '32% OFF', name: 'Veg Hakka Noodles', shortName: 'Hakka Noodles' },
        'veg-schezwan-noodles':     { price: 139, oldPrice: 200, discount: '31% OFF', name: 'Veg Schezwan Noodles', shortName: 'Schezwan Noodles' },
        'veg-paneer-noodles':       { price: 158, oldPrice: 230, discount: '31% OFF', name: 'Veg Paneer Noodles', shortName: 'Paneer Noodles' },
        // Mauli Veg Rol (2 pcs each)
        'aloo-roll':                    { price: 88,  oldPrice: 140, discount: '37% OFF', name: 'Aloo Roll (2 pcs)', shortName: 'Aloo Roll' },
        'soya-bean-masala-roll':        { price: 115, oldPrice: 170, discount: '32% OFF', name: 'Soya Bean Masala Roll (2 pcs)', shortName: 'Soya Roll' },
        'noodles-roll':                 { price: 116, oldPrice: 170, discount: '32% OFF', name: 'Noodles Roll (2 pcs)', shortName: 'Noodles Roll' },
        'manchurian-roll':              { price: 119, oldPrice: 180, discount: '34% OFF', name: 'Manchurian Roll (2 pcs)', shortName: 'Manchurian Roll' },
        'mix-veg-roll':                 { price: 119, oldPrice: 180, discount: '34% OFF', name: 'Mix Veg Roll (2 pcs)', shortName: 'Mix Veg Roll' },
        'paneer-roll':                  { price: 144, oldPrice: 210, discount: '31% OFF', name: 'Paneer Roll (2 pcs)', shortName: 'Paneer Roll' },
        'cheese-roll':                  { price: 144, oldPrice: 210, discount: '31% OFF', name: 'Cheese Roll (2 pcs)', shortName: 'Cheese Roll' },
        'aloo-noodles-mix-roll':        { price: 119, oldPrice: 180, discount: '34% OFF', name: 'Aloo Noodles Mix Roll (2 pcs)', shortName: 'Aloo Noodles Roll' },
        'soya-bean-noodles-mix-roll':   { price: 121, oldPrice: 180, discount: '33% OFF', name: 'Soya Bean Noodles Mix Roll (2 pcs)', shortName: 'Soya Noodles Roll' },
        'mix-veg-noodles-roll':         { price: 125, oldPrice: 180, discount: '31% OFF', name: 'Mix Veg Noodles Roll (2 pcs)', shortName: 'Veg Noodles Roll' },
        'noodles-manchurian-mix-roll':  { price: 139, oldPrice: 200, discount: '31% OFF', name: 'Noodles Manchurian Mix Roll (2 pcs)', shortName: 'Noodles Manchurian Roll' },
        'paneer-noodles-mix-roll':      { price: 144, oldPrice: 210, discount: '31% OFF', name: 'Paneer Noodles Mix Roll (2 pcs)', shortName: 'Paneer Noodles Roll' }
    };

    Object.keys(correctPrices).forEach(key => {
        if (!menu[key]) menu[key] = {};
        Object.assign(menu[key], correctPrices[key]);
        console.log(`✅ ${key}: ₹${correctPrices[key].price}`);
    });

    await db.ddb.send(new db.UpdateCommand({
        TableName: db.CONFIG_TABLE,
        Key: { configId: 'menu' },
        UpdateExpression: 'SET #v = :val',
        ExpressionAttributeNames: { '#v': 'items' },
        ExpressionAttributeValues: { ':val': menu }
    }));
    console.log("\n🎉 All menu prices updated!");
}

run().catch(console.error);
