/* ============================================
   AAPLA SWAD — Navratri festival layer
   Presentation only: no API calls, no cart or order changes.
   - Turns itself on until the day after Dussehra (FEST below), then the site
     looks exactly as before. ?navratri=1 forces it on, ?navratri=0 off.
   - Home: a "FREE dandiya on your first order" intro once per session, and a
     hero card with a boy and girl playing dandiya.
   - Every page: a marigold toran under the header and a festive glow.
   To remove after the festival: delete navratri.css / navratri.js and their
   two tags in each page.
   Testing: ?nvintro=1 shows the intro again, ?nvintro=0 skips it.
   ============================================ */
(function () {
    // Sharad Navratri 2026: day 1 on 11 Oct, Dussehra on 20 Oct (local time)
    var FEST = { start: new Date(2026, 9, 11), days: 9, end: new Date(2026, 9, 21) };

    var root = document.documentElement;
    var q = location.search.match(/[?&]navratri=([01])/);
    try {
        if (q) sessionStorage.setItem('nv_force', q[1]);
        var forced = sessionStorage.getItem('nv_force');
    } catch (e) { forced = q && q[1]; }
    var on = forced === '1' ? true : forced === '0' ? false : Date.now() < FEST.end.getTime();
    if (!on) return;
    root.classList.add('nv');

    var isHome = /(^\/$|\/index(\.html)?$)/.test(location.pathname) || location.pathname === '';
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // The intro replaces the chef greeter on the home page while the festival is on
    var showIntro = false;
    if (isHome) {
        try {
            var want = /[?&]nvintro=1/.test(location.search) || (!sessionStorage.getItem('nv_intro_seen') && !/[?&]nvintro=0/.test(location.search));
            if (want) {
                showIntro = true;
                sessionStorage.setItem('nv_intro_seen', '1');
            }
            sessionStorage.setItem('as_chef_seen', '1');
        } catch (e) { /* storage blocked: no intro */ }
    }

    // ---- Copy, in the three app languages ----
    var STR = {
        en: {
            kicker: 'Navratri special', title: 'Shubh Navratri', heroSub: 'Nine nights of garba and good food',
            free: 'FREE Dandiya', first: 'with your first order',
            fine: 'A pair of dandiya sticks comes with your first Aapla Swad order, till Dussehra.',
            order: 'Order now', explore: 'Explore menu', close: 'Close',
            day: 'Day {n} of 9', starts: 'Starts in {n} days', starts1: 'Starts tomorrow', dussehra: 'Happy Dussehra',
            banner: 'Navratri offer: FREE dandiya with your first order', art: 'A boy and a girl playing dandiya'
        },
        hi: {
            kicker: 'नवरात्रि स्पेशल', title: 'शुभ नवरात्रि', heroSub: 'नौ रातें, गरबा और स्वाद',
            free: 'डांडिया फ्री', first: 'पहले ऑर्डर पर',
            fine: 'दशहरे तक, Aapla Swad पर आपके पहले ऑर्डर के साथ डांडिया की एक जोड़ी।',
            order: 'अभी ऑर्डर करें', explore: 'मेन्यू देखें', close: 'बंद करें',
            day: 'दिन {n} / 9', starts: '{n} दिन में शुरू', starts1: 'कल से शुरू', dussehra: 'दशहरे की शुभकामनाएँ',
            banner: 'नवरात्रि ऑफ़र: पहले ऑर्डर पर डांडिया फ्री', art: 'डांडिया खेलते लड़का और लड़की'
        },
        mr: {
            kicker: 'नवरात्री स्पेशल', title: 'शुभ नवरात्री', heroSub: 'नऊ रात्री, गरबा आणि स्वाद',
            free: 'दांडिया मोफत', first: 'पहिल्या ऑर्डरवर',
            fine: 'दसऱ्यापर्यंत, Aapla Swad वरील तुमच्या पहिल्या ऑर्डरसोबत दांडियाची एक जोडी.',
            order: 'आता ऑर्डर करा', explore: 'मेन्यू पहा', close: 'बंद करा',
            day: 'दिवस {n} / 9', starts: '{n} दिवसांत सुरू', starts1: 'उद्यापासून सुरू', dussehra: 'दसऱ्याच्या शुभेच्छा',
            banner: 'नवरात्री ऑफर: पहिल्या ऑर्डरवर दांडिया मोफत', art: 'दांडिया खेळणारे मुलगा आणि मुलगी'
        }
    };
    function lang() {
        var l = (typeof window.getLang === 'function' && window.getLang()) || 'en';
        return STR[l] ? l : 'en';
    }
    function s(key) { return STR[lang()][key] || STR.en[key]; }

    function dayLabel() {
        var today = new Date(); today.setHours(0, 0, 0, 0);
        var diff = Math.round((today - FEST.start) / 86400000);
        if (diff < 0) return -diff === 1 ? s('starts1') : s('starts').replace('{n}', -diff);
        if (diff < FEST.days) return s('day').replace('{n}', diff + 1);
        return s('dussehra');
    }

    function paint(scope) {
        [].forEach.call((scope || document).querySelectorAll('[data-nv]'), function (el) {
            var k = el.getAttribute('data-nv');
            if (k === 'day') el.textContent = dayLabel();
            else if (k === 'art') el.setAttribute('aria-label', s('art'));
            else if (k === 'close') el.setAttribute('aria-label', s('close'));
            else el.textContent = s(k);
        });
    }

    // ---- Artwork ----
    function stick(x1, y1, x2, y2) {
        return '<g class="nv-stick">' +
            '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#f5c451" stroke-width="3.4" stroke-linecap="round"/>' +
            '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#e0115f" stroke-width="3.4" stroke-dasharray="2.5 5" stroke-linecap="butt"/>' +
            '<circle cx="' + x1 + '" cy="' + y1 + '" r="2.4" fill="#e0115f"/>' +
            '</g>';
    }

    function toran(width, y, sag) {
        var out = '<path d="M0 ' + y + ' ';
        var seg = 90, i, x;
        for (x = 0; x < width; x += seg) out += 'Q' + (x + seg / 2) + ' ' + (y + sag * 2) + ' ' + (x + seg) + ' ' + y + ' ';
        out += '" fill="none" stroke="#7c4a12" stroke-width="1"/>';
        var cols = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c'];
        for (i = 0, x = 5; x < width; x += 11, i++) {
            var t = (x % seg) / seg;
            var yy = y + sag * 4 * t * (1 - t);
            out += '<circle cx="' + x + '" cy="' + yy.toFixed(1) + '" r="4.6" fill="' + cols[i % 4] + '"/>' +
                '<circle cx="' + x + '" cy="' + yy.toFixed(1) + '" r="1.6" fill="#9a3412" opacity=".55"/>';
        }
        for (x = seg / 2; x < width; x += seg) {
            out += '<path d="M' + x + ' ' + (y + sag + 4) + ' q-4 8 0 15 q4 -7 0 -15z" fill="#16a34a"/>';
        }
        return out;
    }

    function coupleSVG() {
        var stars = [[30, 60], [64, 34], [292, 92], [214, 30], [150, 40], [340, 64], [18, 120], [96, 96]].map(function (p, i) {
            return '<circle class="nv-twinkle" style="animation-delay:' + (i * 0.37).toFixed(2) + 's" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (i % 3 ? 1.1 : 1.7) + '" fill="#fff4d6"/>';
        }).join('');
        var petals = '';
        for (var a = 0; a < 360; a += 30) {
            petals += '<ellipse cx="0" cy="-46" rx="8" ry="18" transform="rotate(' + a + ')" fill="none" stroke="#f5c451" stroke-width="1.6"/>';
        }
        var mirrors = '';
        for (var m = 97; m <= 153; m += 8) mirrors += '<circle cx="' + m + '" cy="' + (176 + Math.abs(m - 125) * 0.08).toFixed(1) + '" r="1.5" fill="#fff7d6"/>';

        return '<svg class="nv-art" viewBox="0 0 360 220" role="img" data-nv="art" aria-label="">' +
            '<defs>' +
            '<radialGradient id="nvGlow" cx="50%" cy="55%" r="55%"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>' +
            '<linearGradient id="nvSkirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0287c"/><stop offset="1" stop-color="#a3124f"/></linearGradient>' +
            '<linearGradient id="nvKedi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf2"/><stop offset="1" stop-color="#f6dfc0"/></linearGradient>' +
            '<linearGradient id="nvLamp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#e11d48"/></linearGradient>' +
            '</defs>' +
            '<ellipse cx="180" cy="128" rx="170" ry="100" fill="url(#nvGlow)"/>' +
            stars +
            '<path d="M326 30a15 15 0 1 0 9 26a12 12 0 1 1 -9 -26z" fill="#ffe7b0" opacity=".9"/>' +
            // hanging lanterns
            '<g class="nv-lamp" style="transform-origin:34px 0"><line x1="34" y1="0" x2="34" y2="40" stroke="#7c4a12"/><path d="M24 40h20l-3 22h-14z" fill="url(#nvLamp)"/><path d="M27 62h14l-7 8z" fill="#be123c"/><line x1="34" y1="70" x2="34" y2="82" stroke="#fbbf24" stroke-width="1.4"/><circle cx="34" cy="51" r="3.5" fill="#fff3c4" opacity=".9"/></g>' +
            '<g class="nv-lamp nv-lamp-2" style="transform-origin:286px 0"><line x1="286" y1="0" x2="286" y2="30" stroke="#7c4a12"/><path d="M277 30h18l-3 19h-12z" fill="url(#nvLamp)"/><path d="M280 49h12l-6 7z" fill="#be123c"/><line x1="286" y1="56" x2="286" y2="66" stroke="#fbbf24" stroke-width="1.4"/><circle cx="286" cy="39" r="3" fill="#fff3c4" opacity=".9"/></g>' +
            toran(360, 0, 9) +
            // rangoli on the floor
            '<g transform="translate(180 200) scale(1 .24)"><g class="nv-spin">' +
            '<circle r="78" fill="none" stroke="#e0115f" stroke-width="2" stroke-dasharray="4 7" opacity=".8"/>' +
            '<circle r="62" fill="none" stroke="#f5c451" stroke-width="1.6" opacity=".7"/>' + petals +
            '<circle r="20" fill="#e0115f" opacity=".55"/><circle r="9" fill="#f5c451"/></g></g>' +
            // ---- girl ----
            '<g class="nv-girl">' +
            '<ellipse cx="125" cy="200" rx="36" ry="4" fill="#000" opacity=".35"/>' +
            '<g class="nv-arm nv-arm-gb">' + stick(104, 66, 95, 42) + '<path d="M116 90 Q106 80 104 66" fill="none" stroke="#b5764a" stroke-width="5" stroke-linecap="round"/><circle cx="105" cy="72" r="2.2" fill="none" stroke="#f5c451" stroke-width="1.4"/></g>' +
            '<ellipse cx="116" cy="199" rx="6" ry="3" fill="#7c2d12"/><ellipse cx="135" cy="199" rx="6" ry="3" fill="#7c2d12"/>' +
            '<g class="nv-skirt">' +
            '<path d="M112 112 L138 112 C150 140 159 170 165 196 Q125 207 85 196 C91 170 100 140 112 112Z" fill="url(#nvSkirt)"/>' +
            '<path d="M117 113 L100 195 M125 113 L125 200 M133 113 L150 195" stroke="#5b0a2e" stroke-width="1.2" opacity=".35" fill="none"/>' +
            '<path d="M95 172 Q125 182 155 172" stroke="#10b981" stroke-width="3.2" fill="none"/>' + mirrors +
            '<path d="M86 195 Q125 207 164 195" stroke="#f5c451" stroke-width="4" fill="none"/>' +
            '</g>' +
            '<path d="M114 86 Q125 82 136 86 L137 112 L113 112Z" fill="#0f9d6e"/><path d="M113 111 L137 111" stroke="#f5c451" stroke-width="3"/>' +
            '<path class="nv-dupatta" d="M135 86 C121 99 105 104 92 117 C87 123 95 127 100 122 C110 112 124 104 137 93Z" fill="#f59e0b"/>' +
            '<rect x="121.5" y="71" width="7" height="13" rx="3" fill="#b5764a"/>' +
            '<circle cx="125" cy="63" r="11.5" fill="#b5764a"/>' +
            '<path d="M113.6 65 A11.5 11.5 0 0 1 135.5 57.5 Q129 51 121 52.5 Q113 55.5 113.6 65Z" fill="#1c1210"/>' +
            '<circle cx="111.5" cy="61" r="6.4" fill="#1c1210"/><circle cx="108.5" cy="57.5" r="2.3" fill="#fbbf24"/><circle cx="112" cy="55.6" r="1.8" fill="#f8fafc"/>' +
            '<path d="M127.5 62 q2 1.6 4 0" stroke="#2a1410" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
            '<path d="M129 67.6 q2 1.3 4 -.3" stroke="#7f1d1d" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
            '<circle cx="131.6" cy="57.6" r="1.1" fill="#dc2626"/><circle cx="121" cy="69.5" r="1.7" fill="#fbbf24"/>' +
            '<g class="nv-arm nv-arm-gf">' + stick(156, 84, 178, 67) + '<path d="M135 90 Q148 93 156 84" fill="none" stroke="#b5764a" stroke-width="5" stroke-linecap="round"/><circle cx="151" cy="88.5" r="2.2" fill="none" stroke="#f5c451" stroke-width="1.4"/></g>' +
            '</g>' +
            // ---- boy ----
            '<g class="nv-boy">' +
            '<ellipse cx="235" cy="200" rx="30" ry="4" fill="#000" opacity=".35"/>' +
            '<g class="nv-arm nv-arm-bb">' + stick(256, 66, 265, 42) + '<path d="M244 90 Q254 80 256 66" fill="none" stroke="#a86b42" stroke-width="5" stroke-linecap="round"/></g>' +
            '<path d="M227 146 L225 196 L232 196 L234.5 146Z M236 146 L238.5 196 L245.5 196 L243.5 146Z" fill="#f4ede0"/>' +
            '<path d="M226 186 h7 M239 186 h7 M226 178 h7 M239 178 h7" stroke="#d6c7ae" stroke-width="1"/>' +
            '<path d="M222 199 q4 -4 12 -1 l-2 3 q-6 1 -10 -2z M238 198 q8 -3 12 1 q-4 3 -10 2z" fill="#9f1239"/>' +
            '<g class="nv-frill"><path d="M224 116 L246 116 L262 148 Q258 153 254 148 Q250 153 246 148 Q242 153 238 148 Q234 153 230 148 Q226 153 222 148 Q218 153 214 148 Q210 152 208 148 Z" fill="url(#nvKedi)"/>' +
            '<path d="M212 141 Q235 147 258 141" stroke="#dc2626" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/></g>' +
            '<path d="M223 86 Q235 82 247 86 L246 118 L224 118Z" fill="url(#nvKedi)"/>' +
            '<path d="M230 90 l3 4 l2 -4 l3 4 l2 -4 l3 4" stroke="#0f9d6e" stroke-width="1.4" fill="none"/>' +
            '<rect x="223" y="112" width="24" height="5.5" rx="1.5" fill="#dc2626"/><path d="M245 116 l5 15 l-4 0z" fill="#dc2626"/>' +
            '<rect x="231.5" y="71" width="7" height="13" rx="3" fill="#a86b42"/>' +
            '<circle cx="235" cy="63" r="11.5" fill="#a86b42"/>' +
            '<path d="M246 56 Q259 60 259 78 Q252 69 244.5 63Z" fill="#dc2626"/>' +
            '<path d="M222.5 61 Q223 45.5 235.5 45.5 Q248 45.5 248 59 Q235.5 54 222.5 61Z" fill="#f97316"/>' +
            '<path d="M223 57.5 Q235.5 51 247.5 55" stroke="#fde047" stroke-width="2" fill="none"/>' +
            '<circle cx="230" cy="50" r="1" fill="#fff"/><circle cx="236" cy="48.5" r="1" fill="#fff"/><circle cx="242" cy="50" r="1" fill="#fff"/><circle cx="233" cy="53" r="1" fill="#fff"/><circle cx="239.5" cy="52.4" r="1" fill="#fff"/>' +
            '<path d="M232.5 62 q-2 1.6 -4 0" stroke="#2a1410" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
            '<path d="M224.6 67.5 q2.6 -1.8 5 0 q2.4 -1.8 5 0" stroke="#1c1210" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
            '<g class="nv-arm nv-arm-bf">' + stick(204, 84, 182, 67) + '<path d="M226 90 Q212 93 204 84" fill="none" stroke="#a86b42" stroke-width="5" stroke-linecap="round"/><circle cx="209" cy="88.5" r="2.2" fill="none" stroke="#f5c451" stroke-width="1.4"/></g>' +
            '</g>' +
            // the clack
            '<g class="nv-spark" style="transform-origin:180px 66px">' +
            '<circle cx="180" cy="66" r="4" fill="#fff6d1"/>' +
            '<path d="M180 52v6M180 74v6M166 66h6M188 66h6M170 56l4 4M186 72l4 4M190 56l-4 4M174 72l-4 4" stroke="#ffd56b" stroke-width="2" stroke-linecap="round"/>' +
            '</g>' +
            '</svg>';
    }

    function pairSVG() {
        // Two decorated dandiya sticks that clack together
        function big(x1, y1, x2, y2) {
            return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#f5c451" stroke-width="8" stroke-linecap="round"/>' +
                '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#e0115f" stroke-width="8" stroke-dasharray="5 9"/>' +
                '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#10b981" stroke-width="8" stroke-dasharray="2 12" stroke-dashoffset="-7"/>' +
                '<circle cx="' + x1 + '" cy="' + y1 + '" r="5" fill="#fbbf24"/>' +
                '<path d="M' + x1 + ' ' + (y1 + 4) + ' l-4 14 M' + x1 + ' ' + (y1 + 4) + ' l0 15 M' + x1 + ' ' + (y1 + 4) + ' l4 14" stroke="#e11d48" stroke-width="2" stroke-linecap="round"/>';
        }
        return '<svg class="nv-pair" viewBox="0 0 200 170" aria-hidden="true">' +
            '<g class="nv-burst"><circle cx="100" cy="72" r="46" fill="none" stroke="#f5c451" stroke-width="1.2" stroke-dasharray="2 6" opacity=".7"/><circle cx="100" cy="72" r="30" fill="#f5c451" opacity=".08"/></g>' +
            '<g class="nv-pa" style="transform-origin:58px 146px">' + big(58, 146, 130, 30) + '</g>' +
            '<g class="nv-pb" style="transform-origin:142px 146px">' + big(142, 146, 70, 30) + '</g>' +
            '<g class="nv-spark" style="transform-origin:100px 66px"><circle cx="100" cy="66" r="6" fill="#fff6d1"/>' +
            '<path d="M100 44v9M100 79v9M78 66h9M113 66h9M84 50l6 6M110 76l6 6M116 50l-6 6M90 76l-6 6" stroke="#ffd56b" stroke-width="2.6" stroke-linecap="round"/></g>' +
            '</svg>';
    }

    function miniStick() {
        // two decorated sticks side by side, so it never reads as a close "X"
        return '<svg viewBox="0 0 24 24" aria-hidden="true" class="nv-mini">' +
            '<path d="M4.5 20.5 L11 3.5 M13 20.5 L19.5 3.5" stroke="#ffd56b" stroke-width="2.8" stroke-linecap="round"/>' +
            '<path d="M4.5 20.5 L11 3.5 M13 20.5 L19.5 3.5" stroke="#10b981" stroke-width="2.8" stroke-dasharray="1.6 3.4"/>' +
            '<circle cx="4.6" cy="20.2" r="1.9" fill="#fff"/><circle cx="13.1" cy="20.2" r="1.9" fill="#fff"/></svg>';
    }

    // ---- Pieces ----
    function addToran() {
        var bars = document.querySelectorAll('.app-header, .order-nav, .dish-nav');
        [].forEach.call(bars, function (bar) {
            if (bar.querySelector(':scope > .nv-toran')) return;
            var t = document.createElement('div');
            t.className = 'nv-toran';
            t.setAttribute('aria-hidden', 'true');
            bar.appendChild(t);
        });
    }

    function addHero() {
        var greet = document.querySelector('.greet');
        if (!greet || document.querySelector('.nv-hero')) return;
        var sec = document.createElement('section');
        sec.className = 'nv-hero';
        sec.innerHTML =
            '<div class="nv-hero-text">' +
            '<p class="nv-kicker"><span class="nv-dot"></span><span data-nv="day"></span></p>' +
            '<h2 class="nv-title" data-nv="title"></h2>' +
            '<p class="nv-sub" data-nv="heroSub"></p>' +
            '<a class="nv-offer" href="order.html">' + miniStick() +
            '<span><b data-nv="free"></b> <span data-nv="first"></span></span>' +
            '<svg class="nv-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
            '</div>' +
            '<div class="nv-stage">' + coupleSVG() + '</div>' +
            '<div class="nv-petals" aria-hidden="true"></div>';
        greet.parentNode.insertBefore(sec, greet.nextSibling);
        if (!reduce) {
            var box = sec.querySelector('.nv-petals'), html = '';
            for (var i = 0; i < 14; i++) {
                html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;--dx:' + (Math.random() * 60 - 30).toFixed(0) +
                    'px;animation-duration:' + (7 + Math.random() * 6).toFixed(1) + 's;animation-delay:-' + (Math.random() * 12).toFixed(1) +
                    's;--sz:' + (5 + Math.random() * 5).toFixed(1) + 'px;--c:' + ['#f59e0b', '#f97316', '#fbbf24', '#e0115f'][i % 4] + '"></i>';
            }
            box.innerHTML = html;
        }
        paint(sec);
    }

    function addOrderBanner() {
        var main = document.querySelector('.order-main');
        if (!main || document.querySelector('.nv-banner')) return;
        var b = document.createElement('div');
        b.className = 'nv-banner';
        b.innerHTML = miniStick() + '<span data-nv="banner"></span><span class="nv-banner-day" data-nv="day"></span>';
        main.insertBefore(b, main.firstChild);
        paint(b);
    }

    function addIntro() {
        var wrap = document.createElement('div');
        wrap.className = 'nv-intro';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'nvIntroTitle');
        wrap.innerHTML =
            '<div class="nv-intro-bg" aria-hidden="true"><div class="nv-mandala"></div></div>' +
            '<div class="nv-intro-toran" aria-hidden="true"></div>' +
            '<button type="button" class="nv-x" data-nv="close" aria-label=""><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>' +
            '<div class="nv-intro-card">' +
            '<p class="nv-intro-kicker" data-nv="kicker"></p>' +
            '<h2 class="nv-intro-title" id="nvIntroTitle" data-nv="title"></h2>' +
            '<div class="nv-intro-art">' + pairSVG() + '</div>' +
            '<div class="nv-intro-offer"><b data-nv="free"></b><span data-nv="first"></span></div>' +
            '<p class="nv-intro-fine" data-nv="fine"></p>' +
            '<div class="nv-intro-cta"><a class="nv-btn" href="order.html" data-nv="order"></a>' +
            '<button type="button" class="nv-btn nv-btn-ghost" data-nv="explore"></button></div>' +
            '<p class="nv-intro-day" data-nv="day"></p>' +
            '</div>';
        document.body.appendChild(wrap);
        paint(wrap);
        document.body.classList.add('nv-locked');

        function close() {
            if (wrap.classList.contains('out')) return;
            wrap.classList.add('out');
            document.body.classList.remove('nv-locked');
            setTimeout(function () { wrap.remove(); }, 450);
            document.removeEventListener('keydown', onKey);
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        wrap.querySelector('.nv-x').addEventListener('click', close);
        wrap.querySelector('.nv-btn-ghost').addEventListener('click', close);
        wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.classList.contains('nv-intro-bg')) close(); });
        document.addEventListener('keydown', onKey);

        // Focus the main action once the splash (if any) has gone
        var tries = 0;
        (function focusWhenVisible() {
            if (document.getElementById('aapla-splash') && tries++ < 40) return setTimeout(focusWhenVisible, 150);
            var a = wrap.querySelector('.nv-btn');
            if (a) a.focus({ preventScroll: true });
        })();
    }

    function boot() {
        addToran();
        if (isHome) addHero();
        addOrderBanner();
        if (showIntro) addIntro();
        document.addEventListener('as:lang', function () { paint(document); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
