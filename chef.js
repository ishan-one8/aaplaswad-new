/* ============================================
   AAPLA SWAD — Chef greeter
   The first time the home page opens in a session, a little chef rises up
   holding a sign: OPEN with a welcome, or CLOSED with the opening time.
   He leaves on his own after a few seconds. Presentation only — it reads
   the open/closed state the page already knows and changes nothing.

   Demo: add ?chef, ?chef=open, ?chef=night, ?chef=early or ?chef=paused
   to the URL to see him again, in any state.
   ============================================ */
(function () {
    var SEEN = 'as_chef_seen';
    var force = (window.location.search.match(/[?&]chef(?:=([a-z]+))?/) || [])[0] !== undefined;
    var forcedState = (window.location.search.match(/[?&]chef=([a-z]+)/) || [])[1];

    // Greet once per session, and only on the home page (other pages borrow the drawing)
    function shouldGreet() {
        if (!document.getElementById('menuTop')) return false;
        if (force) return true;
        try {
            if (sessionStorage.getItem(SEEN)) return false;
            sessionStorage.setItem(SEEN, '1');
            return true;
        } catch (e) { return false; }
    }

    var tr = function (k, f) { return typeof window.t === 'function' ? window.t(k, f) : f; };
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    var COPY = {
        open:   { sign: ['chef_sign_open', 'OPEN'],     title: null,                                                   sub: ['chef_open_sub', 'The kitchen is open — hot food at your door in about 30 minutes.'], ms: 5500 },
        night:  { sign: ['chef_sign_closed', 'CLOSED'], title: ['chef_night_title', "We're closed for the night"],     sub: ['chef_night_sub', 'The kitchen opens again at 10 AM. Sweet dreams!'], ms: 6500 },
        early:  { sign: ['chef_sign_closed', 'CLOSED'], title: ['chef_early_title', 'Almost time!'],                   sub: ['chef_early_sub', 'The kitchen opens at 10 AM. Have a look at the menu meanwhile.'], ms: 6000 },
        paused: { sign: ['chef_sign_paused', 'BRB'],    title: ['chef_paused_title', 'Orders are paused'],             sub: ['chef_paused_sub', "We'll be back in a little while."], ms: 6000 }
    };

    function currentState() {
        if (forcedState && COPY[forcedState]) return forcedState;
        var h = new Date().getHours();
        var inHours = h >= 10 && h < 22;
        var open = typeof window.asShopOpen === 'function' ? window.asShopOpen() : inHours;
        if (open) return 'open';
        if (inHours) return 'paused';                 // within hours, so the admin paused orders
        return (h >= 22 || h < 5) ? 'night' : 'early';
    }

    function firstName() {
        try {
            var u = JSON.parse(localStorage.getItem('sp_google_user') || 'null');
            return u && u.name ? String(u.name).split(' ')[0] : '';
        } catch (e) { return ''; }
    }

    var CHEF_SVG =
        '<svg class="chef-svg" viewBox="0 0 220 262" aria-hidden="true" focusable="false">' +
            '<ellipse class="chef-shadow" cx="110" cy="256" rx="62" ry="6"/>' +
            '<path class="chef-moon" d="M44 40a16 16 0 1 0 20 22a13 13 0 1 1 -20 -22z"/>' +
            '<g class="chef-zzz"><text x="158" y="74">z</text><text x="170" y="56">z</text><text x="184" y="36">Z</text></g>' +
            '<g class="chef-spark">' +
                '<path d="M38 150l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>' +
                '<path d="M186 140l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>' +
                '<path d="M28 96l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>' +
                '<path d="M194 88l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"/>' +
            '</g>' +
            '<g class="chef-all">' +
                // coat, neck, neckerchief
                '<path d="M50 262C50 206 70 178 110 178s60 28 60 84z" fill="#fffaf5" stroke="#eadfd4" stroke-width="2"/>' +
                '<rect x="100" y="154" width="20" height="28" rx="8" fill="#e3a97c"/>' +
                '<path d="M88 178l22 22 22-22z" fill="#f15a0a"/>' +
                '<circle cx="110" cy="192" r="5" fill="#c2410c"/>' +
                // sleeves reaching for the sign
                '<path d="M80 188Q62 194 60 206M140 188Q158 194 160 206" stroke="#eadfd4" stroke-width="21" stroke-linecap="round" fill="none"/>' +
                '<path d="M80 188Q62 194 60 206M140 188Q158 194 160 206" stroke="#fffaf5" stroke-width="17" stroke-linecap="round" fill="none"/>' +
                '<g class="chef-head">' +
                    '<circle cx="72" cy="128" r="7" fill="#e3a97c"/><circle cx="148" cy="128" r="7" fill="#e3a97c"/>' +
                    '<circle cx="110" cy="126" r="38" fill="#f4c9a1"/>' +
                    '<path d="M72 94C58 88 60 62 80 62c4-18 24-24 34-14 12-10 36-2 32 18 16 4 14 26 0 28z" fill="#fffaf5" stroke="#eadfd4" stroke-width="2"/>' +
                    '<rect x="74" y="86" width="72" height="16" rx="6" fill="#fffaf5" stroke="#eadfd4" stroke-width="2"/>' +
                    '<path d="M96 66v18M110 60v24M124 66v18" stroke="#eadfd4" stroke-width="2" stroke-linecap="round"/>' +
                    '<path d="M88 113q7-5 14 0M118 113q7-5 14 0" stroke="#5b3a24" stroke-width="3" fill="none" stroke-linecap="round"/>' +
                    '<g class="chef-eyes-open">' +
                        '<ellipse cx="95" cy="122" rx="4" ry="5" fill="#2b1a10"/><ellipse cx="125" cy="122" rx="4" ry="5" fill="#2b1a10"/>' +
                        '<circle cx="96.5" cy="120" r="1.3" fill="#fff"/><circle cx="126.5" cy="120" r="1.3" fill="#fff"/>' +
                    '</g>' +
                    '<path class="chef-eyes-sleep" d="M90 123q5 4 10 0M120 123q5 4 10 0" stroke="#2b1a10" stroke-width="3" fill="none" stroke-linecap="round"/>' +
                    '<circle cx="86" cy="138" r="6" fill="#f08c6c" opacity=".45"/><circle cx="134" cy="138" r="6" fill="#f08c6c" opacity=".45"/>' +
                    '<path d="M110 126q5 8-2 11" stroke="#d99a70" stroke-width="3" fill="none" stroke-linecap="round"/>' +
                    '<path d="M110 141c-6-7-20-7-25 1 6-2 12 1 15 4 4 2 8 0 10-2 2 2 6 4 10 2 3-3 9-6 15-4-5-8-19-8-25-1z" fill="#5b3a24"/>' +
                    '<path class="chef-mouth-smile" d="M100 150q10 9 20 0" stroke="#8a3b1f" stroke-width="3" fill="none" stroke-linecap="round"/>' +
                    '<ellipse class="chef-mouth-sleep" cx="110" cy="152" rx="4" ry="3" fill="#8a3b1f"/>' +
                '</g>' +
                '<g class="chef-sign">' +
                    '<rect class="sign-board" x="44" y="200" width="132" height="52" rx="12"/>' +
                    '<rect class="sign-face" x="51" y="207" width="118" height="38" rx="8"/>' +
                    '<circle cx="58" cy="213" r="2.2" fill="rgba(255,255,255,.55)"/><circle cx="162" cy="213" r="2.2" fill="rgba(255,255,255,.55)"/>' +
                    '<text class="sign-text" x="110" y="233" text-anchor="middle"></text>' +
                '</g>' +
                '<circle cx="60" cy="206" r="10" fill="#f4c9a1" stroke="#e3a97c" stroke-width="1.5"/>' +
                '<circle cx="160" cy="206" r="10" fill="#f4c9a1" stroke="#e3a97c" stroke-width="1.5"/>' +
            '</g>' +
        '</svg>';

    function build(state) {
        var c = COPY[state];
        var name = firstName();
        var title = c.title
            ? tr(c.title[0], c.title[1])
            : (name ? tr('chef_welcome_back', 'Welcome back') + ', ' + name + '!' : tr('chef_open_title', 'Welcome to Aapla Swad!'));

        var el = document.createElement('div');
        el.className = 'chef-greet is-' + state + ((state === 'night') ? ' is-asleep' : '');
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-modal', 'false');
        el.setAttribute('aria-labelledby', 'chefTitle');
        el.setAttribute('aria-describedby', 'chefSub');
        el.style.setProperty('--chef-ms', c.ms + 'ms');
        el.innerHTML =
            '<div class="chef-scrim"></div>' +
            '<div class="chef-stage">' +
                '<div class="chef-bubble">' +
                    '<button type="button" class="chef-close">×</button>' +
                    '<b id="chefTitle"></b>' +
                    '<p id="chefSub"></p>' +
                    '<button type="button" class="btn btn-primary btn-block shine chef-cta"></button>' +
                    '<span class="chef-timer"><span></span></span>' +
                '</div>' +
                '<div class="chef-figure">' + CHEF_SVG + '</div>' +
            '</div>';
        el.querySelector('#chefTitle').textContent = title;
        el.querySelector('#chefSub').textContent = tr(c.sub[0], c.sub[1]);
        el.querySelector('.chef-cta').textContent = tr('chef_menu_cta', 'See the menu');
        el.querySelector('.chef-close').setAttribute('aria-label', tr('close_btn', 'Close'));
        el.querySelector('.sign-text').textContent = tr(c.sign[0], c.sign[1]);
        return el;
    }

    function show() {
        var state = currentState();
        var el = build(state);
        document.body.appendChild(el);
        requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('show'); }); });

        var left = COPY[state].ms, started = performance.now(), timer = null;
        function arm(ms) { clearTimeout(timer); timer = setTimeout(hide, ms); }
        function onKey(e) { if (e.key === 'Escape') hide(); }
        function hide() {
            clearTimeout(timer);
            if (el.classList.contains('leaving')) return;
            el.classList.add('leaving');
            document.removeEventListener('keydown', onKey);
            setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
        }

        // Hovering the bubble with a mouse holds the countdown
        var bubble = el.querySelector('.chef-bubble');
        bubble.addEventListener('pointerenter', function (e) {
            if (e.pointerType !== 'mouse') return;
            clearTimeout(timer);
            left -= performance.now() - started;
            el.classList.add('paused');
        });
        bubble.addEventListener('pointerleave', function (e) {
            if (e.pointerType !== 'mouse' || el.classList.contains('leaving')) return;
            started = performance.now();
            el.classList.remove('paused');
            arm(Math.max(600, left));
        });

        el.querySelector('.chef-scrim').addEventListener('click', hide);
        el.querySelector('.chef-close').addEventListener('click', hide);
        el.querySelector('.chef-cta').addEventListener('click', function () {
            hide();
            var menu = document.getElementById('menuTop');
            var header = document.querySelector('.app-header');
            if (!menu) return;
            setTimeout(function () {
                var y = menu.getBoundingClientRect().top + window.pageYOffset - (header ? header.offsetHeight : 0) - 12;
                window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
            }, 250);
        });
        document.addEventListener('keydown', onKey);
        arm(left);
    }

    // Wait for the splash to finish so the two never overlap
    function start() {
        var go = function () { setTimeout(show, 700); };
        if (!document.getElementById('aapla-splash')) return go();
        var done = false;
        var mo = new MutationObserver(function () {
            if (done || document.getElementById('aapla-splash')) return;
            done = true; mo.disconnect(); go();
        });
        mo.observe(document.body, { childList: true });
        setTimeout(function () { if (!done) { done = true; mo.disconnect(); go(); } }, 7000);
    }

    function boot() {
        if (!shouldGreet()) return;
        // Opened in a background tab: greet when it is actually looked at
        if (document.hidden) {
            document.addEventListener('visibilitychange', function once() {
                if (document.hidden) return;
                document.removeEventListener('visibilitychange', once);
                start();
            });
            return;
        }
        start();
    }

    // The order page reuses the chef for its "thank you" moment
    window.ASChef = { svg: function () { return CHEF_SVG; } };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
