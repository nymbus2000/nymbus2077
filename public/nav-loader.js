// public/nav-loader.js - Handles loading and managing shared navigation

// Load navigation into the page
async function loadNavigation() {
    try {
        const response = await fetch('/nav.html');
        if (!response.ok) throw new Error('Failed to load navigation');

        const navHtml = await response.text();

        // Insert navigation at the top of the body
        const body = document.body;
        body.insertAdjacentHTML('afterbegin', navHtml);

        // Highlight the current page in navigation
        highlightCurrentPage();

        // Update server info
        updateServerInfo();

        return true;
    } catch (error) {
        console.error('Error loading navigation:', error);
        // Fallback: show minimal navigation
        showFallbackNavigation();
        return false;
    }
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
// Mirrors the structure of nav.html (groups + labels) so the UI stays consistent.
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
                gap: 4px;
                padding-bottom: 6px;
                border-bottom: 1px dashed #eee;
            }
            .nav-group:last-child {
                border-bottom: none;
                padding-bottom: 0;
            }
            .nav-group-label {
                display: inline-block;
                min-width: 64px;
                padding: 2px 8px;
                margin-right: 4px;
                border-radius: 3px;
                font-size: 11px;
                font-weight: 700;
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
        </style>

        <div class="nav-bar">
            <div class="nav-group">
                <span class="nav-group-label occult">Occult</span>
                <a href="/refresher.html" class="nav-link">refresher</a>
                <a href="/achiv.html" class="nav-link">Achievements</a>
                <a href="/crafter.html" class="nav-link">Card Crafter Occult</a>
                <a href="/crafter-2.html" class="nav-link">Card Crafter Tarot</a>
                <a href="/crafter-t3.html" class="nav-link">Card Crafter t3</a>
                <a href="/scanner.html" class="nav-link">Collection Scanner</a>
                <a href="/spinner.html" class="nav-link">Spinner Pro</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label bundles">Bundles</span>
                <a href="/bundle-buy.html" class="nav-link">Bundle Buy</a>
                <a href="/bundle-creator-multi.html" class="nav-link">Bundle Creator Multi</a>
                <a href="/bundle-list-by-id.html" class="nav-link">Bundle List by ID</a>
                <a href="/bundle-list-by-id-multi.html" class="nav-link">Bundle List by ID Multi</a>
                <a href="/bundle-price-change.html" class="nav-link">Bundle Price Change</a>
                <a href="/bundles-scan.html" class="nav-link">Bundle Scan</a>
                <a href="/bundle-remove-delete.html" class="nav-link">Bundle Remove/Delete</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label market">Market</span>
                <a href="/lister.html" class="nav-link">Card Lister</a>
                <a href="/lister-multi-acc.html" class="nav-link">Card Lister mlt</a>
                <a href="/multi-price-changer.html" class="nav-link">Price+Offer Changer mlt</a>
                <a href="/multi-price-changer-wo-offer.html" class="nav-link">Price Changer without offer</a>
                <a href="/delister-multi-acc.html" class="nav-link">Delister mlt</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label offers">Offers</span>
                <a href="/market-offers-scan.html" class="nav-link">Offers Scan</a>
                <a href="/multi-accept-offer.html" class="nav-link">Offer Accept mlt</a>
                <a href="/multi-offer-make.html" class="nav-link">Offer Make mlt</a>
            </div>

            <div class="nav-group">
                <span class="nav-group-label packs">Packs</span>
                <a href="/pack-buy-open-CS.html" class="nav-link">Packs buy-open CS</a>
                <a href="/pack-buy-open-KL.html" class="nav-link">Packs buy-open KL</a>
                <a href="/pack-lister.html" class="nav-link">Pack Lister</a>
                <a href="/pack-multi-open.html" class="nav-link">Pack Multi-Open</a>
                <a href="/pack-multi-scan.html" class="nav-link">Pack Multi-Scan</a>
                <a href="/pack-solo-scan-open.html" class="nav-link">Pack Solo Scan/Open</a>
            </div>
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