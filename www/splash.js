/**
 * splash.js — Full-screen splash for Aapla Swad
 * Shows logo ONLY on first visit. Skips on back-navigation.
 */
(function () {
    // Skip splash if user is navigating back or has already seen it this session
    var isBack = (performance && performance.navigation && performance.navigation.type === 2) ||
                 (performance && performance.getEntriesByType && performance.getEntriesByType('navigation').length &&
                  performance.getEntriesByType('navigation')[0].type === 'back_forward');
    var seen = sessionStorage.getItem('splash_seen');

    if (isBack || seen) return; // No splash on back or revisit

    sessionStorage.setItem('splash_seen', '1');

    var overlay = document.createElement('div');
    overlay.id = 'aapla-splash';
    overlay.innerHTML =
        '<img src="splash-logo.jpg" alt="Aapla Swad">' +
        '<div class="splash-name">Aapla Swad</div>' +
        '<div class="splash-tagline">Authentic Home-Style Cooking</div>' +
        '<div class="splash-loader"><div class="splash-loader-bar"></div></div>';

    var style = document.createElement('style');
    style.textContent =
        '#aapla-splash{position:fixed;inset:0;z-index:99999;background:#0a0a0a;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:opacity 0.5s ease;gap:0.5rem}' +
        '#aapla-splash img{width:130px;height:130px;object-fit:contain;border-radius:28px;animation:splashPulse 1s ease-in-out infinite alternate;box-shadow:0 8px 40px rgba(234,88,12,0.3)}' +
        '@keyframes splashPulse{0%{transform:scale(0.94);opacity:0.85}100%{transform:scale(1);opacity:1}}' +
        '.splash-name{font-family:"Outfit",sans-serif;font-size:1.5rem;font-weight:800;color:#f59e0b;margin-top:0.7rem;letter-spacing:-0.02em}' +
        '.splash-tagline{font-family:"Outfit",sans-serif;font-size:0.7rem;color:#666;margin-top:-0.2rem}' +
        '.splash-loader{width:140px;height:3px;background:rgba(255,255,255,0.06);border-radius:99px;margin-top:1rem;overflow:hidden}' +
        '.splash-loader-bar{width:0%;height:100%;background:linear-gradient(90deg,#ea580c,#f59e0b);border-radius:99px;transition:width 0.2s ease}' +
        '#aapla-splash.hide{opacity:0;pointer-events:none}';

    document.head.appendChild(style);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    var bar = overlay.querySelector('.splash-loader-bar');
    var start = Date.now();
    var done = false;

    function dismiss() {
        if (done) return;
        done = true;
        var wait = Math.max(0, 800 - (Date.now() - start));
        setTimeout(function () {
            bar.style.width = '100%';
            setTimeout(function () {
                overlay.classList.add('hide');
                document.body.style.overflow = '';
                setTimeout(function () { overlay.remove(); }, 500);
            }, 200);
        }, wait);
    }

    function preload() {
        var all = document.querySelectorAll('.grid-card img, .hero img');
        var total = Math.min(all.length, 16);
        if (total === 0) { dismiss(); return; }
        var loaded = 0;
        function tick() {
            loaded++;
            if (bar) bar.style.width = Math.round((loaded / total) * 100) + '%';
            if (loaded >= total) dismiss();
        }
        for (var i = 0; i < total; i++) {
            if (all[i].complete) tick();
            else { all[i].onload = tick; all[i].onerror = tick; }
        }
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', preload);
    else preload();

    setTimeout(dismiss, 5000);
})();
