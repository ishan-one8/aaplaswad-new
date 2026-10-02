/* ============================================
   SAI PRASAD STAFF — Admin · Kitchen · Delivery
   One app, three roles. Nothing here is shared
   with the customer app.
   ============================================ */

// Moving to another domain later means changing this one line.
const API_URL = 'https://f37z1y2xbg.execute-api.ap-south-1.amazonaws.com';

const POLL_MS = 5000;
const LATE_ORDER_MINUTES = 25;

// Storage keys are prefixed so a staff session can never collide with a
// customer session if both are ever open on the same domain.
const TOKEN_KEY = 'sp_staff_token';
const ME_KEY = 'sp_staff_me';

let me = JSON.parse(localStorage.getItem(ME_KEY) || 'null');
let token = localStorage.getItem(TOKEN_KEY) || '';
let currentView = '';
let pollTimer = null;

let state = {
    orders: [], menu: {}, config: {}, staff: [],
    kitchen: { counts: {}, prepTotals: [], orders: [] },
    available: [], mine: [], earnings: {}, report: null,
    reportRange: 'today'
};

let seenOrderIds = new Set();
let charts = {};

// ── Helpers ──

const $ = (id) => document.getElementById(id);
const money = (n) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function todayIst() {
    return new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
}
function daysAgoIst(n) {
    return new Date(Date.now() + 5.5 * 3600000 - n * 86400000).toISOString().slice(0, 10);
}

function toast(message, kind) {
    const el = $('toast');
    el.textContent = message;
    el.className = 'toast show ' + (kind || '');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => { el.className = 'toast ' + (kind || ''); }, 2600);
}

// ── API ──

// Network failures must NEVER trigger a logout. Only a confirmed 401 from the
// server means the token is dead. Even then, require several consecutive 401s
// so a single Lambda cold-start timeout doesn't kick a busy cook off the app.
let consecutive401s = 0;
const MAX_401_BEFORE_LOGOUT = 3;

async function api(path, options = {}) {
    let res;
    try {
        res = await fetch(API_URL + path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(options.headers || {})
            }
        });
    } catch (networkErr) {
        // Offline, DNS failure, CORS preflight blocked, timeout — NOT a logout
        const error = new Error('Network error — check your connection');
        error.status = 0;
        error.isNetwork = true;
        throw error;
    }

    if (res.status === 401 && token) {
        consecutive401s++;
        if (consecutive401s >= MAX_401_BEFORE_LOGOUT) {
            // Multiple consecutive 401s — token is truly dead
            logout('Your session ended. Please log in again.');
            throw new Error('Unauthorised');
        }
        // Single 401 — might be a transient issue, don't logout yet
        const error = new Error('Authentication failed');
        error.status = 401;
        throw error;
    }

    // Any successful response resets the 401 counter
    if (res.ok) consecutive401s = 0;

    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) {
        const error = new Error(data.error || `Request failed (${res.status})`);
        error.status = res.status;
        throw error;
    }

    // Auto-renew: if the server sent a fresh token, save it
    if (data.token && data.token !== token) {
        token = data.token;
        localStorage.setItem(TOKEN_KEY, token);
    }

    return data;
}

// ── Alerts: sound, vibration, notification ──

// Pre-load the alert sound file. Works reliably in Android WebView
// unlike AudioContext and SpeechSynthesis which are blocked.
let alertAudio = null;
let audioUnlocked = false;

function initAlertAudio() {
    if (alertAudio) return;
    alertAudio = new Audio('order-alert.wav');
    alertAudio.preload = 'auto';
    alertAudio.volume = 1.0;
    alertAudio.load();
}

// Must be called from a user gesture (e.g. login tap) to unlock audio
function unlockAudio() {
    if (audioUnlocked) return;
    initAlertAudio();
    // Play silent then immediately pause to unlock audio playback
    alertAudio.volume = 0.01;
    alertAudio.play().then(() => {
        alertAudio.pause();
        alertAudio.currentTime = 0;
        alertAudio.volume = 1.0;
        audioUnlocked = true;
        console.log('🔊 Audio unlocked');
    }).catch(() => {});
}

function playOrderAlert() {
    initAlertAudio();
    // Play the alert sound
    alertAudio.currentTime = 0;
    alertAudio.volume = 1.0;
    alertAudio.play().catch(e => console.warn('Audio play failed:', e));

    // Play it again after first finishes for extra attention
    setTimeout(() => {
        alertAudio.currentTime = 0;
        alertAudio.play().catch(() => {});
    }, 3200);

    // And a third time
    setTimeout(() => {
        alertAudio.currentTime = 0;
        alertAudio.play().catch(() => {});
    }, 6400);
}

async function notify(title, body) {
    playOrderAlert();
    if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300, 120, 300]);

    // Capacitor gives us a real Android notification when the app is
    // backgrounded; the browser build just falls back to sound + vibration.
    const plugin = window.Capacitor && window.Capacitor.Plugins &&
        window.Capacitor.Plugins.LocalNotifications;
    if (!plugin) return;

    try {
        const permission = await plugin.checkPermissions();
        if (permission.display !== 'granted') {
            const asked = await plugin.requestPermissions();
            if (asked.display !== 'granted') return;
        }
        await plugin.schedule({
            notifications: [{
                id: Math.floor(Math.random() * 100000),
                title, body,
                smallIcon: 'ic_launcher',
                sound: 'default',
                channelId: 'orders'
            }]
        });
    } catch (err) { /* notification failure must not break the queue */ }
}

// Fires when order IDs appear that we have not seen before
function alertOnNewOrders(orders, title, bodyFor) {
    const fresh = orders.filter(o => !seenOrderIds.has(o.orderId));
    orders.forEach(o => seenOrderIds.add(o.orderId));

    // First load just primes the set — no alarm for a backlog
    if (!alertOnNewOrders.primed) {
        alertOnNewOrders.primed = true;
        return [];
    }
    if (fresh.length) notify(title, bodyFor(fresh));
    return fresh;
}

// ── Push notifications ──
// Registers this phone with Firebase so orders can wake it even when the app
// is fully closed. Silently does nothing in a normal browser.

async function setupPush() {
    const plugins = window.Capacitor && window.Capacitor.Plugins;
    const push = plugins && plugins.PushNotifications;
    if (!push) return;

    try {
        let permission = await push.checkPermissions();
        if (permission.receive !== 'granted') {
            permission = await push.requestPermissions();
        }
        if (permission.receive !== 'granted') {
            toast('Turn on notifications to hear new orders', 'err');
            return;
        }

        // The token arrives asynchronously after register()
        push.addListener('registration', async (info) => {
            try {
                await api('/staff/device', {
                    method: 'POST', body: JSON.stringify({ fcmToken: info.value })
                });
            } catch (err) { /* retried on the next login */ }
        });

        push.addListener('registrationError', (err) => {
            console.warn('Push registration failed', err);
        });

        // Tapping a notification should land on the relevant screen
        push.addListener('pushNotificationActionPerformed', (action) => {
            const type = action.notification.data && action.notification.data.type;
            if (type === 'new_order') switchView(me.role === 'admin' ? 'kitchen' : 'kitchen');
            else if (type === 'order_available') switchView('available');
        });

        // Arriving while the app is open: refresh and sound the alarm
        push.addListener('pushNotificationReceived', () => {
            playOrderAlert();
            if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300, 120, 300]);
            refresh();
        });

        await push.register();
    } catch (err) {
        console.warn('Push setup failed', err);
    }
}

// ── Auth ──

async function doLogin() {
    unlockAudio(); // Unlock audio on first user gesture
    const phone = $('login-phone').value.replace(/\D/g, '');
    const pin = $('login-pin').value.trim();
    const button = $('login-btn');

    $('login-error').textContent = '';
    if (phone.length !== 10) { $('login-error').textContent = 'Enter your 10-digit phone number'; return; }
    if (!pin) { $('login-error').textContent = 'Enter your PIN'; return; }

    button.disabled = true;
    button.textContent = 'Logging in…';
    try {
        const data = await api('/staff/login', {
            method: 'POST', body: JSON.stringify({ phone, pin })
        });
        token = data.token;
        me = { staffId: data.staffId, role: data.role, name: data.name };
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(ME_KEY, JSON.stringify(me));
        startApp();
        if (data.mustChangePin) {
            toast('Please change your PIN from the last tab', 'ok');
        }
    } catch (err) {
        $('login-error').textContent = err.message;
    } finally {
        button.disabled = false;
        button.textContent = 'Log in';
    }
}

function logout(message) {
    token = '';
    me = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ME_KEY);
    clearInterval(pollTimer);
    seenOrderIds = new Set();
    alertOnNewOrders.primed = false;
    $('app').classList.add('hidden');
    $('loginScreen').classList.remove('hidden');
    $('login-pin').value = '';
    if (message) $('login-error').textContent = message;
}

async function changePin() {
    const currentPin = $('pin-current').value.trim();
    const newPin = $('pin-new').value.trim();
    if (!/^\d{4,8}$/.test(newPin)) { toast('New PIN must be 4-8 digits', 'err'); return; }
    try {
        await api('/staff/pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) });
        $('pin-current').value = '';
        $('pin-new').value = '';
        toast('PIN updated', 'ok');
    } catch (err) { toast(err.message, 'err'); }
}

// ── Navigation ──

const NAV = {
    admin: [
        { id: 'dash', icon: 'dash', label: 'Home', title: 'Dashboard' },
        { id: 'orders', icon: 'receipt', label: 'Orders', title: 'Orders' },
        { id: 'kitchen', icon: 'chef', label: 'Kitchen', title: 'Kitchen' },
        { id: 'menu', icon: 'utensils', label: 'Menu', title: 'Menu & prices' },
        { id: 'shop', icon: 'settings', label: 'Shop', title: 'Shop settings' },
        { id: 'staff', icon: 'team', label: 'Staff', title: 'Staff' },
        { id: 'users', icon: 'users', label: 'Users', title: 'App users' },
        { id: 'offers', icon: 'megaphone', label: 'Offers', title: 'Deals & offers' },
        { id: 'reports', icon: 'trend', label: 'Reports', title: 'Reports' }
    ],
    hotel: [
        { id: 'kitchen', icon: 'chef', label: 'Orders', title: 'Kitchen' }
    ],
    delivery: [
        { id: 'available', icon: 'package', label: 'Available', title: 'Available orders' },
        { id: 'mine', icon: 'bike', label: 'My drops', title: 'My deliveries' },
        { id: 'earnings', icon: 'wallet', label: 'Earnings', title: 'Today' }
    ]
};

function buildNav() {
    const items = NAV[me.role] || [];
    $('nav').innerHTML = items.map(item => `
        <button data-view="${item.id}" onclick="switchView('${item.id}')">
            <i data-ic="${item.icon}"></i><span>${item.label}</span>
        </button>`).join('');
    $('nav').classList.toggle('hidden', items.length < 2);
}

function switchView(id) {
    currentView = id;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const view = $('view-' + id);
    if (view) view.classList.add('active');

    document.querySelectorAll('.nav button').forEach(b =>
        b.classList.toggle('active', b.dataset.view === id));

    const item = (NAV[me.role] || []).find(n => n.id === id);
    $('topTitle').textContent = item ? item.title : '';
    window.scrollTo(0, 0);
    refresh();
}

// ── Boot ──

function startApp() {
    $('loginScreen').classList.add('hidden');
    $('app').classList.remove('hidden');
    $('topWho').textContent = `${me.name} · ${me.role}`;
    if ($('topAvatar')) $('topAvatar').textContent = String(me.name || '?').trim().charAt(0).toUpperCase();
    buildNav();
    switchView((NAV[me.role] || [{ id: 'dash' }])[0].id);
    setupPush();

    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
        if (document.visibilityState === 'visible') refresh();
    }, POLL_MS);
}

// ── Data refresh, per role and view ──

let refreshing = false;

async function refresh() {
    if (refreshing || !token) return;
    refreshing = true;
    try {
        if (me.role === 'admin') await refreshAdmin();
        else if (me.role === 'hotel') await refreshKitchen();
        else if (me.role === 'delivery') await refreshDelivery();
    } catch (err) {
        if (err.message !== 'Unauthorised') console.error(err);
    } finally {
        refreshing = false;
    }
}

async function refreshAdmin() {
    if (currentView === 'dash') {
        const [report, kitchen, status] = await Promise.all([
            api('/admin/reports'), api('/hotel/queue'), api('/shop-status')
        ]);
        state.report = report;
        state.kitchen = kitchen;
        renderShopPill(status);
        renderDashboard(report, kitchen);
    } else if (currentView === 'orders') {
        const data = await api('/admin/orders?from=' + daysAgoIst(2) + '&to=' + todayIst());
        state.orders = data.orders;
        renderOrders();
    } else if (currentView === 'kitchen') {
        await refreshKitchen();
    } else if (currentView === 'menu') {
        const data = await api('/admin/menu');
        state.menu = data.menu;
        renderMenu();
    } else if (currentView === 'shop') {
        if (!state.config.configId) {
            const data = await api('/admin/config');
            state.config = data.config;
            fillConfigForm();
        }
    } else if (currentView === 'staff') {
        const data = await api('/admin/staff');
        state.staff = data.staff;
        renderStaff();
    } else if (currentView === 'reports') {
        await loadReport();
    } else if (currentView === 'offers') {
        await loadBroadcasts();
    } else if (currentView === 'users') {
        await loadUsers();
    }
}

async function refreshKitchen() {
    const data = await api('/hotel/queue');
    state.kitchen = data;

    // Alert on new orders: pending (online) OR confirmed (COD just approved by admin)
    const incoming = data.orders.filter(o => o.status === 'pending' || o.status === 'confirmed');
    alertOnNewOrders(incoming, '🔔 New order',
        fresh => fresh.length === 1
            ? `${fresh[0].customerName} · ${money(fresh[0].total)}`
            : `${fresh.length} new orders`);

    renderKitchen(data);
}

async function refreshDelivery() {
    // Always check for new available orders to trigger sound alerts
    // even if not on the 'available' view
    const availData = await api('/delivery/available');
    const prevAvailable = state.available || [];
    state.available = availData.orders;
    alertOnNewOrders(availData.orders, '📦 Order available',
        fresh => fresh.length === 1
            ? `${fresh[0].customerName} · ${fresh[0].distanceKm ?? '?'} km · ${money(fresh[0].total)}`
            : `${fresh.length} orders waiting`);

    if (currentView === 'available') {
        renderAvailable();
    } else if (currentView === 'mine') {
        const data = await api('/delivery/mine');
        state.mine = data.orders;
        // Customers watch the rider move, so share position while carrying
        updateLocationSharing(data.orders.filter(o => o.status === 'picked_up').length);
        renderMine();
    } else if (currentView === 'earnings') {
        state.earnings = await api('/delivery/earnings');
        renderEarnings();
    }
}

// ══════════ ADMIN: dashboard ══════════

function renderShopPill(status) {
    const pill = $('shopPill');
    if (!status) { pill.textContent = ''; pill.className = 'pill'; return; }
    if (status.isOpen) { pill.textContent = 'OPEN'; pill.className = 'pill open'; }
    else { pill.textContent = status.paused ? 'PAUSED' : 'CLOSED'; pill.className = 'pill shut'; }
}

function renderDashboard(report, kitchen) {
    $('d-orders').textContent = report.totalOrders;
    $('d-revenue').textContent = money(report.revenue);
    $('d-pending').textContent = (kitchen.counts.new || 0) + (kitchen.counts.confirmed || 0);
    $('d-delivered').textContent = report.delivered;

    $('d-cash').textContent = `${report.cash.count} · ${money(report.cash.amount)}`;
    $('d-online').textContent = `${report.online.count} · ${money(report.online.amount)}`;
    $('d-avg').textContent = money(report.avgOrderValue);
    $('d-cancelled').textContent = report.cancelled;

    $('d-kitchen').textContent =
        `${kitchen.counts.new || 0} / ${kitchen.counts.preparing || 0} / ${kitchen.counts.ready || 0}`;
    $('d-otw').textContent = kitchen.counts.onTheWay || 0;

    loadWeekChart();
}

async function loadWeekChart() {
    if (loadWeekChart.loading) return;
    loadWeekChart.loading = true;
    try {
        const data = await api(`/admin/reports?from=${daysAgoIst(6)}&to=${todayIst()}`);
        drawBar('chart7', data.byDate.map(d => d.date.slice(5)), data.byDate.map(d => d.revenue), 'Revenue');
    } catch (err) { /* chart is secondary */ }
    finally { loadWeekChart.loading = false; }
}

function drawBar(canvasId, labels, values, label, colour) {
    const canvas = $(canvasId);
    if (!canvas || !window.Chart) return;
    if (charts[canvasId]) charts[canvasId].destroy();
    charts[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ label, data: values, // default bars fade from orange to amber, top to bottom
                backgroundColor: colour || ((ctx) => {
                    const area = ctx.chart.chartArea;
                    if (!area) return '#f26b1d';
                    const g = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                    g.addColorStop(0, '#ff8a3d'); g.addColorStop(1, 'rgba(242,107,29,0.25)');
                    return g;
                }), hoverBackgroundColor: '#ff7a2e', borderRadius: 4, maxBarThickness: 28 }]
        },
        options: {
            responsive: true,
            // wide desktop cards get a flatter chart so it does not fill the screen
            aspectRatio: canvas.parentElement.clientWidth > 700 ? 3.4 : 2,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#6c6c74', font: { family: 'Geist Mono', size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                x: { ticks: { color: '#6c6c74', font: { family: 'Geist Mono', size: 11 } }, grid: { display: false }, border: { display: false } }
            }
        }
    });
}

// ══════════ ADMIN: orders ══════════

let orderFilter = 'all';
const ORDER_FILTERS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];

function renderOrderFilters() {
    $('orderFilters').innerHTML = ORDER_FILTERS.map(f => `
        <button class="btn btn-sm ${f === orderFilter ? '' : 'btn-ghost'}"
                onclick="setOrderFilter('${f}')">
            ${f === 'all' ? 'All' : f.replace('_', ' ')}
        </button>`).join('');
}

function setOrderFilter(filter) {
    orderFilter = filter;
    renderOrders();
}

function renderOrders() {
    renderOrderFilters();
    const needle = ($('orderSearch').value || '').toLowerCase().trim();

    let list = state.orders;
    if (orderFilter !== 'all') list = list.filter(o => o.status === orderFilter);
    if (needle) {
        list = list.filter(o =>
            (o.orderId || '').toLowerCase().includes(needle) ||
            (o.phone || '').includes(needle) ||
            (o.customerName || '').toLowerCase().includes(needle));
    }

    $('ordersList').innerHTML = list.length
        ? list.map(o => orderCard(o, adminActions(o))).join('')
        : emptyState('receipt', 'No orders match');
}

function adminActions(order) {
    const buttons = [];
    // COD orders in "pending" status: 3 buttons — Call, Approve, Reject
    if (order.paymentMethod === 'cod' && order.status === 'pending') {
        buttons.push(`<a class="btn btn-sm btn-blue" style="width:100%" href="tel:${order.phone || ''}"><i data-ic="phone"></i> Call Customer</a>`);
        buttons.push(`<button class="btn btn-sm btn-green" style="font-weight:700;font-size:0.82rem;width:100%" onclick="approveOrder('${order.orderId}')"><i data-ic="check-circle"></i> Approve & Notify Kitchen</button>`);
        buttons.push(`<button class="btn btn-sm btn-red" style="width:100%" onclick="rejectCodOrder('${order.orderId}')"><i data-ic="x-circle"></i> Reject Order</button>`);
    } else if (!['delivered', 'cancelled'].includes(order.status)) {
        buttons.push(`<button class="btn btn-sm btn-red" onclick="cancelOrder('${order.orderId}')">Cancel</button>`);
    }
    if (order.paymentMethod === 'cod' && order.paymentStatus !== 'paid' && order.status !== 'pending' && order.status !== 'cancelled') {
        buttons.push(`<button class="btn btn-sm btn-green" onclick="markPaid('${order.orderId}')">Mark cash received</button>`);
    }
    return buttons.join('');
}

async function cancelOrder(orderId) {
    const reason = prompt('Why is this order being cancelled?');
    if (reason === null) return;
    try {
        await api('/admin/orders/' + encodeURIComponent(orderId), {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled', cancelReason: reason || 'Cancelled by admin' })
        });
        toast('Order cancelled', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

// Reject a COD order — cancels it and customer sees "Cancelled" on tracking
async function rejectCodOrder(orderId) {
    if (!confirm('Reject this COD order? The customer will be notified.')) return;
    try {
        await api('/admin/orders/' + encodeURIComponent(orderId), {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled', cancelReason: 'Order not confirmed by customer' })
        });
        toast('Order rejected. Customer notified.', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

async function markPaid(orderId) {
    try {
        await api('/admin/orders/' + encodeURIComponent(orderId), {
            method: 'PATCH', body: JSON.stringify({ paymentStatus: 'paid' })
        });
        toast('Marked as received', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

// Approve a COD order → notifies kitchen + delivery
async function approveOrder(orderId) {
    if (!confirm('Approve this COD order and notify kitchen + delivery?')) return;
    try {
        await api('/hotel/orders/' + encodeURIComponent(orderId) + '/status', {
            method: 'PATCH', body: JSON.stringify({ status: 'confirmed' })
        });
        toast('Order approved! Kitchen & delivery notified.', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

// ══════════ Shared order card ══════════

function itemLines(order, hidePrice) {
    if (!order.items || !order.items.length) return '';
    return order.items.map(line => `
        <div class="item-line">
            <span><span class="qty">${line.qty}×</span>${esc(line.name)}</span>
            ${hidePrice ? '' : `<span>${money((line.lineTotal !== undefined) ? line.lineTotal : line.price * line.qty)}</span>`}
        </div>
        ${(line.extras || []).map(x =>
            `<div class="item-extra">+ ${esc(x.label || x)}</div>`).join('')}
    `).join('');
}

function orderCard(order, actionsHtml, extraHtml) {
    const late = order.waitingMinutes >= LATE_ORDER_MINUTES;
    const fresh = order.status === 'pending';
    return `
    <div class="order ${fresh ? 'fresh' : ''}">
        <div class="order-top">
            <span class="order-id">${esc(order.orderId)}</span>
            <span class="badge ${order.status}">${esc((order.status || '').replace(/_/g, ' '))}</span>
        </div>
        <div class="order-name"><span class="cust-av">${esc((order.customerName || 'C').trim().charAt(0).toUpperCase())}</span>${esc(order.customerName || 'Customer')}</div>
        <div class="order-meta">
            ${esc(order.address || '')}${order.landmark ? ' · ' + esc(order.landmark) : ''}
        </div>
        <div class="items">${itemLines(order)}</div>
        ${extraHtml || ''}
        <div class="order-foot">
            <div>
                <span class="total">${money(order.total)}</span>
                <span class="badge ${order.paymentMethod === 'cod' ? 'cod' : 'online'}"
                      style="margin-left:0.4rem">
                    ${order.paymentMethod === 'cod' ? 'CASH' : 'PAID ONLINE'}
                </span>
            </div>
            ${order.waitingMinutes !== undefined
                ? `<span class="waiting ${late ? 'late' : ''}">${order.waitingMinutes} min ago</span>` : ''}
        </div>
        ${order.deliveryPartner ? `<div class="order-meta" style="margin-top:0.4rem"><i data-ic="bike"></i> ${esc(order.deliveryPartner.name)}</div>` : ''}
        ${actionsHtml ? `<div class="btn-row">${actionsHtml}</div>` : ''}
    </div>`;
}

function emptyState(icon, text) {
    return `<div class="empty"><i data-ic="${icon}"></i>${esc(text)}</div>`;
}

// ══════════ KITCHEN ══════════

// Kitchen-specific order card — hides prices, shows only what to cook
function kitchenOrderCard(order, actionsHtml, rank) {
    const late = order.waitingMinutes >= LATE_ORDER_MINUTES;
    const fresh = order.status === 'pending';
    return `
    <div class="order ${fresh ? 'fresh' : ''}">
        <div class="order-top">
            <span style="display:flex;align-items:center;gap:0.4rem">
                ${rank ? `<span class="rank">#${rank}</span>` : ''}
                <span class="order-id">${esc(order.orderId)}</span>
            </span>
            <span class="badge ${order.status}">${esc((order.status || '').replace(/_/g, ' '))}</span>
        </div>
        <div class="order-name"><span class="cust-av">${esc((order.customerName || 'C').trim().charAt(0).toUpperCase())}</span>${esc(order.customerName || 'Customer')}</div>
        <div class="items">${itemLines(order, true)}</div>
        <div class="order-foot">
            ${order.waitingMinutes !== undefined
                ? `<span class="waiting ${late ? 'late' : ''}">${order.waitingMinutes} min ago</span>` : ''}
        </div>
        ${actionsHtml ? `<div class="btn-row">${actionsHtml}</div>` : ''}
    </div>`;
}

function renderKitchen(data) {
    const arrived = (data.counts.new || 0) + (data.counts.confirmed || 0) + (data.counts.preparing || 0);
    const pickedUp = (data.counts.ready || 0) + (data.counts.onTheWay || 0);
    $('k-arrived').textContent = arrived;
    $('k-pickedup').textContent = pickedUp;

    $('prepTotals').innerHTML = data.prepTotals.length
        ? data.prepTotals.map(p => `
            <div class="prep-chip">
                <div class="n">${p.qty}</div>
                <div class="l">${esc(p.name)}</div>
                ${Object.entries(p.extras || {}).map(([label, n]) =>
                    `<div class="x">+${esc(label)} ×${n}</div>`).join('')}
            </div>`).join('')
        : '<span style="color:var(--text-3);font-size:0.82rem;font-weight:600">Nothing to cook right now</span>';

    // Only show orders that need cooking — picked up/dispatched orders are hidden
    const toCook = data.orders
        .filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status))
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let html = '';
    if (toCook.length) {
        html += `<div class="section-title" style="margin:0.5rem 0 0.6rem;color:var(--brand-ink)">
            <i data-ic="flame"></i> To cook — ${toCook.length} ${toCook.length === 1 ? 'order' : 'orders'} (oldest first)
        </div>`;
        html += toCook.map((o, i) => kitchenOrderCard(o, kitchenActions(o), i + 1)).join('');
    }

    $('kitchenList').innerHTML = html || emptyState('chef', 'No active orders');
}

function kitchenActions(order) {
    // Kitchen is information-only — no buttons. Just cook!
    return '';
}

// Accept = mark directly as ready (skip confirmed → preparing → ready steps)
async function kitchenAccept(orderId) {
    try {
        await api(`/hotel/orders/${encodeURIComponent(orderId)}/status`, {
            method: 'PATCH', body: JSON.stringify({ status: 'ready' })
        });
        toast('Order marked ready!', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

// ══════════ DELIVERY ══════════

function deliveryMeta(order) {
    return `
    <div class="row">
        <span class="label"><i data-ic="pin"></i> Distance</span>
        <span class="value">${order.distanceKm !== null && order.distanceKm !== undefined
            ? order.distanceKm + ' km' : 'Unknown'}</span>
    </div>
    <div class="row">
        <span class="label"><i data-ic="banknote"></i> Collect</span>
        <span class="value" style="color:${order.paymentMethod === 'cod' ? 'var(--gold)' : 'var(--green)'}">
            ${order.paymentMethod === 'cod' ? money(order.total) + ' in cash' : 'Already paid'}
        </span>
    </div>`;
}

function renderAvailable() {
    if (!state.available.length) {
        $('availableList').innerHTML =
            emptyState('package', 'No orders waiting. New ones will alert you.');
        return;
    }

    // Cash orders are worth a quick call before riding out, so they get their
    // own section with the customer's number on the card.
    const cash = state.available.filter(o => o.paymentMethod === 'cod');
    const prepaid = state.available.filter(o => o.paymentMethod !== 'cod');

    const card = (o) => orderCard(o, `
        <a class="btn btn-sm btn-blue"
           href="tel:${esc(o.phone)}"><i data-ic="phone"></i> Call first</a>
        <button class="btn btn-sm btn-green" onclick="claimOrder('${o.orderId}')"><i data-ic="check-circle"></i> Accept</button>
    `, deliveryMeta(o));

    let html = '';
    if (cash.length) {
        html += `<div class="section-title" style="margin-top:0">
                    <i data-ic="banknote"></i> Cash on delivery — ${cash.length} ${cash.length === 1 ? 'order' : 'orders'}
                 </div>
                 <p style="font-size:0.72rem;color:var(--muted);margin:-0.3rem 0 0.7rem">
                    Call the customer to confirm before you accept.
                 </p>`;
        html += cash.map(card).join('');
    }
    if (prepaid.length) {
        html += `<div class="section-title"><i data-ic="check-circle"></i> Already paid — ${prepaid.length}
                 </div>`;
        html += prepaid.map(o => orderCard(o,
            `<button class="btn btn-sm btn-green" onclick="claimOrder('${o.orderId}')"><i data-ic="check-circle"></i> Accept this order</button>`,
            deliveryMeta(o))).join('');
    }

    $('availableList').innerHTML = html;
}

function renderMine() {
    $('mineList').innerHTML = state.mine.length
        ? state.mine.map(o => orderCard(o, mineActions(o), `
            ${deliveryMeta(o)}
            <div class="btn-row">
                <a class="btn btn-sm btn-blue"
                   href="tel:${esc(o.phone)}"><i data-ic="phone"></i> Call</a>
                <a class="btn btn-sm btn-ghost"
                   href="${esc(o.mapsUrl)}" target="_blank" rel="noopener"><i data-ic="map"></i> Navigate</a>
            </div>`)).join('')
        : emptyState('bike', 'You have no active deliveries');
}

function mineActions(order) {
    const buttons = [];
    // Step 1: Preparing (food is being cooked)
    if (['pending', 'confirmed'].includes(order.status)) {
        buttons.push(`<button class="btn btn-sm btn-blue" style="width:100%" onclick="deliveryStatus('${order.orderId}','preparing')"><i data-ic="chef"></i> Preparing</button>`);
    }
    // Step 2: Picked Up (food collected from kitchen — vanishes from kitchen dashboard)
    if (order.status === 'preparing') {
        buttons.push(`<button class="btn btn-sm btn-blue" style="width:100%" onclick="deliveryStatus('${order.orderId}','picked_up')"><i data-ic="package"></i> Picked Up</button>`);
    }
    // Step 3: On the Way (heading to customer)
    if (order.status === 'picked_up') {
        buttons.push(`<button class="btn btn-sm btn-blue" style="width:100%" onclick="deliveryStatus('${order.orderId}','on_the_way')"><i data-ic="bike"></i> On the Way</button>`);
    }
    // Step 4: Delivered (must enter delivery code)
    if (order.status === 'on_the_way') {
        buttons.push(`<button class="btn btn-sm btn-green" style="width:100%;font-weight:700" onclick="askDeliveryCode('${order.orderId}', ${order.paymentMethod === 'cod'}, ${order.total})"><i data-ic="check-circle"></i> Delivered</button>`);
    }
    // Give back option (only before picked up)
    if (['pending', 'confirmed', 'preparing'].includes(order.status)) {
        buttons.push(`<button class="btn btn-sm btn-ghost" onclick="releaseOrder('${order.orderId}')">Give back</button>`);
    }
    return buttons.join('');
}

async function claimOrder(orderId) {
    try {
        await api(`/delivery/orders/${encodeURIComponent(orderId)}/claim`, { method: 'POST' });
        toast('Order is yours', 'ok');
        switchView('mine');
    } catch (err) {
        // Expected when another partner won the race
        toast(err.message, 'err');
        refresh();
    }
}

async function releaseOrder(orderId) {
    if (!confirm('Give this order back to the other partners?')) return;
    try {
        await api(`/delivery/orders/${encodeURIComponent(orderId)}/release`, { method: 'POST' });
        toast('Returned to the pool', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

async function deliveryStatus(orderId, status) {
    try {
        await api(`/delivery/orders/${encodeURIComponent(orderId)}/status`, {
            method: 'PATCH', body: JSON.stringify({ status })
        });
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

// Proof of delivery: the customer reads out the code shown on their phone.
function askDeliveryCode(orderId, isCod, total) {
    $('modalHost').innerHTML = `
    <div class="modal" onclick="if(event.target===this)closeModal()">
        <div class="sheet">
            <h3>Confirm delivery</h3>
            <p style="font-size:0.8rem;color:var(--muted);margin-bottom:0.9rem">
                Ask the customer for the 4-digit code on their order screen.
            </p>
            ${isCod ? `
            <div class="alert-banner" style="background:rgba(245,158,11,0.14);border-color:rgba(245,158,11,0.35);color:#fcd34d">
                <i data-ic="banknote"></i> Collect <b>${money(total)}</b> in cash before confirming
            </div>` : ''}
            <div class="field" style="max-width:none">
                <label>Delivery code</label>
                <input type="tel" id="dl-code" inputmode="numeric" maxlength="20"
                       placeholder="4-digit code" style="font-size:1.5rem;text-align:center;letter-spacing:0.3em">
            </div>
            <p id="dl-error" style="font-size:0.75rem;color:#fca5a5;min-height:1rem"></p>
            <div class="btn-row">
                <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button class="btn btn-green" id="dl-submit"
                        onclick="submitDeliveryCode('${orderId}')">Confirm delivered</button>
            </div>
        </div>
    </div>`;

    const input = $('dl-code');
    input.focus();
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitDeliveryCode(orderId);
    });
}

async function submitDeliveryCode(orderId) {
    const code = $('dl-code').value.trim();
    const button = $('dl-submit');

    if (!code) { $('dl-error').textContent = 'Ask the customer for their code'; return; }

    button.disabled = true;
    button.textContent = 'Checking…';

    try {
        await api(`/delivery/orders/${encodeURIComponent(orderId)}/status`, {
            method: 'PATCH', body: JSON.stringify({ status: 'delivered', code })
        });
        closeModal();
        toast('Delivered — well done', 'ok');
        refresh();
    } catch (err) {
        $('dl-error').textContent = err.message;
        button.disabled = false;
        button.textContent = 'Confirm delivered';
    }
}

// ── Location sharing (delivery partners only) ──
// Runs only while the partner is actually carrying an order, so we are not
// draining their battery or tracking them off shift.

let locationWatch = null;
let lastLocationSent = 0;
const LOCATION_INTERVAL_MS = 20000;

function updateLocationSharing(carryingCount) {
    if (carryingCount > 0 && locationWatch === null) startLocationSharing();
    else if (carryingCount === 0 && locationWatch !== null) stopLocationSharing();
}

function startLocationSharing() {
    if (!navigator.geolocation) return;
    locationWatch = navigator.geolocation.watchPosition(
        async (pos) => {
            const now = Date.now();
            if (now - lastLocationSent < LOCATION_INTERVAL_MS) return;
            lastLocationSent = now;
            try {
                await api('/delivery/location', {
                    method: 'POST',
                    body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
                });
            } catch (err) { /* a dropped ping is not worth interrupting a delivery */ }
        },
        () => { /* permission refused — deliveries still work, tracking just goes dark */ },
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    $('locationPill').textContent = 'Sharing location';
    $('locationPill').className = 'pill open';
}

function stopLocationSharing() {
    if (locationWatch !== null) navigator.geolocation.clearWatch(locationWatch);
    locationWatch = null;
    $('locationPill').textContent = '';
    $('locationPill').className = 'pill';
}

function renderEarnings() {
    const e = state.earnings;
    $('e-deliveries').textContent = e.deliveries || 0;
    $('e-earned').textContent = money(e.earned);
    $('e-earned2').textContent = money(e.earned);
    $('e-cash').textContent = money(e.cashCollected);
    $('e-net').textContent = money(e.netToHandOver);
    // Monthly stats
    if ($('e-month-deliveries')) $('e-month-deliveries').textContent = e.monthDeliveries || 0;
    if ($('e-month-earned')) $('e-month-earned').textContent = money(e.monthEarned || 0);
}

// ══════════ ADMIN: menu ══════════

function renderMenu() {
    const entries = Object.entries(state.menu)
        .sort((a, b) => (a[1].sortOrder || 0) - (b[1].sortOrder || 0));

    $('menuList').innerHTML = entries.map(([key, item]) => `
        <div class="menu-item ${item.available === false ? 'out' : ''}">
            <div class="info">
                <div class="nm">${esc(item.name)}</div>
                <div class="pr">${item.available === false ? 'Sold out' : 'Available'}${item.category === 'nonveg' ? ' · non-veg' : ''}</div>
            </div>
            <input class="price" type="number" inputmode="numeric" value="${item.price}"
                   onchange="savePrice('${key}', this.value)">
            <label class="toggle">
                <input type="checkbox" ${item.available !== false ? 'checked' : ''}
                       onchange="saveAvailability('${key}', this.checked)">
                <span class="slider"></span>
            </label>
        </div>`).join('');
}

async function savePrice(key, value) {
    const price = parseInt(value, 10);
    if (!isFinite(price) || price < 0) { toast('Enter a valid price', 'err'); return; }
    try {
        await api('/admin/menu/' + encodeURIComponent(key), {
            method: 'PATCH', body: JSON.stringify({ price })
        });
        state.menu[key].price = price;
        toast('Price updated', 'ok');
    } catch (err) { toast(err.message, 'err'); }
}

async function saveAvailability(key, available) {
    try {
        await api('/admin/menu/' + encodeURIComponent(key), {
            method: 'PATCH', body: JSON.stringify({ available })
        });
        state.menu[key].available = available;
        renderMenu();
        toast(available ? 'Back on the menu' : 'Marked sold out', 'ok');
    } catch (err) { toast(err.message, 'err'); }
}

// ══════════ ADMIN: shop config ══════════

const CONFIG_TOGGLES = ['isOpen', 'pauseOrders', 'autoSchedule', 'codEnabled', 'onlineEnabled',
    'firstOrderDiscountEnabled'];
const CONFIG_TEXTS = ['openTime', 'closeTime', 'closedMessage', 'hotelLat', 'hotelLng'];
const CONFIG_NUMBERS = ['deliveryFee', 'minOrderValue', 'prepTimeMinutes', 'defaultPayoutPerDelivery',
    'firstOrderDiscountPercent'];

function fillConfigForm() {
    const config = state.config;
    CONFIG_TOGGLES.forEach(k => { if ($('cfg-' + k)) $('cfg-' + k).checked = !!config[k]; });
    CONFIG_TEXTS.forEach(k => {
        if ($('cfg-' + k)) $('cfg-' + k).value = config[k] === null || config[k] === undefined ? '' : config[k];
    });
    CONFIG_NUMBERS.forEach(k => { if ($('cfg-' + k)) $('cfg-' + k).value = config[k] || 0; });
    $('cfg-weeklyOff').value = (config.weeklyOff || [])[0] || '';
}

async function saveConfig() {
    const payload = {};
    CONFIG_TOGGLES.forEach(k => payload[k] = $('cfg-' + k).checked);
    CONFIG_TEXTS.forEach(k => {
        const value = $('cfg-' + k).value.trim();
        payload[k] = (k === 'hotelLat' || k === 'hotelLng')
            ? (value === '' ? null : parseFloat(value))
            : value;
    });
    CONFIG_NUMBERS.forEach(k => payload[k] = parseInt($('cfg-' + k).value, 10) || 0);
    payload.weeklyOff = $('cfg-weeklyOff').value ? [$('cfg-weeklyOff').value] : [];

    try {
        const data = await api('/admin/config', { method: 'PATCH', body: JSON.stringify(payload) });
        state.config = data.config;
        toast('Settings saved', 'ok');
        const status = await api('/shop-status');
        renderShopPill(status);
    } catch (err) { toast(err.message, 'err'); }
}

function useMyLocation() {
    if (!navigator.geolocation) { toast('Location not available', 'err'); return; }
    toast('Getting location…');
    navigator.geolocation.getCurrentPosition(
        pos => {
            $('cfg-hotelLat').value = pos.coords.latitude.toFixed(6);
            $('cfg-hotelLng').value = pos.coords.longitude.toFixed(6);
            toast('Location filled — press Save', 'ok');
        },
        () => toast('Could not get your location', 'err'),
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ══════════ ADMIN: staff ══════════

function renderStaff() {
    $('staffList').innerHTML = state.staff.map(member => `
        <div class="card">
            <div class="order-top">
                <span class="order-name">${esc(member.name)}</span>
                <span class="badge ${member.active === false ? 'cancelled' : 'delivered'}">
                    ${member.active === false ? 'Inactive' : member.role}
                </span>
            </div>
            <div class="row"><span class="label">Phone</span><span class="value">${esc(member.phone)}</span></div>
            ${member.role === 'delivery' ? `
            <div class="row">
                <span class="label">Pay per delivery</span>
                <span class="value">${money(member.payoutPerDelivery)}</span>
            </div>` : ''}
            <div class="row">
                <span class="label">Last login</span>
                <span class="value">${member.lastLoginAt
                    ? new Date(member.lastLoginAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Never'}</span>
            </div>
            <div class="btn-row">
                <button class="btn btn-sm btn-ghost" onclick="openStaffModal('${member.staffId}')">Edit</button>
                ${member.staffId !== me.staffId ? `
                <button class="btn btn-sm ${member.active === false ? 'btn-green' : 'btn-red'}"
                        onclick="toggleStaff('${member.staffId}', ${member.active === false})">
                    ${member.active === false ? 'Reactivate' : 'Deactivate'}
                </button>` : ''}
            </div>
        </div>`).join('') || emptyState('team', 'No staff yet');
}

async function toggleStaff(staffId, active) {
    try {
        await api('/admin/staff/' + encodeURIComponent(staffId), {
            method: 'PATCH', body: JSON.stringify({ active })
        });
        toast(active ? 'Reactivated' : 'Deactivated', 'ok');
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

function openStaffModal(staffId) {
    const member = staffId ? state.staff.find(s => s.staffId === staffId) : null;
    const defaultPay = state.config.defaultPayoutPerDelivery || 20;

    $('modalHost').innerHTML = `
    <div class="modal" onclick="if(event.target===this)closeModal()">
        <div class="sheet">
            <h3>${member ? 'Edit ' + esc(member.name) : 'Add staff member'}</h3>
            <div class="field" style="max-width:none">
                <label>Name</label>
                <input type="text" id="st-name" value="${member ? esc(member.name) : ''}" placeholder="Full name">
            </div>
            <div class="field" style="max-width:none">
                <label>Phone (this is their login)</label>
                <input type="tel" id="st-phone" inputmode="numeric" maxlength="10"
                       value="${member ? esc(member.phone) : ''}" ${member ? 'disabled' : ''}
                       placeholder="10-digit number">
            </div>
            <div class="field" style="max-width:none">
                <label>Role</label>
                <select id="st-role" ${member ? '' : ''}>
                    <option value="delivery" ${member && member.role === 'delivery' ? 'selected' : ''}>Delivery partner</option>
                    <option value="hotel" ${member && member.role === 'hotel' ? 'selected' : ''}>Kitchen / hotel</option>
                    <option value="admin" ${member && member.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>
            <div class="field" style="max-width:none">
                <label>Pay per delivery ₹ (delivery partners only)</label>
                <input type="number" id="st-pay" inputmode="numeric"
                       value="${member ? (member.payoutPerDelivery || 0) : defaultPay}">
            </div>
            <div class="field" style="max-width:none">
                <label>${member ? 'New PIN (leave blank to keep current)' : 'PIN (4-8 digits)'}</label>
                <input type="text" id="st-pin" inputmode="numeric" maxlength="8" placeholder="${member ? 'Unchanged' : 'e.g. 1234'}">
            </div>
            <div class="btn-row">
                <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
                <button class="btn" onclick="saveStaff(${member ? `'${member.staffId}'` : 'null'})">Save</button>
            </div>
        </div>
    </div>`;
}

function closeModal() { $('modalHost').innerHTML = ''; }

async function saveStaff(staffId) {
    const payload = {
        name: $('st-name').value.trim(),
        role: $('st-role').value,
        payoutPerDelivery: parseInt($('st-pay').value, 10) || 0
    };
    const pin = $('st-pin').value.trim();

    try {
        if (staffId) {
            if (pin) payload.pin = pin;
            await api('/admin/staff/' + encodeURIComponent(staffId), {
                method: 'PATCH', body: JSON.stringify(payload)
            });
            toast('Saved', 'ok');
        } else {
            payload.phone = $('st-phone').value.replace(/\D/g, '');
            payload.pin = pin;
            await api('/admin/staff', { method: 'POST', body: JSON.stringify(payload) });
            toast(`${payload.name} can now log in with PIN ${pin}`, 'ok');
        }
        closeModal();
        refresh();
    } catch (err) { toast(err.message, 'err'); }
}

// ══════════ ADMIN: reports ══════════

const RANGES = {
    today: { label: 'Today', from: () => todayIst() },
    week: { label: '7 days', from: () => daysAgoIst(6) },
    month: { label: '30 days', from: () => daysAgoIst(29) }
};

function renderRangeButtons() {
    $('reportRanges').innerHTML = Object.entries(RANGES).map(([key, r]) => `
        <button class="btn btn-sm ${key === state.reportRange ? '' : 'btn-ghost'}"
                onclick="setRange('${key}')">${r.label}</button>`).join('');
}

function setRange(key) {
    state.reportRange = key;
    loadReport();
}

async function loadReport() {
    renderRangeButtons();
    const from = RANGES[state.reportRange].from();
    const to = todayIst();

    const [report, payouts] = await Promise.all([
        api(`/admin/reports?from=${from}&to=${to}`),
        api(`/admin/payouts?from=${from}&to=${to}`)
    ]);

    $('r-orders').textContent = report.totalOrders;
    $('r-revenue').textContent = money(report.revenue);
    $('r-cash').textContent = `${report.cash.count} · ${money(report.cash.amount)}`;
    $('r-online').textContent = `${report.online.count} · ${money(report.online.amount)}`;
    $('r-avg').textContent = money(report.avgOrderValue);
    $('r-cancelled').textContent = report.cancelled;

    drawBar('chartRange', report.byDate.map(d => d.date.slice(5)), report.byDate.map(d => d.revenue), 'Revenue');
    drawBar('chartHours',
        report.hourly.map((_, h) => h + ':00').filter((_, h) => h >= 8 && h <= 23),
        report.hourly.filter((_, h) => h >= 8 && h <= 23),
        'Orders', 'rgba(165,148,249,0.7)');

    $('itemSales').innerHTML = report.itemSales.length
        ? report.itemSales.map(item => `
            <div class="row">
                <span class="label">${esc(item.name)}</span>
                <span class="value">${item.qty} sold · ${money(item.revenue)}</span>
            </div>`).join('')
        : '<span style="color:var(--dim);font-size:0.8rem">No sales in this period</span>';

    $('payoutList').innerHTML = payouts.partners.length
        ? payouts.partners.map(p => `
            <div class="row">
                <span class="label">${esc(p.name)}<br>
                    <span style="font-size:0.68rem;color:var(--dim)">${p.deliveries} deliveries × ${money(p.rate)}</span>
                </span>
                <span class="value">${money(p.earned)}<br>
                    <span style="font-size:0.68rem;color:var(--muted)">cash ${money(p.cashCollected)}</span>
                </span>
            </div>`).join('')
        : '<span style="color:var(--dim);font-size:0.8rem">No deliveries in this period</span>';
}

// ══════════ ADMIN: app users ══════════

async function loadUsers() {
    const data = await api('/admin/customers');

    $('u-total').textContent = data.total;
    $('u-new').textContent = data.newThisWeek;
    $('u-active').textContent = data.activeThisWeek;
    $('u-ordered').textContent = data.ordering;
    $('u-never').textContent = data.neverOrdered;
    $('u-month').textContent = data.activeThisMonth;

    drawBar('chartUsers',
        data.signUpsByDate.map(d => d.date.slice(5)),
        data.signUpsByDate.map(d => d.count),
        'Sign-ups', 'rgba(62,207,142,0.7)');

    $('topCustomers').innerHTML = data.topCustomers.length
        ? data.topCustomers.map(c => `
            <div class="row">
                <span class="label">${esc(c.name || c.email)}<br>
                    <span style="font-size:0.66rem;color:var(--dim)">${esc(c.email)}</span>
                </span>
                <span class="value">${money(c.spent)}<br>
                    <span style="font-size:0.66rem;color:var(--muted)">${c.orders} order${c.orders === 1 ? '' : 's'}</span>
                </span>
            </div>`).join('')
        : '<span style="color:var(--dim);font-size:0.8rem">No orders in this period</span>';

    $('userList').innerHTML = data.recent.length
        ? data.recent.map(u => `
            <div class="card">
                <div class="order-top">
                    <span class="order-name">${esc(u.name || u.email)}</span>
                    <span class="badge ${u.hasOrdered ? 'delivered' : 'pending'}">
                        ${u.hasOrdered ? 'customer' : 'not ordered'}
                    </span>
                </div>
                <div class="order-meta">${esc(u.email)}</div>
                <div class="row">
                    <span class="label">Joined</span>
                    <span class="value">${new Date(u.firstSeenAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</span>
                </div>
                <div class="row">
                    <span class="label">Last seen</span>
                    <span class="value">${new Date(u.lastSeenAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="row">
                    <span class="label">Opened the app</span>
                    <span class="value">${u.signInCount}× · ${esc(u.platform)}</span>
                </div>
            </div>`).join('')
        : emptyState('users', 'Nobody has signed in yet');
}

// ══════════ ADMIN: deals and offers ══════════

async function loadBroadcasts() {
    const data = await api('/admin/broadcast');

    $('sub-all').textContent = data.counts.all;
    $('sub-recent').textContent = data.counts.recent;
    $('pushWarning').style.display = data.pushConfigured ? 'none' : 'block';

    $('broadcastHistory').innerHTML = data.history.length
        ? data.history.map(entry => `
            <div class="card">
                <div class="order-top">
                    <span class="order-name">${esc(entry.title)}</span>
                    <span class="badge delivered">${entry.delivered}/${entry.sentTo}</span>
                </div>
                <div class="order-meta">${esc(entry.body)}</div>
                <div class="row" style="margin-top:0.5rem">
                    <span class="label">${esc(entry.audienceLabel || entry.audience)}</span>
                    <span class="value" style="font-size:0.7rem;color:var(--muted)">
                        ${new Date(entry.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>`).join('')
        : emptyState('megaphone', 'No offers sent yet');

    // Render scheduled notifications
    const scheduled = data.scheduled || [];
    $('scheduledTitle').style.display = scheduled.length ? '' : 'none';
    $('scheduledList').innerHTML = scheduled.map(s => `
        <div class="card">
            <div class="order-top">
                <span class="order-name">${esc(s.title)}</span>
                <span class="badge pending">
                    ${new Date(s.scheduledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
            <div class="order-meta">${esc(s.body)}</div>
            <div class="row" style="margin-top:0.5rem">
                <span class="label">${esc(s.audienceLabel || s.audience)}</span>
                <button class="btn btn-sm btn-ghost" style="color:var(--red)" onclick="cancelScheduled('${s.id}')">
                    <i data-ic="x"></i> Cancel
                </button>
            </div>
        </div>
    `).join('');

    updateBroadcastPreview();
}

function updateBroadcastPreview() {
    const title = $('bc-title').value;
    const message = $('bc-body').value;
    $('bc-title-count').textContent = title.length + '/60';
    $('bc-body-count').textContent = message.length + '/180';
    $('bc-preview-title').textContent = title || 'Your title';
    $('bc-preview-body').textContent = message || 'Your message';
}

async function sendBroadcast() {
    const title = $('bc-title').value.trim();
    const message = $('bc-body').value.trim();
    const audience = $('bc-audience').value;
    const audienceLabel = $('bc-audience').selectedOptions[0].textContent.trim();
    const reach = audience === 'all' ? $('sub-all').textContent : $('sub-recent').textContent;

    if (!title || !message) { toast('Add a title and a message', 'err'); return; }

    // This goes to real customers and cannot be recalled, so make the blast
    // radius explicit before it leaves.
    if (!confirm(`Send "${title}" to ${audienceLabel.toLowerCase()}?\n\nThis cannot be undone.`)) return;

    try {
        const result = await api('/admin/broadcast', {
            method: 'POST',
            body: JSON.stringify({ title, body: message, audience })
        });
        toast(`Sent to ${result.delivered} ${result.delivered === 1 ? 'phone' : 'phones'}`, 'ok');
        $('bc-title').value = '';
        $('bc-body').value = '';
        loadBroadcasts();
    } catch (err) { toast(err.message, 'err'); }
}

async function scheduleBroadcast() {
    const title = $('bc-title').value.trim();
    const message = $('bc-body').value.trim();
    const audience = $('bc-audience').value;
    const scheduledAt = $('bc-schedule-time').value;

    if (!title || !message) { toast('Add a title and a message', 'err'); return; }
    if (!scheduledAt) { toast('Pick a date and time first', 'err'); return; }

    const localDate = new Date(scheduledAt);
    if (localDate.getTime() < Date.now()) { toast('Time must be in the future', 'err'); return; }

    const audienceLabel = $('bc-audience').selectedOptions[0].textContent.trim();
    const timeStr = localDate.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    if (!confirm(`Schedule "${title}" for ${timeStr}?\nAudience: ${audienceLabel}`)) return;

    try {
        await api('/admin/broadcast/schedule', {
            method: 'POST',
            body: JSON.stringify({
                title, body: message, audience,
                scheduledAt: localDate.toISOString()
            })
        });
        toast('Notification scheduled ✓', 'ok');
        $('bc-title').value = '';
        $('bc-body').value = '';
        $('bc-schedule-time').value = '';
        loadBroadcasts();
    } catch (err) { toast(err.message, 'err'); }
}

async function cancelScheduled(id) {
    if (!confirm('Cancel this scheduled notification?')) return;
    try {
        await api('/admin/broadcast/schedule?id=' + id, { method: 'DELETE' });
        toast('Cancelled', 'ok');
        loadBroadcasts();
    } catch (err) { toast(err.message, 'err'); }
}

async function exportCsv() {
    const from = RANGES[state.reportRange].from();
    const to = todayIst();
    try {
        const res = await fetch(`${API_URL}/admin/export?from=${from}&to=${to}`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        const csv = await res.text();
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `sai-prasad-${from}-to-${to}.csv`;
        link.click();
        toast('Downloaded', 'ok');
    } catch (err) { toast('Could not export', 'err'); }
}

// ── Start ──

document.addEventListener('DOMContentLoaded', () => {
    $('login-pin').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

    // Unlock audio on the first tap — browsers block sound before interaction
    document.addEventListener('click', () => {
        if (!audioCtx) { try { beep(0); } catch (e) { /* ignore */ } }
    }, { once: true });

    if (token && me) {
        startApp();
        // Validate the stored token. Retry once after a short delay to survive
        // Lambda cold starts which can take several seconds and time out.
        (async function validateSession() {
            try {
                const data = await api('/staff/me');
                // Refresh the cached identity in case role/name changed
                if (data.staffId) {
                    me = { staffId: data.staffId, role: data.role, name: data.name };
                    localStorage.setItem(ME_KEY, JSON.stringify(me));
                    $('topWho').textContent = `${me.name} · ${me.role}`;
                    if ($('topAvatar')) $('topAvatar').textContent = String(me.name || '?').trim().charAt(0).toUpperCase();
                }
            } catch (err) {
                if (err.isNetwork || (err.status === 401 && consecutive401s < MAX_401_BEFORE_LOGOUT)) {
                    // Retry once after 3 seconds
                    console.warn('Session check failed, retrying…', err.message);
                    setTimeout(async () => {
                        try { await api('/staff/me'); } catch (e) { /* api() handles logout after threshold */ }
                    }, 3000);
                }
                // If it was a hard logout (3+ consecutive 401s), api() already called logout()
            }
        })();
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') refresh();
    });
});
