// === Phase 0 tests — PIN hashing and token signing ===
// Run with:  node backend/test/auth.test.js

process.env.TOKEN_SECRET = process.env.TOKEN_SECRET || 'test-secret-abc';

const a = require('../auth');

let pass = 0, fail = 0;
const t = (name, cond) => {
    if (cond) { pass++; console.log('  ok   ' + name); }
    else { fail++; console.log('  FAIL ' + name); }
};

// ── PIN hashing ──
const { hash, salt } = a.hashPin('143913');
t('correct PIN verifies', a.verifyPin('143913', hash, salt));
t('wrong PIN rejected', !a.verifyPin('143914', hash, salt));
t('empty PIN rejected', !a.verifyPin('', hash, salt));
t('missing hash rejected', !a.verifyPin('143913', null, salt));
t('same PIN with a fresh salt gives a different hash', a.hashPin('143913').hash !== hash);
t('stored hash does not contain the PIN', !hash.includes('143913'));

// ── Tokens ──
const token = a.signStaffToken({ staffId: 'admin-1', role: 'admin', name: 'Owner', phone: '788' });
const payload = a.verifyToken(token);
t('valid staff token verifies', payload && payload.role === 'admin' && payload.kind === 'staff');
t('tampered payload rejected',
    !a.verifyToken(token.split('.')[0] + '.eyJyb2xlIjoiYWRtaW4ifQ.' + token.split('.')[2]));
t('tampered signature rejected', !a.verifyToken(token.slice(0, -3) + 'xyz'));
t('malformed token rejected', !a.verifyToken('not-a-token'));
t('null token rejected', !a.verifyToken(null));
t('expired token rejected', !a.verifyToken(a.signToken({ role: 'admin' }, -10)));

const customerToken = a.signCustomerToken('ravi@example.com', 'Ravi');
const customerPayload = a.verifyToken(customerToken);
t('customer token carries the email', customerPayload.email === 'ravi@example.com');
t('customer token is not a staff role', customerPayload.role === 'customer');

// A token signed with a different secret must not verify
const realSecret = process.env.TOKEN_SECRET;
process.env.TOKEN_SECRET = 'different-secret';
t('token signed with another secret is rejected', !a.verifyToken(token));
process.env.TOKEN_SECRET = realSecret;

// ── Bearer extraction ──
t('bearer header parsed', a.extractBearer({ headers: { authorization: 'Bearer abc' } }) === 'abc');
t('capitalised header parsed', a.extractBearer({ headers: { Authorization: 'bearer abc' } }) === 'abc');
t('missing header returns null', a.extractBearer({ headers: {} }) === null);
t('non-bearer scheme returns null', a.extractBearer({ headers: { authorization: 'Basic abc' } }) === null);

// ── Google ID token ──
(async () => {
    t('bogus Google token rejected', (await a.verifyGoogleIdToken('a.b.c', 'cid')) === null);
    t('null Google token rejected', (await a.verifyGoogleIdToken(null, 'cid')) === null);

    console.log('\n' + pass + ' passed, ' + fail + ' failed');
    process.exit(fail ? 1 : 0);
})();
