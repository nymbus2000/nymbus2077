const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables (set these in Render dashboard)
const API_BASE = process.env.API_BASE; // No default - must be set in Render
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT) || 30000;

// Path for config storage
const CONFIG_FILE = path.join(__dirname, 'crafting-config.json');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// ---- Proxy helpers ----
// Parse a proxy string like:
//   socks5://user:pass@1.2.3.4:1080
//   socks4://1.2.3.4:1080
//   http://user:pass@1.2.3.4:8080
//   https://user:pass@1.2.3.4:8080
function parseProxyUrl(proxyStr) {
    if (!proxyStr || typeof proxyStr !== 'string') return null;
    const trimmed = proxyStr.trim();
    if (!trimmed) return null;
    // Require a scheme
    if (!/^[a-zA-Z0-9]+:\/\//.test(trimmed)) {
        throw new Error('Proxy must include scheme, e.g. socks5://user:pass@host:port');
    }
    const u = new URL(trimmed);
    const proto = u.protocol.replace(':', '').toLowerCase();
    if (!['socks5', 'socks5h', 'socks4', 'http', 'https'].includes(proto)) {
        throw new Error(`Unsupported proxy protocol: ${proto}`);
    }
    if (!u.hostname || !u.port) {
        throw new Error('Proxy must include host and port');
    }
    return { url: trimmed, protocol: proto };
}

// Build the appropriate agent for the target URL + proxy
function buildAgentFor(proxyInfo, targetUrl) {
    if (!proxyInfo) return undefined;
    const targetIsHttps = targetUrl.startsWith('https://');
    const p = proxyInfo.protocol;

    if (p === 'socks5' || p === 'socks5h' || p === 'socks4') {
        return new SocksProxyAgent(proxyInfo.url);
    }
    if (p === 'http') {
        return targetIsHttps
            ? new HttpsProxyAgent(proxyInfo.url)
            : new HttpProxyAgent(proxyInfo.url);
    }
    if (p === 'https') {
        // HTTPS proxy that terminates TLS itself
        return targetIsHttps
            ? new HttpsProxyAgent(proxyInfo.url)
            : new HttpProxyAgent(proxyInfo.url);
    }
    return undefined;
}

// Load or create default config
let craftingConfig = {};
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const data = fs.readFileSync(CONFIG_FILE, 'utf8');
            craftingConfig = JSON.parse(data);
            console.log('Loaded crafting config:', craftingConfig);
        } else {
            craftingConfig = {
                requirements: [
                    { requirementId: 3235, cardsPerCraft: 16, collectionIds: [17920, 17921, 17922] },
                    { requirementId: 3236, cardsPerCraft: 8, collectionIds: [17923, 17924, 17925] },
                    { requirementId: 3237, cardsPerCraft: 4, collectionIds: [17953, 17986, 17987] }
                ],
                craftingPlanId: "3202",
                silvercoins: 5000,
                maxCrafts: 10,
                operationDelay: 3400
            };
            saveConfig();
        }
    } catch (error) {
        console.error('Error loading config:', error);
        craftingConfig = {
            requirements: [
                { requirementId: 3235, cardsPerCraft: 16, collectionIds: [17920, 17921, 17922] },
                { requirementId: 3236, cardsPerCraft: 8, collectionIds: [17923, 17924, 17925] },
                { requirementId: 3237, cardsPerCraft: 4, collectionIds: [17953, 17986, 17987] }
            ],
            craftingPlanId: "3202",
            silvercoins: 5000,
            maxCrafts: 10,
            operationDelay: 3400
        };
        saveConfig();
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(craftingConfig, null, 2));
        console.log('Saved crafting config');
    } catch (error) {
        console.error('Error saving config:', error);
    }
}

loadConfig();

// Proxy endpoint - all URLs are constructed server-side
app.post('/proxy', async (req, res) => {
    const { endpoint, method, headers, data, proxy } = req.body;

    if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
    }

    const url = `${API_BASE}${endpoint}`;
    if (!url.startsWith(API_BASE)) {
        return res.status(403).json({ error: 'Invalid endpoint' });
    }

    // Per-request proxy (client-supplied). Empty/undefined → no proxy.
    let proxyInfo = null;
    const proxyRaw = (typeof proxy === 'string' && proxy.trim()) ? proxy.trim() : (process.env.DEFAULT_PROXY || '').trim();
    if (proxyRaw) {
        try {
            proxyInfo = parseProxyUrl(proxyRaw);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid proxy string', message: e.message });
        }
    }

    const proxyHeaders = { ...headers, 'User-Agent': 'Card-Crafter/1.0' };
    delete proxyHeaders['host'];
    delete proxyHeaders['origin'];
    delete proxyHeaders['referer'];

    const agent = buildAgentFor(proxyInfo, url);

    try {
        const response = await axios({
            url,
            method: method || 'GET',
            headers: proxyHeaders,
            data,
            timeout: REQUEST_TIMEOUT,
            validateStatus: null,
            ...(agent ? { httpsAgent: agent, httpAgent: agent, proxy: false } : {})
        });

        const proxyTag = proxyInfo ? `[via ${proxyInfo.protocol}]` : '[direct]';
        console.log(`[${new Date().toISOString()}] ${method} ${endpoint} -> ${response.status} ${proxyTag}`);
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`Proxy error:`, error.message);
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ error: 'Request timeout' });
        }
        // Surface proxy-specific errors more clearly
        if (proxyInfo && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || /proxy/i.test(error.message))) {
            return res.status(502).json({ error: 'Proxy connection failed', message: error.message });
        }
        res.status(500).json({ error: 'Proxy error', message: error.message });
    }
});

// Configuration endpoints
app.get('/api/config', (req, res) => {
    res.json(craftingConfig);
});

app.post('/api/config', (req, res) => {
    try {
        const newConfig = req.body;
        if (!newConfig.requirements || !Array.isArray(newConfig.requirements)) {
            return res.status(400).json({ error: 'Invalid requirements format' });
        }
        for (const req2 of newConfig.requirements) {
            if (!req2.requirementId || !req2.cardsPerCraft || !req2.collectionIds || !Array.isArray(req2.collectionIds)) {
                return res.status(400).json({ error: 'Invalid requirement structure' });
            }
        }
        craftingConfig = newConfig;
        saveConfig();
        res.json({ success: true, config: craftingConfig });
    } catch (error) {
        console.error('Error saving config:', error);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', apiConfigured: !!API_BASE });
});

app.get('/', (req, res) => {
    res.redirect('/crafter.html');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API Base: ${API_BASE}`);
    console.log(`Config file: ${CONFIG_FILE}`);
});