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
        // a decorated dandiya: gold body, magenta and green bands, bells and a tassel at the grip
        return '<g class="nv-stick">' +
            '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#f5c451" stroke-width="3.6" stroke-linecap="round"/>' +
            '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#e0115f" stroke-width="3.6" stroke-dasharray="3 5"/>' +
            '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#10b981" stroke-width="3.6" stroke-dasharray="1.2 6.8" stroke-dashoffset="-3.6"/>' +
            '<circle cx="' + x2 + '" cy="' + y2 + '" r="2.2" fill="#ffe08a"/>' +
            '<circle cx="' + (x1 + 0.5) + '" cy="' + (y1 + 3.5) + '" r="1.6" fill="#fde68a"/>' +
            '<path d="M' + x1 + ' ' + (y1 + 2) + ' l-2.5 8 M' + x1 + ' ' + (y1 + 2) + ' l0 9 M' + x1 + ' ' + (y1 + 2) + ' l2.5 8" stroke="#e11d48" stroke-width="1.4" stroke-linecap="round"/>' +
            '</g>';
    }

    function toran(width, y, sag) {
        var seg = 100, x, i, out = '<path d="M0 ' + y + ' ';
        for (x = 0; x < width; x += seg) out += 'Q' + (x + seg / 2) + ' ' + (y + sag * 2) + ' ' + (x + seg) + ' ' + y + ' ';
        out += '" fill="none" stroke="#7c4a12" stroke-width="1.2"/>';
        var cols = ['#f59e0b', '#f97316', '#fbbf24', '#ea580c'];
        for (x = seg / 2; x < width; x += seg / 2) {
            // mango leaves hang at every dip and peak
            var ly = (x % seg === 0) ? y : y + sag;
            out += '<path d="M' + x + ' ' + (ly + 3) + ' q-5 9 0 18 q5 -9 0 -18z" fill="#15803d"/><path d="M' + x + ' ' + (ly + 4) + ' v15" stroke="#4ade80" stroke-width=".6"/>';
        }
        for (i = 0, x = 4; x < width; x += 9.5, i++) {
            var t = (x % seg) / seg, yy = y + sag * 4 * t * (1 - t);
            out += '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="4.6" fill="' + cols[i % 4] + '"/>' +
                '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="1.7" fill="#9a3412" opacity=".5"/>';
        }
        return out;
    }

    function genda(x, top, len) {
        // a vertical string of marigolds
        var out = '<g class="nv-genda" style="transform-origin:' + x + 'px ' + top + 'px"><line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + len) + '" stroke="#7c4a12"/>';
        for (var y = top + 6, i = 0; y < top + len; y += 8, i++) {
            out += '<circle cx="' + x + '" cy="' + y + '" r="4.2" fill="' + (i % 2 ? '#fbbf24' : '#f97316') + '"/>';
        }
        return out + '<path d="M' + x + ' ' + (top + len) + ' q-4 7 0 13 q4 -6 0 -13z" fill="#15803d"/></g>';
    }

    function diya(x, y, s) {
        return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s || 1) + ')">' +
            '<ellipse cx="0" cy="-3" rx="13" ry="9" fill="url(#nvFire)" opacity=".55"/>' +
            '<path d="M-9 0 Q0 9 9 0 Q4 -2 0 -2 Q-4 -2 -9 0Z" fill="#c2410c"/><path d="M-9 0 Q0 3 9 0" stroke="#fbbf24" stroke-width="1" fill="none"/>' +
            '<path class="nv-flame" d="M0 -12 C3 -7 3 -3 0 -2 C-3 -3 -3 -7 0 -12Z" fill="#ffd56b"/><path d="M0 -8 C1.2 -5 1 -3.4 0 -3 C-1 -3.4 -1.2 -5 0 -8Z" fill="#fff7d6"/>' +
            '</g>';
    }

    function coupleSVG() {
        var i, out = [];
        // ---- sky, mandala, lights, decorations ----
        var stars = [[24, 70], [58, 46], [372, 108], [236, 38], [150, 50], [392, 70], [16, 150], [96, 112], [318, 60]];
        var mandala = '';
        for (i = 0; i < 16; i++) mandala += '<ellipse cx="0" cy="-74" rx="11" ry="26" transform="rotate(' + (i * 22.5) + ')"/>';
        var petals2 = '';
        for (i = 0; i < 12; i++) petals2 += '<path d="M0 -40 Q9 -52 0 -64 Q-9 -52 0 -40Z" transform="rotate(' + (i * 30) + ')"/>';
        var lights = '';
        var bulbCols = ['#fde047', '#f472b6', '#4ade80', '#60a5fa', '#fb923c'];
        for (i = 0; i <= 20; i++) {
            var lx = 10 + i * 19, t = i / 20, ly = 34 + 26 * 4 * t * (1 - t);
            lights += '<circle class="nv-bulb" style="animation-delay:' + ((i % 5) * 0.3).toFixed(1) + 's" cx="' + lx + '" cy="' + ly.toFixed(1) + '" r="2.8" fill="' + bulbCols[i % 5] + '"/>';
        }

        // ---- ghagra gores (coloured panels) clipped to the skirt ----
        var gores = '', gcols = ['#e11d74', '#f97316', '#be185d', '#f59e0b', '#e11d74', '#7e22ce', '#be185d', '#f97316'];
        for (i = 0; i < 8; i++) {
            var w0 = 121 + i * 2.5, w1 = 121 + (i + 1) * 2.5, h0 = 66 + i * 16.5, h1 = 66 + (i + 1) * 16.5;
            gores += '<path d="M' + w0 + ' 126 L' + w1 + ' 126 L' + h1 + ' 242 L' + h0 + ' 242Z" fill="' + gcols[i] + '"/>';
        }
        function band(tf, color, width, dash) {
            var y = 127 + tf * 98, l = 121 - tf * 49, r = 141 + tf * 49;
            return '<path d="M' + l.toFixed(1) + ' ' + y.toFixed(1) + ' Q131 ' + (y + 10 * tf).toFixed(1) + ' ' + r.toFixed(1) + ' ' + y.toFixed(1) + '" stroke="' + color + '" stroke-width="' + width + '" fill="none"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
        }
        var mirrors = '';
        for (var mx = 92; mx <= 170; mx += 9) {
            var mt = 0.66, my = 127 + mt * 98 + 10 * mt * (1 - Math.pow((mx - 131) / 49 / mt, 2)) * 0.6;
            mirrors += '<circle cx="' + mx + '" cy="' + my.toFixed(1) + '" r="2" fill="#e0f2fe" stroke="#f5c451" stroke-width=".8"/>';
        }
        var braid = '';
        for (i = 0; i < 7; i++) braid += '<ellipse cx="' + (117 - i * 0.9).toFixed(1) + '" cy="' + (96 + i * 8) + '" rx="4.6" ry="5" fill="#1b0f0c"/>';
        var gajra = '';
        for (i = 0; i < 5; i++) gajra += '<circle cx="' + (121 - i * 0.6).toFixed(1) + '" cy="' + (90 + i * 4) + '" r="1.7" fill="#fffbeb"/>';
        var bandhani = '';
        [[262, 58], [270, 56], [278, 58], [258, 64], [266, 62], [274, 61], [283, 64], [262, 69], [281, 70]].forEach(function (p) {
            bandhani += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="1.1" fill="#fef3c7"/>';
        });
        var pleats = '';
        for (i = 0; i < 9; i++) pleats += '<path d="M' + (259 + i * 2.8).toFixed(1) + ' 130 L' + (238 + i * 8.5).toFixed(1) + ' 180" stroke="#d6c3a5" stroke-width=".8"/>';
        var scallop = '';
        for (i = 0; i < 9; i++) scallop += ' q-4 6 -8 0';   // right to left, 306 → 234

        out.push('<svg class="nv-art" viewBox="0 0 400 260" role="img" data-nv="art" aria-label="">',
            '<defs>',
            '<radialGradient id="nvGlow" cx="50%" cy="60%" r="55%"><stop offset="0" stop-color="#ffb347" stop-opacity=".6"/><stop offset=".6" stop-color="#e0115f" stop-opacity=".18"/><stop offset="1" stop-color="#e0115f" stop-opacity="0"/></radialGradient>',
            '<radialGradient id="nvFire" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd56b" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a18" stop-opacity="0"/></radialGradient>',
            '<linearGradient id="nvKedi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf7"/><stop offset="1" stop-color="#f3e3c8"/></linearGradient>',
            '<linearGradient id="nvPot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ea580c"/><stop offset="1" stop-color="#9a3412"/></linearGradient>',
            '<linearGradient id="nvLamp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbbf24"/><stop offset="1" stop-color="#e11d48"/></linearGradient>',
            '<clipPath id="nvSkirtClip"><path d="M121 126 L141 126 C158 160 172 196 190 223 Q131 240 72 223 C90 196 104 160 121 126Z"/></clipPath>',
            '</defs>',
            '<ellipse cx="200" cy="150" rx="200" ry="120" fill="url(#nvGlow)"/>',
            // mandala behind the dancers
            '<g transform="translate(200 132)" opacity=".22"><g class="nv-spin-slow" fill="none" stroke="#f5c451" stroke-width="1.2">',
            mandala, '<circle r="100" stroke-dasharray="3 6"/><circle r="52"/>', '<g fill="#e0115f" stroke="none" opacity=".7">', petals2, '</g></g></g>',
            stars.map(function (p, k) {
                return '<circle class="nv-twinkle" style="animation-delay:' + (k * 0.33).toFixed(2) + 's" cx="' + p[0] + '" cy="' + p[1] + '" r="' + (k % 3 ? 1.1 : 1.8) + '" fill="#fff4d6"/>';
            }).join(''),
            '<path d="M236 30a13 13 0 1 0 8 22.5a10.5 10.5 0 1 1 -8 -22.5z" fill="#ffe7b0" opacity=".95"/>',
            '<path d="M10 34 Q200 138 390 34" fill="none" stroke="#3f2a1a" stroke-width=".8"/>', lights,
            // lanterns and marigold strings on the sides
            '<g class="nv-lamp" style="transform-origin:62px 0"><line x1="62" y1="0" x2="62" y2="44" stroke="#7c4a12"/><path d="M50 44h24l-3 26h-18z" fill="url(#nvLamp)"/><path d="M53 50h18M52 58h20" stroke="#fde68a" stroke-width=".8"/><path d="M53 70h18l-9 9z" fill="#be123c"/><line x1="62" y1="79" x2="62" y2="92" stroke="#fbbf24" stroke-width="1.4"/><circle cx="62" cy="57" r="4" fill="#fff3c4" opacity=".85"/></g>',
            '<g class="nv-lamp nv-lamp-2" style="transform-origin:338px 0"><line x1="338" y1="0" x2="338" y2="36" stroke="#7c4a12"/><path d="M327 36h22l-3 23h-16z" fill="url(#nvLamp)"/><path d="M330 42h16M329 50h18" stroke="#fde68a" stroke-width=".8"/><path d="M330 59h16l-8 8z" fill="#be123c"/><line x1="338" y1="67" x2="338" y2="79" stroke="#fbbf24" stroke-width="1.4"/><circle cx="338" cy="47" r="3.6" fill="#fff3c4" opacity=".85"/></g>',
            genda(10, 0, 112), genda(390, 0, 112), genda(28, 0, 64), genda(372, 0, 64),
            toran(400, 0, 10),
            // rangoli floor
            '<g transform="translate(200 236) scale(1 .22)"><g class="nv-spin">',
            '<circle r="150" fill="none" stroke="#e0115f" stroke-width="3" stroke-dasharray="6 9" opacity=".75"/>',
            '<circle r="124" fill="none" stroke="#f5c451" stroke-width="2" opacity=".7"/>',
            '<g fill="#f97316" opacity=".55">', petals2.replace(/-40/g, '-96').replace(/-52/g, '-108').replace(/-64/g, '-120').replace(/Q9/g, 'Q12').replace(/Q-9/g, 'Q-12'), '</g>',
            '<circle r="70" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="2 6"/>',
            '</g></g>',
            diya(30, 236, 1.1), diya(66, 240, 0.9), diya(334, 240, 0.9), diya(370, 236, 1.1),

            // ===== GIRL =====
            '<g class="nv-girl">',
            '<ellipse cx="131" cy="234" rx="54" ry="5" fill="#000" opacity=".35"/>',
            // braid swings behind her
            '<g class="nv-braid" style="transform-origin:120px 86px">', braid, gajra, '<path d="M111 150 l-3 10 M112 150 l0 11 M113 150 l3 10" stroke="#e11d48" stroke-width="1.6" stroke-linecap="round"/><circle cx="112" cy="149" r="2.2" fill="#f5c451"/></g>',
            // raised back arm with its stick
            '<g class="nv-arm nv-arm-gb">', stick(102, 75, 91, 47), '<path d="M120 104 Q106 94 102 76" fill="none" stroke="#c98a5e" stroke-width="6" stroke-linecap="round"/>',
            '<path d="M103.5 82 l-3.6 1.2 M104.5 85.5 l-3.6 1.2" stroke="#f5c451" stroke-width="1.6" stroke-linecap="round"/></g>',
            // feet and anklets peeking under the hem
            '<path d="M117 230 q6 -3 12 0 z M136 230 q6 -3 12 0 z" fill="#c98a5e"/>',
            // the ghagra
            '<g class="nv-skirt">',
            '<g clip-path="url(#nvSkirtClip)">', gores, '</g>',
            band(0.32, '#f5c451', 3, '4 3'), band(0.33, '#10b981', 1.4), band(0.66, '#7e22ce', 7), mirrors,
            band(0.98, '#f5c451', 5), band(0.98, '#e0115f', 5, '2 6'),
            '</g>',
            // midriff, choli, sleeves
            '<path d="M121 116 L141 116 L140.5 128 L121.5 128Z" fill="#c98a5e"/>',
            '<path d="M117 101 Q131 95 145 101 L143 118 Q131 121 119 118Z" fill="#047857"/>',
            '<path d="M119 117.5 Q131 120.5 143 117.5" stroke="#f5c451" stroke-width="2.2" fill="none"/>',
            '<circle cx="126" cy="107" r="1.4" fill="#e0f2fe"/><circle cx="131" cy="104.5" r="1.4" fill="#e0f2fe"/><circle cx="136" cy="107" r="1.4" fill="#e0f2fe"/><circle cx="131" cy="111" r="1.4" fill="#e0f2fe"/>',
            '<ellipse cx="119" cy="104" rx="5" ry="4.2" fill="#047857"/><ellipse cx="143" cy="104" rx="5" ry="4.2" fill="#047857"/>',
            // dupatta: bandhani, over the left shoulder and flying back
            '<g class="nv-dupatta" style="transform-origin:117px 102px"><path d="M117 100 C108 112 96 118 80 122 C72 124 70 132 78 133 C94 130 108 124 121 110Z" fill="#f59e0b"/>',
            '<path d="M80 122 C72 124 70 132 78 133" stroke="#e0115f" stroke-width="2.4" fill="none"/>',
            '<circle cx="98" cy="119" r="1" fill="#fff7ed"/><circle cx="106" cy="114" r="1" fill="#fff7ed"/><circle cx="90" cy="124" r="1" fill="#fff7ed"/><circle cx="112" cy="108" r="1" fill="#fff7ed"/></g>',
            // neck, necklace, head
            '<path d="M127 88 L135 88 L136 100 L126 100Z" fill="#c98a5e"/>',
            '<path d="M124.5 99 Q131 106 137.5 99" stroke="#f5c451" stroke-width="2" fill="none"/><circle cx="131" cy="104" r="1.8" fill="#e0115f"/>',
            '<circle cx="132" cy="78" r="14" fill="#c98a5e"/>',
            '<path d="M117.4 86 C113.5 70 122 62 132 62.4 C141.5 62.8 147.4 68.4 146.8 75.5 C143.5 71.6 139 69.6 134.5 69.8 C130 70 126.6 72.4 125 76.4 C123.6 79.8 122.8 83.6 122.6 88 Z" fill="#1b0f0c"/>',
            '<path d="M124 66 Q131 63.4 139 65" stroke="#3b2420" stroke-width="1" fill="none"/>',
            '<path d="M131 64.5 Q137 63.6 139.5 67" stroke="#f5c451" stroke-width="1.1" fill="none"/><circle cx="139.6" cy="68.6" r="1.7" fill="#f5c451"/>',
            '<path d="M134.5 73 q3.2 -1.8 6.4 0" stroke="#2a1410" stroke-width="1.3" fill="none" stroke-linecap="round"/>',
            '<path d="M135 77.5 q2.6 2.2 5.2 0" stroke="#2a1410" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M140 77.4 l1.6 -1" stroke="#2a1410" stroke-width="1" stroke-linecap="round"/>',
            '<path d="M145.5 77.5 q1.8 2.8 -.4 4" stroke="#8a4b2c" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
            '<path d="M139.5 85.6 q2.6 1.8 5 -.2" stroke="#be123c" stroke-width="2" fill="none" stroke-linecap="round"/>',
            '<circle cx="137" cy="82.4" r="3.2" fill="#f472b6" opacity=".35"/>',
            '<circle cx="142" cy="71.6" r="1.25" fill="#dc2626"/>',
            '<circle cx="145.2" cy="82.2" r="2" fill="none" stroke="#f5c451" stroke-width=".9"/>',
            '<g class="nv-jhumka" style="transform-origin:124px 85px"><circle cx="124" cy="85" r="1.4" fill="#f5c451"/><path d="M120.6 88 Q124 83.5 127.4 88Z" fill="#f5c451"/><circle cx="121.2" cy="89.6" r=".9" fill="#fde68a"/><circle cx="124" cy="90.2" r=".9" fill="#fde68a"/><circle cx="126.8" cy="89.6" r=".9" fill="#fde68a"/></g>',
            '<circle cx="118" cy="74" r="2.2" fill="#fffbeb"/><circle cx="117" cy="78.5" r="2" fill="#fffbeb"/><circle cx="120" cy="70.5" r="1.8" fill="#fffbeb"/>',
            // front arm and stick, hitting the boy's
            '<g class="nv-arm nv-arm-gf">', stick(169, 100, 199, 84), '<path d="M143 104 Q160 113 169 100" fill="none" stroke="#c98a5e" stroke-width="6" stroke-linecap="round"/>',
            '<path d="M161.5 107 l1.4 -3.6 M164.6 105.4 l1.4 -3.6" stroke="#f5c451" stroke-width="1.6" stroke-linecap="round"/><path d="M162.8 106.4 l1.4 -3.6" stroke="#e0115f" stroke-width="1.6" stroke-linecap="round"/></g>',
            '</g>',

            // ===== BOY =====
            '<g class="nv-boy">',
            '<ellipse cx="270" cy="234" rx="40" ry="5" fill="#000" opacity=".35"/>',
            // raised back arm (full sleeve) and stick
            '<path class="nv-pench" style="transform-origin:285px 72px" d="M284 70 C296 75 299 88 296 100 C291 92 287 84 281 77Z" fill="#ea580c"/>',
            '<g class="nv-arm nv-arm-bb">', stick(299, 75, 310, 47), '<path d="M283 104 Q296 94 298 79" fill="none" stroke="#f6ead6" stroke-width="8" stroke-linecap="round"/><circle cx="299" cy="76" r="3.6" fill="#a8693f"/><path d="M295 83 l7 1.6" stroke="#dc2626" stroke-width="2"/></g>',
            // churidar legs and mojari
            '<path d="M259 170 L258 229 L266.5 229 L269 170Z M271 170 L273.5 229 L282 229 L281 170Z" fill="#f4ede0"/>',
            '<path d="M258.5 212 h7.5 M274 212 h7.5 M258.5 218 h7.5 M274 218 h7.5 M258.5 224 h7.5 M274 224 h7.5" stroke="#d6c7ae" stroke-width=".9"/>',
            '<path d="M250 232 q2 -6 9 -5 l8 0 l0 5z M274 227 l8 0 q7 -1 9 5 l-17 0z" fill="#9f1239"/><path d="M250 232 q-2 -2 -1 -4 M291 232 q2 -2 1 -4" stroke="#f5c451" stroke-width="1.2" fill="none"/>',
            // kediyu: frilled skirt, then the fitted top
            '<g class="nv-frill">',
            '<path d="M258 128 L282 128 L306 178' + scallop + ' Z" fill="url(#nvKedi)"/>',
            pleats,
            '<path d="M306 178' + scallop + '" stroke="#dc2626" stroke-width="2" fill="none"/>',
            '<path d="M239 170 Q271 176 303 170" stroke="#16a34a" stroke-width="2.2" fill="none" stroke-dasharray="3 3"/>',
            '<path d="M243 163 Q271 168 299 163" stroke="#f59e0b" stroke-width="1.6" fill="none"/>',
            '</g>',
            '<path d="M254 101 Q270 95 286 101 L282 130 L258 130Z" fill="url(#nvKedi)"/>',
            '<path d="M261 101.5 Q270 113 279 101.5" stroke="#dc2626" stroke-width="2.2" fill="none"/>',
            '<circle cx="264" cy="106.5" r="1.1" fill="#16a34a"/><circle cx="270" cy="109.4" r="1.1" fill="#f59e0b"/><circle cx="276" cy="106.5" r="1.1" fill="#16a34a"/>',
            '<path d="M264 111 h12 M266 116 h8" stroke="#16a34a" stroke-width="1.4" stroke-dasharray="2 2"/>',
            '<rect x="257" y="124" width="26" height="7" rx="2" fill="#16a34a"/><path d="M257 127.5 h26" stroke="#fde047" stroke-width="1.2" stroke-dasharray="2 2"/>',
            '<path d="M281 129 l6 18 l-5 -1z" fill="#16a34a"/><circle cx="286" cy="147" r="1.6" fill="#f5c451"/>',
            // neck and head
            '<path d="M263 88 L273 88 L274 101 L262 101Z" fill="#a8693f"/>',
            '<circle cx="268" cy="78" r="14.5" fill="#a8693f"/>',
            '<path d="M281.5 76 Q284 84 280 90 Q278 84 277 80Z" fill="#1b0f0c"/>',
            '<ellipse cx="280.5" cy="82" rx="2.4" ry="3.4" fill="#a8693f"/><circle cx="280.5" cy="85.6" r="1" fill="#f5c451"/>',
            // safa (turban) with tail and kalgi
            '<path d="M253 79 C250 60 262 51 272 51 C285 51 291 60 288.5 74 C281 68 272 66.5 263 69.5 C258 71.5 255 75 253 79Z" fill="#dc2626"/>',
            '<path d="M254.5 72 Q270 59.5 288 67 M256.5 65 Q270 55 285.5 59.5" stroke="#fbbf24" stroke-width="2.4" fill="none"/>', bandhani,
            '<g class="nv-kalgi" style="transform-origin:262px 59px"><path d="M262 59 C254 50 255 38 260 32 C263 40 266 48 263 59Z" fill="#fde68a"/><path d="M261.5 57 C258 49 258 42 260 35" stroke="#f59e0b" stroke-width=".8" fill="none"/></g>',
            '<circle cx="262" cy="60" r="3" fill="#f5c451"/><circle cx="262" cy="60" r="1.4" fill="#e0115f"/>',
            // face: brows, eye, nose, moustache, smile, tilak
            '<path d="M258 73 q3.6 -1.8 7.2 .2" stroke="#1b0f0c" stroke-width="2" fill="none" stroke-linecap="round"/>',
            '<path d="M258.8 77.8 q2.6 2.2 5.2 0" stroke="#1b0f0c" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
            '<path d="M254.6 77.6 q-1.8 2.8 .4 4" stroke="#6b3a1f" stroke-width="1.1" fill="none" stroke-linecap="round"/>',
            '<path d="M251 86.5 C253.5 82.6 257.5 82.4 260.5 85 C263 82.4 267 82.6 269.5 86.5 C266 85.2 263 85.8 260.5 87.4 C258 85.8 255 85.2 251 86.5Z" fill="#1b0f0c"/>',
            '<path d="M256.5 90.4 q4 2 8 0" stroke="#5b1a10" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
            '<path d="M261 67.2 v3.6" stroke="#dc2626" stroke-width="1.6" stroke-linecap="round"/>',
            // front arm (full sleeve) and stick
            '<g class="nv-arm nv-arm-bf">', stick(231, 100, 201, 84), '<path d="M257 104 Q240 113 233 102" fill="none" stroke="#f6ead6" stroke-width="8" stroke-linecap="round"/><path d="M238.5 108.5 l-3 -5" stroke="#dc2626" stroke-width="2"/><circle cx="231" cy="100" r="3.6" fill="#a8693f"/></g>',
            '</g>',

            // ===== the garbo (lit, holed pot) between them =====
            '<g class="nv-garbo">',
            '<ellipse class="nv-garbo-glow" cx="200" cy="208" rx="34" ry="30" fill="url(#nvFire)"/>',
            '<path d="M185 214 C185 199 192 196 200 196 C208 196 215 199 215 214 C215 226 208 231 200 231 C192 231 185 226 185 214Z" fill="url(#nvPot)"/>',
            '<path d="M193 196 L207 196 L205 191 L195 191Z" fill="#9a3412"/><ellipse cx="200" cy="191" rx="6.5" ry="1.8" fill="#c2410c"/>',
            '<path d="M186 211 Q200 216 214 211" stroke="#f5c451" stroke-width="1.4" fill="none"/><path d="M186.5 221 Q200 226 213.5 221" stroke="#10b981" stroke-width="1.4" fill="none"/>',
            '<g fill="#ffe08a" class="nv-holes"><circle cx="192" cy="205" r="1.3"/><circle cx="200" cy="203.5" r="1.3"/><circle cx="208" cy="205" r="1.3"/><circle cx="189" cy="216" r="1.3"/><circle cx="196" cy="217.5" r="1.3"/><circle cx="204" cy="217.5" r="1.3"/><circle cx="211" cy="216" r="1.3"/><circle cx="200" cy="225" r="1.3"/></g>',
            '<g transform="translate(200 191)"><path class="nv-flame" d="M0 -13 C3.4 -7.5 3.4 -3 0 -1.6 C-3.4 -3 -3.4 -7.5 0 -13Z" fill="#ffd56b"/><path d="M0 -8.5 C1.3 -5.4 1.1 -3.4 0 -2.9 C-1.1 -3.4 -1.3 -5.4 0 -8.5Z" fill="#fff7d6"/></g>',
            '</g>',

            // the clack
            '<g class="nv-spark" style="transform-origin:200px 84px"><circle cx="200" cy="84" r="4.4" fill="#fff6d1"/>',
            '<path d="M200 68v7M200 93v7M184 84h7M209 84h7M189 73l4.6 4.6M206.4 90.4l4.6 4.6M211 73l-4.6 4.6M193.6 90.4l-4.6 4.6" stroke="#ffd56b" stroke-width="2" stroke-linecap="round"/></g>',
            '</svg>');
        return out.join('');
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
