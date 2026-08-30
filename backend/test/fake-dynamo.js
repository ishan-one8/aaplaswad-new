// In-memory stand-in for DynamoDB, good enough to exercise the handlers:
// applies SET/REMOVE update expressions and evaluates the condition used by
// the delivery claim, so the "two partners, one order" race is really tested.

const Module = require('module');

const cmd = (name) => class { constructor(input) { this.name = name; this.input = input; } };

const state = {
    tables: {},          // { tableName: { key: item } }
    calls: [],
    keyOf: {}            // { tableName: 'orderId' | 'staffId' | 'configId' }
};

function keyName(table) {
    return state.keyOf[table] || 'id';
}

function tableOf(name) {
    if (!state.tables[name]) state.tables[name] = {};
    return state.tables[name];
}

function itemKey(table, keyObj) {
    return String(keyObj[keyName(table)]);
}

// Applies "SET a = :v, #n = :w REMOVE x" to an item
function applyUpdate(item, input) {
    const names = input.ExpressionAttributeNames || {};
    const values = input.ExpressionAttributeValues || {};
    const expr = input.UpdateExpression || '';

    const [setPart, removePart] = expr.split(/\s+REMOVE\s+/i);

    const setClause = (setPart || '').replace(/^\s*SET\s+/i, '').trim();
    if (setClause) {
        // Split on commas that separate assignments
        for (const assignment of setClause.split(/,\s*(?=[#\w]+\s*=)/)) {
            const [rawKey, rawValue] = assignment.split('=').map(s => s.trim());
            if (!rawKey || rawValue === undefined) continue;
            const key = names[rawKey] || rawKey;
            item[key] = values[rawValue];
        }
    }

    if (removePart) {
        for (const raw of removePart.split(',')) {
            const key = names[raw.trim()] || raw.trim();
            delete item[key];
        }
    }
    return item;
}

function conditionHolds(item, input) {
    const condition = input.ConditionExpression;
    if (!condition) return true;
    const values = input.ExpressionAttributeValues || {};

    // Every attribute_not_exists(x) in the expression, checked generically —
    // a hand-listed set silently passes conditions it has not heard of, which
    // is how a replay guard can look tested while doing nothing.
    for (const match of condition.matchAll(/attribute_not_exists\((\w+)\)/g)) {
        const attribute = match[1];
        const present = item && item[attribute] !== undefined && item[attribute] !== null;
        if (present) return false;
    }

    if (condition.includes('IN')) {
        const allowed = Object.keys(values)
            .filter(k => /^:s\d+$/.test(k))
            .map(k => values[k]);
        if (allowed.length && !allowed.includes(item && item.status)) return false;
    }
    return true;
}

function conditionalFailure() {
    const err = new Error('The conditional request failed');
    err.name = 'ConditionalCheckFailedException';
    return err;
}

// Supports the one filter shape the handler actually uses
function matchesFilter(item, input) {
    const filter = input.FilterExpression;
    if (!filter) return true;
    const values = input.ExpressionAttributeValues || {};
    if (filter.includes('email = :email')) return item.email === values[':email'];
    if (filter.includes('phone = :p')) return item.phone === values[':p'];
    return true;
}

const stubLib = {
    PutCommand: cmd('Put'),
    ScanCommand: cmd('Scan'),
    GetCommand: cmd('Get'),
    UpdateCommand: cmd('Update'),
    QueryCommand: cmd('Query'),
    DeleteCommand: cmd('Delete'),
    __state: state
};

stubLib.DynamoDBDocumentClient = {
    from: () => ({
        async send(command) {
            const input = command.input;
            const table = tableOf(input.TableName);
            state.calls.push({ name: command.name, input });

            switch (command.name) {
                case 'Get':
                    return { Item: table[itemKey(input.TableName, input.Key)] };

                case 'Put': {
                    const key = itemKey(input.TableName, input.Item);
                    if (!conditionHolds(table[key], input)) throw conditionalFailure();
                    table[key] = JSON.parse(JSON.stringify(input.Item));
                    return {};
                }

                case 'Update': {
                    const key = itemKey(input.TableName, input.Key);
                    const existing = table[key];
                    if (!conditionHolds(existing, input)) throw conditionalFailure();
                    const item = existing || { ...input.Key };
                    table[key] = applyUpdate({ ...item }, input);
                    return {};
                }

                case 'Delete':
                    delete table[itemKey(input.TableName, input.Key)];
                    return {};

                case 'Scan':
                    return { Items: Object.values(table).filter(i => matchesFilter(i, input)) };

                case 'Query': {
                    const values = input.ExpressionAttributeValues || {};
                    let items = Object.values(table);

                    if (values[':d'] !== undefined) {
                        items = items.filter(i => i.orderDate === values[':d']);
                    }
                    if (values[':e'] !== undefined) {
                        items = items.filter(i => i.email === values[':e']);
                    }
                    if (input.ScanIndexForward === false) {
                        items = items.slice().reverse();
                    }
                    if (input.Limit) items = items.slice(0, input.Limit);

                    return { Items: items };
                }

                default:
                    return {};
            }
        }
    })
};

const stubClient = { DynamoDBClient: class { constructor(config) { this.config = config; } } };

// Background broadcasts invoke the function again through the Lambda API;
// the fake records the call instead of hitting AWS.
const stubLambda = {
    LambdaClient: class { async send(command) { state.invocations.push(command.input); return {}; } },
    InvokeCommand: class { constructor(input) { this.input = input; } }
};
state.invocations = [];

// Intercept the SDK before the handler requires it
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
    if (request === '@aws-sdk/lib-dynamodb') return stubLib;
    if (request === '@aws-sdk/client-dynamodb') return stubClient;
    if (request === '@aws-sdk/client-lambda') return stubLambda;
    return originalLoad.call(this, request, ...rest);
};

function reset({ orders = {}, staff = {}, config = {} } = {}) {
    state.keyOf = {
        orders: 'orderId', staff: 'staffId', config: 'configId',
        subscribers: 'subscriberId', customers: 'email'
    };
    state.tables = {
        orders: JSON.parse(JSON.stringify(orders)),
        staff: JSON.parse(JSON.stringify(staff)),
        config: JSON.parse(JSON.stringify(config)),
        subscribers: {},
        customers: {}
    };
    state.calls = [];
    state.invocations = [];
}

module.exports = { stubLib, reset, state, tableOf };
