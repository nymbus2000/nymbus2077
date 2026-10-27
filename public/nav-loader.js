// public/nav-loader.js - Handles loading and managing shared navigation
// + in-memory proxy field (per tab, cleared on reload, injected via /proxy bodies)

// ============================================================
// PROXY: install fetch patch IMMEDIATELY, before nav HTML arrives.
// This ensures any /proxy calls made by the tool are covered,
// regardless of when nav UI finishes loading.
// In-memory only: dies on reload, isolated per tab.
// ============================================================
(function installProxyFetchPatch() {
    if (window.__kolexProxyPatched) return;
    window.__kolexProxyPatched = true;

    const originalFetch = window.fetch.bind(window);
    let proxyString = '';

    // Expose getter + setter for the input wiring below
    window.getProxyString = () => proxyString;
    window.setProxyString = (v) => { proxyString = (v == null ? '' : String(v)); };

    window.fetch = function (input, init) {
        try {
            const url = typeof input === 'string' ? input : (input && input.url) || '';
            const isProxyCall = url === '/proxy' || url.endsWith('/proxy');
            const p = proxyString.trim();
            if (isProxyCall && p && init && typeof init.body === 'string') {
                let body = null;
                try { body = JSON.parse(init.body); } catch { body = null; }
                if (body && typeof body === 'object') {
                    body.proxy = p;
                    init = { ...init, body: JSON.stringify(body) };
                }
            }
        } catch (e) { /* never break the app */ }
        return originalFetch(input, init);
    };
})();

// ============================================================
// NAV LOADING
// ============================================================
async function loadNavigation() {
    try {
        const response = await fetch('/nav.html');
        if (!response.ok) throw new Error('Failed to load navigation');

        const navHtml = await response.text();

        const body = document.body;
        body.insertAdjacentHTML('afterbegin', navHtml);

        highlightCurrentPage();
        wireProxyInput();     // <-- new: bind the injected field
        updateServerInfo();

        return true;
    } catch (error) {
        console.error('Error loading navigation:', error);
        showFallbackNavigation();
        return false;
    }
}

// Bind the proxy input field (after nav.html has been injected)
function wireProxyInput() {
    const wrap = document.getElementById('proxy-input-wrap');
    if (!wrap) return;
    if (wrap.dataset.wired === '1') return; // idempotent
    wrap.dataset.wired = '1';

    const field = wrap.querySelector('#proxy-input-field');
    const status = wrap.querySelector('#proxy-input-status');
    if (!field) return;

    function refresh() {
        const v = field.value;
        if (typeof window.setProxyString === 'function') window.setProxyString(v);
        const on = !!v.trim();
        if (status) {
            status.textContent = on ? 'ON' : 'off';
            status.classList.toggle('on', on);
        }
    }

    field.addEventListener('input', refresh);
    refresh(); // always starts empty on page load
}

// Highlight the current page in the navigation
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.nav-link');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Update server info in the navigation
async function updateServerInfo() {
    const serverInfoElement = document.getElementById('serverInfo');
    if (!serverInfoElement) return;

    try {
        const response = await fetch('/health');
        const data = await response.json();
        serverInfoElement.textContent =
            `Server: Healthy | API: ${data.apiConfigured ? 'Configured' : 'Not Configured'}`;
    } catch (error) {
        serverInfoElement.textContent = 'Server: Error connecting';
    }
}

// Fallback navigation if nav.html can't be loaded
// Mirrors the grouped structure of nav.html so the UI stays consistent.
// Includes the proxy row so wiring still works if nav.html is unreachable.
function showFallbackNavigation() {
    const fallbackNav = `
        <style>
            .nav-bar {
                background: white;
                padding: 10px 14px;
                border-radius: 6px;
                margin-bottom: 15px;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                display: flex;
                flex-direction: column;
                gap: 6px;
            }
            .nav-group {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 2px;
                padding-bottom: 1px;
                border-bottom: 1px dashed #eee;
            }
            .nav-group:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .nav-group-label {
                display: inline-block;
                min-width: 24px;
                padding: 2px 8px;
                margin-right: 4px;
                border-radius: 3px;
                font-size: 8px;
                font-weight: 300;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: white;
                text-align: center;
            }
            .nav-group-label.occult  { background-color: #8e44ad; }
            .nav-group-label.bundles { background-color: #16a085; }
            .nav-group-label.market  { background-color: #2980b9; }
            .nav-group-label.offers  { background-color: #d35400; }
            .nav-group-label.packs   { background-color: #c0392b; }
            .nav-link {
                padding: 4px 10px;
                text-decoration: none;
                border-radius: 3px;
                font-size: 12px;
                font-weight: 500;
                background-color: #f0f0f0;
                color: #333;
                transition: all 0.2s;
                white-space: nowrap;
                border: 1px solid #e0e0e0;
            }
            .nav-link:hover {
                background-color: #e0e0e0;
                border-color: #ccc;
            }
            .nav-link.active {
                background-color: #007bff;
                color: white;
                border-color: #007bff;
            }
            .proxy-row {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 8px;
                padding: 8px 10px;
                background: #fff7ed;
                border: 1px solid #fed7aa;
                border-radius: 6px;
                font-size: 12px;
            }
            .proxy-row label {
                font-weight: 600;
                color: #9a3412;
                white-space: nowrap;
            }
            .proxy-row input {
                flex: 1;
                min-width: 260px;
                padding: 5px 10px;
                border: 1px solid #fdba74;
                border-radius: 6px;
                font-family: monospace;
                font-size: 11px;
                background: #fff;
            }
            .proxy-row .proxy-status {
                font-size: 11px;
                color: #9a3412;
                white-space: nowrap;
            }
            .proxy-row .proxy-status.on {
                color: #15803d;
                font-weight: 700;
            }
        </style>

        <div class="nav-bar">
            <div class="nav-group">
                <span class="nav-group-label occult">Gnrl</span>
                <a href="/refresher.html" class="nav-link">refresher</a>
                <a href="/achiv.html" class="nav-link">Achievements</a>
                <a href="/crafter.html" class="nav-link">Card Crafter Occult</a>
                <a href="/crafter-2.html" class="nav-link">Card Crafter Tarot</a>
                <a href="/crafter-t3.html" class="nav-link">Card Crafter t3</a>
                <a href="/scanner.html" class="nav-link">Collection Scanner</a>
                <a href="/spinner.html" class="nav-link">Spinner Pro</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label bundles">Bndl</span>
                <a href="/bundle-buy.html" class="nav-link">Bundle Buy</a>
                <a href="/bundle-creator-multi.html" class="nav-link">Bundle Creator Multi</a>
                <a href="/bundle-list-by-id.html" class="nav-link">Bundle List by ID</a>
                <a href="/bundle-list-by-id-multi.html" class="nav-link">Bundle List by ID Multi</a>
                <a href="/bundle-price-change.html" class="nav-link">Bundle Price Change</a>
                <a href="/bundles-scan.html" class="nav-link">Bundle Scan</a>
                <a href="/bundle-remove-delete.html" class="nav-link">Bundle Remove/Delete</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label market">Mrkt</span>
                <a href="/lister.html" class="nav-link">Card Lister</a>
                <a href="/lister-multi-acc.html" class="nav-link">Card Lister mlt</a>
                <a href="/multi-price-changer.html" class="nav-link">Price+Offer Changer mlt</a>
                <a href="/multi-price-changer-wo-offer.html" class="nav-link">Price Changer without offer</a>
                <a href="/delister-multi-acc.html" class="nav-link">Delister mlt</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label offers">Offr</span>
                <a href="/market-offers-scan.html" class="nav-link">Offers Scan</a>
                <a href="/multi-accept-offer.html" class="nav-link">Offer Accept mlt</a>
                <a href="/multi-offer-make.html" class="nav-link">Offer Make mlt</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label packs">Pack</span>
                <a href="/pack-buy-open-CS.html" class="nav-link">Packs buy-open CS</a>
                <a href="/pack-buy-open-KL.html" class="nav-link">Packs buy-open KL</a>
                <a href="/pack-lister.html" class="nav-link">Pack Lister</a>
                <a href="/pack-multi-open.html" class="nav-link">Pack Multi-Open</a>
                <a href="/pack-multi-scan.html" class="nav-link">Pack Multi-Scan</a>
                <a href="/pack-solo-scan-open.html" class="nav-link">Pack Solo Scan/Open</a>
            </div>
        </div>

        <div class="proxy-row" id="proxy-input-wrap">
            <label for="proxy-input-field">🌐 Proxy</label>
            <input id="proxy-input-field" type="text"
                placeholder="socks5://user:pass@1.2.3.4:1080  (empty = no proxy · cleared on reload)"
                autocomplete="off" spellcheck="false">
            <span class="proxy-status" id="proxy-input-status">off</span>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', fallbackNav);
    highlightCurrentPage();
    wireProxyInput();
}

// Auto-load navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavigation);
} else {
    loadNavigation();
}