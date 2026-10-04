/* ============================================
   AAPLA SWAD — Order page extras
   Kitchen tabs and a search over the menu that order.js renders, a small
   bump on the total, and a live countdown on the closed notice.
   Presentation only: it reads the DOM order.js builds and never touches the
   cart, prices, the API or payment.
   ============================================ */
(function () {
    var tr = function (k, f) { return typeof window.t === 'function' ? window.t(k, f) : f; };
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var container = document.getElementById('menu-items-container');
    var tools = document.getElementById('menuTools');
    var tabsEl = document.getElementById('kitchenTabs');
    var find = document.getElementById('menuFind');
    if (!container || !tools || !tabsEl || !find) return;

    var headers = [], tabs = [];
    var empty = document.createElement('p');
    empty.className = 'find-empty';
    empty.hidden = true;
    container.parentNode.insertBefore(empty, container.nextSibling);

    function navHeight() {
        var nav = document.querySelector('.order-nav');
        return nav ? nav.offsetHeight : 0;
    }
    function offset() { return navHeight() + (tools.hidden ? 0 : tools.offsetHeight) + 12; }
    function jump(el) {
        var y = el.getBoundingClientRect().top + window.pageYOffset - offset();
        window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }

    // One tab per kitchen header, with how many dishes it holds
    function build() {
        headers = [].slice.call(container.querySelectorAll('.menu-hotel-header'));
        var cartMode = !!container.querySelector('#addMoreSection');   // came from home with a cart
        tools.hidden = cartMode || headers.length < 2;
        tabsEl.innerHTML = '';
        tabs = headers.map(function (h) {
            var count = 0;
            for (var el = h.nextElementSibling; el && !el.classList.contains('menu-hotel-header'); el = el.nextElementSibling) {
                if (el.classList.contains('cart-item-card')) count++;
            }
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'ktab';
            var name = document.createElement('span');
            name.textContent = (h.querySelector('.mh-name') || {}).textContent || '';
            var num = document.createElement('b');
            num.textContent = count;
            b.appendChild(name);
            b.appendChild(num);
            b.addEventListener('click', function () {
                if (find.value) { find.value = ''; filter(); }
                jump(h);
            });
            tabsEl.appendChild(b);
            return b;
        });
        spy();
        markClosed();
    }

    // Search across name, description and extras
    function filter() {
        var words = find.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
        var shown = 0, head = null, headHas = false, cat = null, catHas = false;
        function closeCat() { if (cat) cat.hidden = !catHas; }
        function closeHead() { if (head) head.hidden = !headHas; }
        [].forEach.call(container.children, function (el) {
            if (el.classList.contains('menu-hotel-header')) {
                closeCat(); closeHead();
                head = el; headHas = false; cat = null;
            } else if (el.classList.contains('menu-category-header')) {
                closeCat();
                cat = el; catHas = false;
            } else if (el.classList.contains('cart-item-card')) {
                var text = el.textContent.toLowerCase();
                var ok = words.every(function (w) { return text.indexOf(w) !== -1; });
                el.hidden = !ok;
                if (ok) { shown++; catHas = true; headHas = true; }
            }
        });
        closeCat(); closeHead();
        tabs.forEach(function (t, i) { t.hidden = !!headers[i].hidden; });
        empty.textContent = tr('no_match', 'No dishes match');
        empty.hidden = shown !== 0 || !words.length;
    }
    find.addEventListener('input', filter);
    find.addEventListener('keydown', function (e) { if (e.key === 'Enter') find.blur(); });

    // Highlight the kitchen currently under the tabs
    var queued = false;
    function spy() {
        queued = false;
        if (tools.hidden || !tabs.length) return;
        var line = offset() + 8, cur = 0;
        headers.forEach(function (h, i) { if (!h.hidden && h.getBoundingClientRect().top <= line) cur = i; });
        tabs.forEach(function (t, i) { t.classList.toggle('active', i === cur); });
        var active = tabs[cur];
        if (active) {
            var left = active.offsetLeft - tabsEl.clientWidth / 2 + active.offsetWidth / 2;
            if (Math.abs(tabsEl.scrollLeft - left) > 6) tabsEl.scrollTo({ left: left, behavior: reduce ? 'auto' : 'smooth' });
        }
    }
    window.addEventListener('scroll', function () {
        if (!queued) { queued = true; requestAnimationFrame(spy); }
    }, { passive: true });

    // order.js re-renders the menu by replacing it; rebuild whenever it does
    new MutationObserver(function () { build(); if (find.value) filter(); }).observe(container, { childList: true });
    build();

    // The total gives a little bounce whenever it changes
    var total = document.getElementById('total-amount');
    var bar = document.getElementById('orderTotalBar');
    if (total && bar) {
        new MutationObserver(function () {
            bar.classList.remove('bump');
            void bar.offsetWidth;
            bar.classList.add('bump');
        }).observe(total, { childList: true, characterData: true, subtree: true });
    }

    // Closed notice: "Opens in 9h 20m", only outside the daily hours
    var banner = document.getElementById('closed-banner');
    var countEl = document.getElementById('cbCount');
    function tick() {
        markClosed();
        if (!banner || !countEl) return;
        var now = new Date(), h = now.getHours();
        var shown = banner.style.display !== 'none';
        if (!shown || (h >= 10 && h < 22)) { countEl.hidden = true; return; }
        var opens = new Date(now);
        opens.setHours(10, 0, 0, 0);
        if (h >= 22) opens.setDate(opens.getDate() + 1);
        var mins = Math.max(0, Math.ceil((opens - now) / 60000));
        countEl.querySelector('small').textContent = tr('opens_in', 'Opens in');
        countEl.querySelector('span').textContent = (mins >= 60 ? Math.floor(mins / 60) + 'h ' : '') + (mins % 60) + 'm';
        countEl.hidden = false;
    }
    if (banner) new MutationObserver(tick).observe(banner, { attributes: true, attributeFilter: ['style'] });
    tick();
    setInterval(tick, 30000);

    // ---- Closed shop / kitchen hours: ADD says when it opens instead ----
    // Same hours order.js checks (shop 10–22, Chinese 15–22, Rolls 17–22).
    function markClosed() {
        var b = document.getElementById('closed-banner');
        var shut = !!(b && b.style.display !== 'none');
        var h = new Date().getHours();
        document.body.classList.toggle('shop-closed', shut);
        if (shut) {
            var label = (h >= 10 && h < 22) ? tr('paused_short', 'Paused') : tr('opens_10', 'Opens 10 AM');
            document.body.style.setProperty('--closed-label', JSON.stringify(label));
        }
        var kitchen = '';
        [].forEach.call(container.children, function (el) {
            if (el.classList.contains('menu-hotel-header')) {
                kitchen = ((el.querySelector('.mh-name') || {}).textContent || '').trim();
                return;
            }
            if (!el.classList.contains('cart-item-card')) return;
            var k = '';
            if (kitchen === 'Shriyan Chinese' && !(h >= 15 && h < 22)) k = tr('opens_3', 'Opens 3 PM');
            else if (kitchen === 'Mauli Veg Rol' && !(h >= 17 && h < 22)) k = tr('opens_5', 'Opens 5 PM');
            el.classList.toggle('kc-closed', !!k);
            if (k) el.style.setProperty('--closed-label', JSON.stringify(k));
            else el.style.removeProperty('--closed-label');
        });
    }

    // ---- Desktop: the total bar becomes a bill summary with the dishes ----
    var summary = null;
    function renderSummary() {
        if (!bar || typeof cart === 'undefined' || typeof MENU === 'undefined') return;
        if (!summary) {
            summary = document.createElement('div');
            summary.className = 'ob-summary';
            bar.insertBefore(summary, bar.firstChild);
        }
        summary.innerHTML = '';
        var title = document.createElement('div');
        title.className = 'obs-title';
        title.textContent = tr('your_order', 'Your order');
        summary.appendChild(title);
        var keys = Object.keys(cart).filter(function (k) { return cart[k] > 0 && MENU[k]; });
        if (!keys.length) {
            var none = document.createElement('p');
            none.className = 'obs-empty';
            none.textContent = tr('obs_empty', 'Add dishes from the menu to see them here.');
            summary.appendChild(none);
            return;
        }
        keys.forEach(function (k) {
            var row = document.createElement('div');
            row.className = 'obs-row';
            var name = document.createElement('span');
            name.textContent = (MENU[k].shortName || MENU[k].name) + ' × ' + cart[k];
            var price = document.createElement('b');
            price.textContent = '₹' + (MENU[k].price * cart[k]);
            row.appendChild(name);
            row.appendChild(price);
            summary.appendChild(row);
        });
    }
    if (total) new MutationObserver(renderSummary).observe(total, { childList: true, characterData: true, subtree: true });
    renderSummary();

    // ---- Order placed: confetti + the chef with a THANK YOU sign ----
    // Only for a confirmed order: green tick and a real order id (not "Checking…" / "—").
    var successPanel = document.getElementById('step-success');
    var sid = document.getElementById('s-order-id');
    var iconWrap = document.getElementById('success-icon-wrap');
    var celebrated = null;
    function checkSuccess() {
        if (!successPanel || successPanel.classList.contains('hidden') || !sid) return;
        var id = (sid.textContent || '').trim();
        if (!id || id === '—' || /check/i.test(id) || id === celebrated) return;
        var svg = iconWrap && iconWrap.querySelector('svg');
        if (!svg || (svg.getAttribute('stroke') || '').toLowerCase() !== '#22c55e') return;
        celebrated = id;
        celebrate();
    }
    function celebrate() {
        var card = document.querySelector('#step-success .success-card');
        if (card && window.ASChef && !card.querySelector('.success-chef')) {
            var wrap = document.createElement('div');
            wrap.className = 'success-chef is-open';
            wrap.setAttribute('aria-hidden', 'true');
            wrap.innerHTML = window.ASChef.svg();
            wrap.querySelector('.sign-text').textContent = tr('chef_sign_thanks', 'THANK YOU');
            card.insertBefore(wrap, card.firstChild);
        }
        if (window.ASTheme && ASTheme.haptic) ASTheme.haptic([30, 50, 60]);
        confetti();
    }
    function confetti() {
        if (reduce) return;
        var c = document.createElement('canvas');
        c.className = 'confetti';
        var dpr = Math.min(window.devicePixelRatio || 1, 2), W = window.innerWidth, H = window.innerHeight;
        c.width = W * dpr; c.height = H * dpr;
        document.body.appendChild(c);
        var ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        var colors = ['#ff6a1a', '#ffb27a', '#ffd27a', '#f15a0a', '#fff3e0', '#22c55e'];
        var parts = [];
        for (var i = 0; i < 150; i++) {
            var left = i % 2 === 0;
            parts.push({
                x: left ? -10 : W + 10, y: H * 0.62,
                vx: (left ? 1 : -1) * (4 + Math.random() * 8), vy: -(9 + Math.random() * 10),
                w: 6 + Math.random() * 6, h: 3 + Math.random() * 5,
                r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, color: colors[i % colors.length]
            });
        }
        var t0 = performance.now(), LIFE = 2800;
        (function frame(now) {
            var t = now - t0;
            ctx.clearRect(0, 0, W, H);
            parts.forEach(function (p) {
                p.vy += 0.32; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.globalAlpha = Math.max(0, 1 - t / LIFE);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (t < LIFE) requestAnimationFrame(frame);
            else if (c.parentNode) c.parentNode.removeChild(c);
        })(t0);
        setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, LIFE + 1500);   // hidden tabs get no frames
    }
    if (successPanel) new MutationObserver(checkSuccess).observe(successPanel, { attributes: true, attributeFilter: ['class'] });
    if (sid) new MutationObserver(checkSuccess).observe(sid, { childList: true, characterData: true, subtree: true });
    if (iconWrap) new MutationObserver(checkSuccess).observe(iconWrap, { childList: true, subtree: true });
})();
