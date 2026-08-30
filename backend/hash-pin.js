#!/usr/bin/env node
// Prints a PBKDF2 hash + salt for a PIN, so deploy.sh can seed a staff account
// without ever storing the PIN itself.
//
//   node hash-pin.js 143913
//   → {"hash":"...","salt":"..."}

const { hashPin } = require('./auth');

const pin = process.argv[2];

if (!pin || !/^\d{4,8}$/.test(pin)) {
    console.error('Usage: node hash-pin.js <4-8 digit PIN>');
    process.exit(1);
}

console.log(JSON.stringify(hashPin(pin)));
