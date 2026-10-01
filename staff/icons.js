/* === AAPLA SWAD STAFF — line icons ===
   Kept inside staff/ on purpose: the staff app shares nothing with the customer
   app. Write <i data-ic="name"></i> in markup (also in HTML that app.js builds
   later) and it becomes an SVG. Presentation only; no data, no API. */
(function () {
    var ICONS = {
        dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
        receipt: '<path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
        chef: '<path d="M6 13.9A4 4 0 0 1 7.6 6.2a4.5 4.5 0 0 1 8.8 0A4 4 0 0 1 18 13.9V20H6z"/><path d="M6 17h12"/>',
        utensils: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18"/><path d="M17 3c-2 1.5-3 4-3 7h3v11"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        team: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.2A6.5 6.5 0 0 1 21.5 20"/>',
        users: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8.5a5 5 0 0 1 0 7M19 5.5a9 9 0 0 1 0 13"/>',
        trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
        package: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
        bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h2l3 11.5M5.5 17.5 9 10h6l-3 7.5"/>',
        wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M21 8h-5a4 4 0 0 0 0 8h5z"/><circle cx="16" cy="12" r=".6" fill="currentColor"/>',
        banknote: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
        card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
        phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
        pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
        map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
        'check-circle': '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
        'x-circle': '<circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/>',
        plus: '<path d="M12 5v14M5 12h14"/>',
        download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
        logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
        search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        flame: '<path d="M12 22c4 0 7-2.9 7-7 0-4-3-6.5-4-10-2.2 1.7-3 4-3 6-1-1-1.6-2.2-1.8-3.6C8 9 5 11.6 5 15c0 4.1 3 7 7 7z"/>',
        lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        store: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9h18v1a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 12.5V20h14v-7.5M10 20v-5h4v5"/>',
        bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
        alert: '<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
        rupee: '<path d="M6 4h12M6 9h12M9 4c3.5 0 6 1.3 6 5s-2.5 5-6 5H7l8 7"/>'
    };

    function icon(name, extra) {
        var p = ICONS[name];
        if (!p) return '';
        return '<svg class="ic ic-' + name + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
    }
    window.SIcon = icon;

    function hydrate(scope) {
        var list = [];
        if (scope.nodeType === 1 && scope.matches && scope.matches('i[data-ic]')) list.push(scope);
        if (scope.querySelectorAll) list = list.concat([].slice.call(scope.querySelectorAll('i[data-ic]')));
        list.forEach(function (el) {
            var extra = (el.getAttribute('class') || '').trim();
            var svg = icon(el.getAttribute('data-ic'), extra);
            if (svg) el.outerHTML = svg;
        });
    }

    function boot() {
        hydrate(document);
        new MutationObserver(function (records) {
            records.forEach(function (r) {
                [].forEach.call(r.addedNodes, function (n) { if (n.nodeType === 1) hydrate(n); });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
