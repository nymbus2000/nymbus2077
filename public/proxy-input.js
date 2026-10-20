// public/proxy-input.js
// Adds a proxy input field. Every call to /proxy automatically includes the
// entered proxy string. State is IN-MEMORY ONLY — per tab, per page load.
// Reload = clean. Empty field = no proxy. Tabs are fully independent.
// Usage: <script src="/proxy-input.js"></script>
(function () {
    const originalFetch = window.fetch.bind(window);

    // In-memory only. Dies on reload. Isolated per tab (per window).
    let proxyString = '';

    window.getProxyString = () => proxyString;

    // Patch fetch: if URL is /proxy, inject `proxy` field into JSON body.
    window.fetch = function (input, init) {
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const isProxyCall = url === '/proxy' || url.endsWith('/proxy');
            const p = proxyString.trim();
            if (isProxyCall && p && init && typeof init.body === 'string') {
                let body;
                try { body = JSON.parse(init.body); } catch { body = null; }
                if (body && typeof body === 'object') {
                    body.proxy = p;
                    init = { ...init, body: JSON.stringify(body) };
                }
            }
        } catch (e) { /* never break the app */ }
        return originalFetch(input, init);
    };

    // Inject UI on DOM ready
    function injectUI() {
        if (document.getElementById('proxy-input-wrap')) return;

        const wrap = document.createElement('div');
        wrap.id = 'proxy-input-wrap';
        wrap.style.cssText = `
            display: flex; align-items: center; gap: 8px;
            background: #fff7ed; border: 1px solid #fed7aa;
            padding: 8px 12px; border-radius: 12px; margin: 12px 0;
            font-family: 'Segoe UI', Roboto, system-ui, sans-serif; font-size: 0.85rem;
        `;
        wrap.innerHTML = `
            <span style="font-weight:600;color:#9a3412;">🌐 Proxy</span>
            <input id="proxy-input-field" type="text"
                placeholder="socks5://user:pass@1.2.3.4:1080  (empty = no proxy · cleared on reload)"
                autocomplete="off" spellcheck="false"
                style="flex:1;min-width:260px;padding:6px 10px;border:1px solid #fdba74;border-radius:8px;font-family:monospace;font-size:0.8rem;background:#fff;">
            <span id="proxy-input-status" style="font-size:0.75rem;color:#9a3412;white-space:nowrap;">off</span>
        `;
        document.body.insertBefore(wrap, document.body.firstChild);

        const field = wrap.querySelector('#proxy-input-field');
        const status = wrap.querySelector('#proxy-input-status');

        function refresh() {
            proxyString = field.value; // stored in closure only — not persisted
            const on = !!proxyString.trim();
            status.textContent = on ? 'ON' : 'off';
            status.style.color = on ? '#15803d' : '#9a3412';
            status.style.fontWeight = on ? '700' : '400';
        }

        field.addEventListener('input', refresh);
        refresh(); // always starts empty
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUI);
    } else {
        injectUI();
    }
})();