/* ============================================
   AAPLA SWAD — Theme + motion
   Loaded in <head> so the dark theme is on the page before first paint. Everything here is presentation:
   it never reads or writes orders, auth or the API.
   ============================================ */
(function () {
    var KEY = 'as_theme';
    var root = document.documentElement;
    var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

    // ---- Line icons (one stroke style everywhere instead of emoji) ----
    // "F:" marks a filled icon. Use <i data-ic="name"></i> in markup or ASIcon(name) in JS.
    var ICONS = {
        home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
        bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M7.5 7.5c0-1.4 1-2 1-3.5M12 7.5c0-1.4 1-2 1-3.5M16.5 7.5c0-1.4 1-2 1-3.5"/>',
        utensils: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18"/><path d="M17 3c-2 1.5-3 4-3 7h3v11"/>',
        takeout: '<path d="M5 8h14l-1.5 12a1 1 0 0 1-1 .9h-9a1 1 0 0 1-1-.9z"/><path d="M4 8l2-4h12l2 4"/><path d="M9.5 4l.8 4M14.5 4l-.8 4"/>',
        wrap: '<path d="M4 15.5 15.5 4a3.5 3.5 0 0 1 4.9 4.9L9 20.4A3.5 3.5 0 1 1 4 15.5z"/><path d="M13 6.5l4.5 4.5M6.5 13l4.5 4.5"/>',
        wheat: '<path d="M12 22V10"/><path d="M12 10c-1.7-.9-2.5-2.3-2.5-4S10.3 3 12 2c1.7 1 2.5 2.3 2.5 4s-.8 3.1-2.5 4z"/><path d="M12 15c-2.6 0-4.6-1.4-5-4 2.6 0 4.6 1.4 5 4zM12 15c2.6 0 4.6-1.4 5-4-2.6 0-4.6 1.4-5 4zM12 20c-2.6 0-4.6-1.4-5-4 2.6 0 4.6 1.4 5 4zM12 20c2.6 0 4.6-1.4 5-4-2.6 0-4.6 1.4-5 4z"/>',
        chef: '<path d="M6 13.9A4 4 0 0 1 7.6 6.2a4.5 4.5 0 0 1 8.8 0A4 4 0 0 1 18 13.9V20H6z"/><path d="M6 17h12"/>',
        bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 11.5M5.5 17.5 9 10h6l-3 7.5"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        star: 'F:<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/>',
        flame: '<path d="M12 22c4 0 7-2.9 7-7 0-4-3-6.5-4-10-2.2 1.7-3 4-3 6-1-1-1.6-2.2-1.8-3.6C8 9 5 11.6 5 15c0 4.1 3 7 7 7z"/>',
        leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-6 5-9 16-10-1 11-4 16-10 17z"/><path d="M4 21c3-6 7-9 11-11"/>',
        droplet: '<path d="M12 2.7s-7 7.3-7 12.3a7 7 0 0 0 14 0c0-5-7-12.3-7-12.3z"/>',
        sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4M5 17v4M3 19h4"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
        'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
        alert: '<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
        lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5L15.5 10"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        pencil: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        smartphone: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
        banknote: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
        gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
        zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
        mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M3 7l9 6 9-6"/>',
        globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
        trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
        logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
        package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
        refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/>',
        tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
        cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 7H6"/>',
        clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h4"/>',
        heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
        mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>',
        download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
        sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
        moon: '<path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/>',
        contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
        chevron: '<path d="M6 9l6 6 6-6"/>'
    };

    function icon(name, extraClass) {
        var p = ICONS[name];
        if (!p) return '';
        var filled = p.indexOf('F:') === 0;
        return '<svg class="ic ic-' + name + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" ' +
            (filled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') +
            ' aria-hidden="true" focusable="false">' + (filled ? p.slice(2) : p) + '</svg>';
    }
    window.ASIcon = icon;

    // Swap every <i data-ic> placeholder for its SVG (keeps extra classes, id, style)
    function hydrateIcons(root) {
        var scope = root || document;
        var list = [];
        if (scope.nodeType === 1 && scope.matches && scope.matches('i[data-ic]')) list.push(scope);
        if (scope.querySelectorAll) list = list.concat([].slice.call(scope.querySelectorAll('i[data-ic]')));
        list.forEach(function (el) {
            var extra = (el.getAttribute('class') || '').replace(/(^|\s)ic(\s|$)/g, ' ').trim();
            var svg = icon(el.getAttribute('data-ic'), extra);
            if (!svg || !el.parentNode) return;
            el.insertAdjacentHTML('afterend', svg);
            var made = el.nextElementSibling;
            if (made && el.id) made.id = el.id;
            if (made && el.getAttribute('style')) made.setAttribute('style', el.getAttribute('style'));
            el.parentNode.removeChild(el);
        });
    }

    function saved() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function current() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0a09' : '#ffffff');
    }

    // One look for everyone: dark with orange. Clear any light choice saved
    // back when the site still had a theme toggle.
    try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
    apply('dark');
    root.classList.add('js-reveal');

    // Cards and sections slide up as they scroll into view
    function initReveal() {
        var els = document.querySelectorAll('[data-reveal]');
        if (!els.length) return;
        if (!('IntersectionObserver' in window)) {
            for (var i = 0; i < els.length; i++) els[i].classList.add('is-in');
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        for (var j = 0; j < els.length; j++) io.observe(els[j]);
    }

    // Header gains an edge once the page moves; hero parallax reads --sy
    function initScroll() {
        var header = document.querySelector('[data-scroll-header]');
        var parallax = document.querySelector('[data-parallax]');
        if (!header && !parallax) return;
        var ticking = false;
        function update() {
            ticking = false;
            var y = window.scrollY || window.pageYOffset;
            if (header) header.classList.toggle('is-scrolled', y > 6);
            if (parallax && y < 900) parallax.style.setProperty('--sy', y.toFixed(1));
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(update); }
        }, { passive: true });
        update();
    }

    var RIPPLE = '.btn, .ripple, .next-btn, .place-btn, .ob-btn, .bs-go-cart, .order-btn, .ci-add-btn, .bnav-item, .chip, .action-btn, .detect-btn-hero, .sug-add-btn';

    function initRipple() {
        document.addEventListener('pointerdown', function (e) {
            if (reduceMotion && reduceMotion.matches) return;
            var host = e.target.closest && e.target.closest(RIPPLE);
            if (!host || host.disabled) return;
            var rect = host.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height) * 2.2;
            var dot = document.createElement('span');
            dot.className = 'rp';
            dot.style.width = dot.style.height = size + 'px';
            dot.style.left = (e.clientX - rect.left - size / 2) + 'px';
            dot.style.top = (e.clientY - rect.top - size / 2) + 'px';
            host.appendChild(dot);
            setTimeout(function () { dot.remove(); }, 700);
        }, { passive: true });
    }

    var toastEl, toastTimer;
    function toast(msg, iconName) {
        if (!document.body) return;
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'as-toast';
            toastEl.setAttribute('role', 'status');
            document.body.appendChild(toastEl);
        }
        toastEl.innerHTML = iconName ? icon(iconName, 'toast-ic') : '';
        var text = document.createElement('span');
        text.textContent = msg;
        toastEl.appendChild(text);
        toastEl.classList.remove('show');
        void toastEl.offsetWidth;
        toastEl.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
    }

    // A tiny buzz on Android (browser + app) when something is added
    function haptic(ms) {
        try { if (navigator.vibrate) navigator.vibrate(ms || 10); } catch (e) { /* unsupported */ }
    }

    // On wide screens a bottom dock looks like a phone app stretched out, so the
    // same nav element moves into the header and comes back on narrow screens.
    function initDesktopNav() {
        var nav = document.querySelector('.bottom-nav');
        if (!nav || !window.matchMedia) return;
        var wide = window.matchMedia('(min-width: 1024px)');
        var home = { parent: nav.parentNode, next: nav.nextSibling };
        function place() {
            if (wide.matches) {
                var slot = document.querySelector('.app-header-inner, .order-nav-inner, .dish-nav-inner');
                if (!slot) return;
                var before = slot.querySelector('.nav-actions, .head-cta, .nav-profile-link, .dish-nav-inner > a.icon-btn');
                slot.insertBefore(nav, before || null);
                nav.classList.add('nav-top');
            } else if (nav.classList.contains('nav-top')) {
                nav.classList.remove('nav-top');
                home.parent.insertBefore(nav, home.next);
            }
        }
        place();
        if (wide.addEventListener) wide.addEventListener('change', place);
        else if (wide.addListener) wide.addListener(place);
    }

    function initIcons() {
        hydrateIcons(document);
        if (!('MutationObserver' in window)) return;
        // Content that page scripts add later (menus, timelines, map pins) gets icons too
        new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                [].forEach.call(m.addedNodes, function (n) {
                    if (n.nodeType === 1 && (n.matches('i[data-ic]') || n.querySelector('i[data-ic]'))) hydrateIcons(n);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    function boot() {
        initIcons();
        initReveal();
        initScroll();
        initRipple();
        initDesktopNav();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    window.ASTheme = {
        apply: apply, current: current,
        toast: toast, haptic: haptic, icon: icon, hydrateIcons: hydrateIcons
    };
})();
