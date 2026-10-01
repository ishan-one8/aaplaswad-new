/* === AAPLA SWAD STAFF — presentation helpers ===
   Only reads the page and the `me` that app.js already holds. It never calls
   the API, never writes storage and never changes what app.js sends.
   - Dashboard greeting and today's date
   - Numbers in stat tiles count up to their new value
   - Sidebar group labels (desktop) */
(function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var $ = function (id) { return document.getElementById(id); };

    // ---- Greeting ----
    function greet() {
        var h = new Date().getHours();
        var part = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        var who = (typeof me !== 'undefined' && me && me.name) ? String(me.name).trim().split(/\s+/)[0] : '';
        if ($('heroGreet')) $('heroGreet').textContent = part;
        if ($('heroName')) $('heroName').textContent = who || 'team';
        if ($('heroDate')) {
            $('heroDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
        }
    }

    // ---- Count-up for stat numbers ----
    // Keeps whatever prefix/suffix the text has (₹, commas) and only animates the number.
    var SKIP = { 'sub-all': 1, 'sub-recent': 1 };      // app.js reads these back
    var busy = new WeakSet();
    function parse(text) {
        var m = String(text).match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
        if (!m) return null;
        return { pre: m[1], num: parseFloat(m[2].replace(/,/g, '')), post: m[3], grouped: m[2].indexOf(',') > -1 };
    }
    function fmt(n, grouped) { return grouped || n >= 1000 ? Math.round(n).toLocaleString('en-IN') : String(Math.round(n)); }
    function countUp(el) {
        if (busy.has(el) || SKIP[el.id]) return;
        var target = parse(el.textContent);
        if (!target || target.num === 0 || reduce || document.hidden) { el.dataset.last = target ? target.num : ''; return; }
        var from = parseFloat(el.dataset.last || '0') || 0;
        el.dataset.last = target.num;
        if (from === target.num) return;
        var start = performance.now(), dur = 700;
        busy.add(el);
        (function frame(now) {
            var t = Math.min(1, (now - start) / dur);
            var e = 1 - Math.pow(1 - t, 3);
            el.textContent = target.pre + fmt(from + (target.num - from) * e, target.grouped) + target.post;
            if (t < 1) requestAnimationFrame(frame);
            else { el.textContent = target.pre + fmt(target.num, target.grouped) + target.post; busy.delete(el); }
        })(start);
    }

    function watchNumbers() {
        var nodes = document.querySelectorAll('.stat .n');
        var obs = new MutationObserver(function (records) {
            records.forEach(function (r) {
                var el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
                if (el && el.matches && el.matches('.stat .n')) countUp(el);
            });
        });
        [].forEach.call(nodes, function (n) { obs.observe(n, { childList: true, characterData: true, subtree: true }); });
    }

    // ---- Boot ----
    function boot() {
        greet();
        watchNumbers();
        // app.js fills the header name after login; refresh the greeting then
        if ($('topWho')) new MutationObserver(greet).observe($('topWho'), { childList: true, characterData: true, subtree: true });
        setInterval(greet, 60000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
