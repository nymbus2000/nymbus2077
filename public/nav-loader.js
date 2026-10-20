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
// (kept minimal; no proxy field here — if nav.html is missing, wiring skips gracefully)
function showFallbackNavigation() {
    const fallbackNav = `
        <div class="nav-bar" style="background: white; padding: 15px 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div class="nav-links" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <a href="/refresher.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">refresher</a>
                <a href="/achiv.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Achievements</a>
                <a href="/brewer.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Brewer</a>
                <a href="/brewer2.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Brewer 2</a>
                <a href="/bundle-buy.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle Buy</a>
                <a href="/bundle-creator.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle Creator</a>
                <a href="/bundle-creator-multi.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle Creator Multi</a>
                <a href="/bundle-list-by-id.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle List by ID</a>
                <a href="/bundle-list-by-id-multi.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle List by ID Multi</a>
                <a href="/bundle-price-change.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle Price Change</a>
                <a href="/bundle-remove-delete.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Bundle Remove/Delete</a>
                <a href="/crafter.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Card Crafter</a>
                <a href="/crafter-old.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Card Crafter (Old)</a>
                <a href="/lister.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Card Lister</a>
                <a href="/lister-multi-acc.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Card Lister (Multi-Acc)</a>
                <a href="/market-offers-scan.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Market Offers Scan</a>
                <a href="/multi-accept-offer.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Multi Accept Offer</a>
                <a href="/multi-offer-make.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Multi Offer Make</a>
                <a href="/multi-price-changer.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Multi Price Changer</a>
                <a href="/pack-buy-open-CS.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Packs buy-open CS</a>
                <a href="/pack-buy-open-KL.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Packs buy-open KL</a>
                <a href="/pack-lister.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Pack Lister</a>
                <a href="/pack-multi-open.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Pack Multi-Open</a>
                <a href="/pack-multi-scan.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Pack Multi-Scan</a>
                <a href="/pack-solo-scan-open.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Pack Solo Scan/Open</a>
                <a href="/scanner.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Collection Scanner</a>
                <a href="/scanner-old.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Collection Scanner (Old)</a>
                <a href="/spinner.html" class="nav-link" style="padding: 8px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; background-color: #e0e0e0; color: #333;">Spinner Pro</a>
            </div>
            <div class="server-info" style="color: #666; font-size: 12px;">Server: Unknown</div>
        </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', fallbackNav);
    highlightCurrentPage();
}

// Auto-load navigation when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadNavigation);
} else {
    loadNavigation();
}