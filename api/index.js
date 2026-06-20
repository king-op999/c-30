// api/index.js - BRONX CREDIT OSINT V5.0 - FULL UPDATED
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();

// ========== CONFIG ==========
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'bronx2026';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const DATA_FILE = path.join(DATA_DIR, 'bronx_v5_data.json');
const UPI_ID = process.env.UPI_ID || '8509561376@ibl';
const UPI_NAME = process.env.UPI_NAME || 'BRONX_ULTRA';
const PROFILE_PIC = process.env.PROFILE_PIC || 'https://i.ibb.co/WWyL62r3/IMG-20260410-221523-297.jpg';

let db = {
    users: {},
    payments: [],
    customAPIs: [],
    bannedIPs: [],
    logs: []
};

// ========== ALL SERVICES ==========
const SERVICES = {
    number: { name: '📱 Number Info', credit: 5, icon: '📱', color: '#0096ff', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/number', param: 'num', key: 'op', desc: 'Mobile number lookup with carrier & circle info' },
    aadhar: { name: '🆔 Aadhar Info', credit: 10, icon: '🆔', color: '#00c853', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/aadhar', param: 'num', key: 'op', desc: 'Aadhaar card details & verification' },
    vehicle: { name: '🚗 Vehicle Info', credit: 10, icon: '🚗', color: '#ff6d00', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/vehicle', param: 'vehicle', key: 'op', desc: 'RC details, owner name & registration' },
    ff: { name: '🎮 Free Fire', credit: 3, icon: '🎮', color: '#ff1744', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ff', param: 'uid', key: 'op', desc: 'Free Fire player ID lookup' },
    email: { name: '📧 Email Lookup', credit: 5, icon: '📧', color: '#ff9100', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/leakinfo', param: 'term', key: 'op', desc: 'Email breach & data leak check' },
    tg: { name: '📲 TG to Num', credit: 12, icon: '📲', color: '#00b8d4', api: 'https://tg-ifo-babu-0.vercel.app/tracex', param: 'username', key: 'BRONXop', desc: 'Telegram username → phone number' },
    upi: { name: '💰 UPI Lookup', credit: 5, icon: '💰', color: '#7c4dff', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/upi', param: 'upi', key: 'op', desc: 'UPI ID account holder details' },
    numtoupi: { name: '💳 Num to UPI', credit: 5, icon: '💳', color: '#e040fb', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/numtoupi', param: 'num', key: 'op', desc: 'Find UPI ID from mobile number' },
    numleak: { name: '🔓 Number Leak', credit: 8, icon: '🔓', color: '#ff5252', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/numleak', param: 'num', key: 'op', desc: 'Check if number was in data breach' },
    ifsc: { name: '🏦 IFSC Info', credit: 3, icon: '🏦', color: '#2979ff', api: 'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ifsc', param: 'ifsc', key: 'op', desc: 'Bank IFSC code & branch details' },
};

const PLANS = [
    { credit: 30, price: 30, popular: false },
    { credit: 100, price: 90, popular: true },
    { credit: 200, price: 180, popular: false },
    { credit: 500, price: 450, popular: false },
];

function saveDB() { try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); } catch (e) {} }
function loadDB() { try { if (fs.existsSync(DATA_FILE)) db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {} }
function generateId() { return crypto.randomBytes(6).toString('hex').toUpperCase(); }
function getIndiaTime() { return new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); }
function esc(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
});
app.use((req, res, next) => {
    req.clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    req.userAgent = req.headers['user-agent'] || 'unknown';
    if (db.bannedIPs.includes(req.clientIP)) return res.status(403).send('<h1 style="color:red;text-align:center;padding:50px">🚫 IP Banned</h1>');
    next();
});

function getToken(req) { return req.query.token || req.headers['x-auth-token'] || req.headers['authorization']?.replace('Bearer ', ''); }

function checkAuth(req, res, next) {
    const token = getToken(req);
    if (!token || !db.users[token]) return res.redirect('/login');
    req.user = db.users[token];
    next();
}

function checkAdmin(req, res, next) {
    const token = getToken(req);
    if (!token || !db.users[token] || db.users[token].role !== 'admin') return res.redirect('/admin-login');
    req.user = db.users[token];
    next();
}

// ========== PUBLIC ROUTES ==========
app.get('/', (req, res) => {
    const token = getToken(req);
    const user = db.users[token];
    res.send(renderHome(user));
});

app.get('/login', (req, res) => res.send(renderLogin()));
app.get('/register', (req, res) => res.send(renderRegister()));

// ========== AUTH API ==========
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, error: 'Missing username or password' });
    if (username.length < 3) return res.json({ success: false, error: 'Username too short (min 3 chars)' });
    if (password.length < 4) return res.json({ success: false, error: 'Password too short (min 4 chars)' });
    if (db.users[username]) return res.json({ success: false, error: 'Username already taken' });
    const token = generateId() + generateId();
    db.users[username] = { password, credit: 1, ip: req.clientIP, banned: false, created: new Date().toISOString(), role: 'user', token };
    db.users[token] = { username, credit: 1, role: 'user', token };
    saveDB();
    res.json({ success: true, token, credit: 1, message: '✅ Account created! 1 free credit added.' });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, error: 'Missing username or password' });
    const user = db.users[username];
    if (!user) return res.json({ success: false, error: 'Account not found' });
    if (user.password !== password) return res.json({ success: false, error: 'Wrong password' });
    if (user.banned) return res.json({ success: false, error: 'Account banned' });
    const token = user.token || (generateId() + generateId());
    if (!user.token) { user.token = token; db.users[token] = { username, credit: user.credit, role: user.role, token }; saveDB(); }
    res.json({ success: true, token, credit: user.credit, username: user.username });
});

// ========== SERVICE API ==========
app.get('/api/service/:name', (req, res) => {
    const service = SERVICES[req.params.name];
    if (!service) return res.json({ success: false, error: 'Service not found' });
    const token = getToken(req);
    if (!token) return res.json({ success: false, error: 'Please login first' });
    const user = db.users[token];
    if (!user) return res.json({ success: false, error: 'Invalid session' });
    if (user.banned) return res.json({ success: false, error: 'Account banned' });
    if (user.credit < service.credit) return res.json({ success: false, error: `🪙 Insufficient Credits! Need ${service.credit}, You have ${user.credit}` });
    const value = req.query[service.param] || req.query.q || req.query.query;
    if (!value) return res.json({ success: false, error: `Please enter ${service.param}` });
    user.credit -= service.credit;
    if (db.users[user.username]) db.users[user.username].credit = user.credit;
    const url = `${service.api}?key=${service.key}&${service.param}=${encodeURIComponent(value)}`;
    axios.get(url, { timeout: 30000 }).then(resp => {
        const data = resp.data;
        delete data.credit; delete data.owner; delete data.by; delete data.channel; delete data.api_by; delete data.key_note; delete data.response_time_ms;
        data.api_info = { service: service.name, credit_used: service.credit, remaining_balance: user.credit };
        saveDB();
        res.json(data);
    }).catch(e => {
        user.credit += service.credit;
        if (db.users[user.username]) db.users[user.username].credit = user.credit;
        saveDB();
        res.json({ success: false, error: 'API temporarily unavailable. Credit refunded.' });
    });
});

// ========== PAYMENT ==========
app.post('/api/create-payment', (req, res) => {
    const { plan_credit, plan_price } = req.body;
    const token = getToken(req);
    if (!token) return res.json({ success: false, error: 'Please login first' });
    const user = db.users[token];
    if (!user) return res.json({ success: false, error: 'Invalid session' });
    const paymentId = 'BRONX' + generateId();
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}&am=${plan_price}&tn=${paymentId}&cu=INR`;
    db.payments.push({ id: paymentId, username: user.username, credit: parseInt(plan_credit), amount: parseInt(plan_price), ip: req.clientIP, device: req.userAgent?.substring(0, 100), timestamp: new Date().toISOString(), status: 'pending' });
    saveDB();
    res.json({ success: true, payment_id: paymentId, upi_link: upiLink });
});

// ========== ADMIN ROUTES ==========
app.get('/admin-login', (req, res) => res.send(renderAdminLogin()));
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, error: 'Missing credentials' });
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = 'ADMIN_' + generateId();
        db.users[token] = { username: 'admin', credit: 99999, role: 'admin', token, banned: false };
        saveDB();
        return res.json({ success: true, token, redirect: '/admin' });
    }
    res.json({ success: false, error: 'Invalid admin credentials' });
});

app.get('/admin', checkAdmin, (req, res) => res.send(renderAdmin(req.user)));

app.post('/api/admin/add-credit', checkAdmin, (req, res) => {
    const { username, credit, payment_id } = req.body;
    if (!username || !credit) return res.json({ success: false, error: 'Missing fields' });
    const user = db.users[username];
    if (!user) return res.json({ success: false, error: 'User not found' });
    user.credit += parseInt(credit);
    if (db.users[user.token]) db.users[user.token].credit = user.credit;
    if (payment_id) { const p = db.payments.find(x => x.id === payment_id); if (p) p.status = 'approved'; }
    saveDB();
    res.json({ success: true, message: `✅ ${credit} credits added to @${username}` });
});

app.post('/api/admin/ban-user', checkAdmin, (req, res) => {
    const { username } = req.body;
    if (!username) return res.json({ success: false, error: 'Missing username' });
    if (db.users[username]) { db.users[username].banned = !db.users[username].banned; saveDB(); }
    res.json({ success: true, banned: db.users[username]?.banned });
});

app.post('/api/admin/delete-user', checkAdmin, (req, res) => {
    const { username } = req.body;
    if (db.users[username]) { const t = db.users[username].token; delete db.users[username]; if (t) delete db.users[t]; saveDB(); }
    res.json({ success: true });
});

app.post('/api/admin/ban-ip', checkAdmin, (req, res) => {
    const { ip } = req.body;
    if (!ip) return res.json({ success: false, error: 'Missing IP' });
    if (db.bannedIPs.includes(ip)) db.bannedIPs = db.bannedIPs.filter(i => i !== ip);
    else db.bannedIPs.push(ip);
    saveDB();
    res.json({ success: true, banned: db.bannedIPs.includes(ip) });
});

app.post('/api/admin/reject-payment', checkAdmin, (req, res) => {
    const p = db.payments.find(x => x.id === req.body.payment_id);
    if (p) p.status = 'rejected';
    saveDB();
    res.json({ success: true });
});

app.post('/api/admin/clear-payments', checkAdmin, (req, res) => { db.payments = []; saveDB(); res.json({ success: true }); });
app.post('/api/admin/reset-all', checkAdmin, (req, res) => { db = { users: {}, payments: [], customAPIs: [], bannedIPs: [], logs: [] }; saveDB(); res.json({ success: true }); });

// ========== RENDER FUNCTIONS ==========
function renderHome(user) {
    const credit = user ? user.credit : 0;
    const username = user ? user.username : '';
    const token = user ? user.token : '';
    const indianTime = getIndiaTime().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short', year: 'numeric' });
    
    const serviceCards = Object.entries(SERVICES).map(([key, s]) => `
        <div class="service-card" onclick="useService('${key}')" style="border-top: 3px solid ${s.color}">
            <div class="service-icon">${s.icon}</div>
            <div class="service-name">${s.name}</div>
            <div class="service-credit">🪙 ${s.credit} credits</div>
            <div class="service-desc">${s.desc}</div>
        </div>
    `).join('');
    
    const planCards = PLANS.map(p => `
        <div class="plan-card ${p.popular ? 'popular' : ''}" onclick="buyCredit(${p.credit}, ${p.price})">
            ${p.popular ? '<div class="popular-badge">🔥 BEST DEAL</div>' : ''}
            <div class="plan-credit">🪙 ${p.credit}</div>
            <div class="plan-price">₹${p.price}</div>
            <div class="plan-btn">BUY NOW</div>
        </div>
    `).join('');

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX CREDIT OSINT V5</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
:root{--bg:#020010;--sur:rgba(8,8,30,.75);--brd:rgba(0,150,255,.06);--txt:#d8d8f0;--acc:#0096ff;--acc2:#00d4ff;--gold:#ffb400;--green:#00ff88;--red:#ff4444;--pink:#ff0080}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--txt);font-family:'Rajdhani',sans-serif;min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,100,255,.06),transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(0,200,255,.03),transparent 50%);pointer-events:none;z-index:0}
.ring-light{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:350px;height:350px;border-radius:50%;border:2px solid rgba(0,150,255,.06);animation:ring 4s infinite;pointer-events:none;z-index:0}
.ring-light::before{content:'';position:absolute;inset:25px;border-radius:50%;border:1px solid rgba(0,200,255,.04);animation:ring 4s infinite .7s}
.ring-light::after{content:'';position:absolute;inset:50px;border-radius:50%;border:1px solid rgba(139,0,255,.03);animation:ring 4s infinite 1.4s}
@keyframes ring{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.6}50%{transform:translate(-50%,-50%) scale(1.4);opacity:0}}
.snowfall{position:fixed;inset:0;pointer-events:none;z-index:0}.snowflake{position:absolute;width:3px;height:3px;background:#fff;border-radius:50%;animation:fall linear infinite;opacity:0}@keyframes fall{0%{transform:translateY(-10vh);opacity:0}10%{opacity:.5}90%{opacity:.5}100%{transform:translateY(110vh);opacity:0}}
nav{position:sticky;top:0;z-index:1000;background:rgba(2,0,16,.9);border-bottom:1px solid var(--brd);padding:10px 24px;display:flex;justify-content:space-between;align-items:center;backdrop-filter:blur(30px);flex-wrap:wrap;gap:8px}
nav .logo{font-family:'Orbitron',sans-serif;font-size:15px;letter-spacing:5px;background:linear-gradient(90deg,#0096ff,#00d4ff,#8b00ff,#ff0080);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;animation:logoAnim 3s ease infinite}@keyframes logoAnim{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
nav .time-badge{background:rgba(0,150,255,.08);color:#0096ff;padding:5px 12px;border-radius:20px;font-size:10px;font-weight:600;border:1px solid rgba(0,150,255,.15);font-family:monospace}
nav .credit-badge{background:rgba(255,180,0,.08);color:var(--gold);padding:5px 12px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid rgba(255,180,0,.15);animation:goldPulse 2s infinite}@keyframes goldPulse{0%,100%{box-shadow:0 0 8px rgba(255,180,0,.08)}50%{box-shadow:0 0 20px rgba(255,180,0,.2)}}
nav a{color:#555;text-decoration:none;font-size:10px;font-weight:600;transition:.3s}nav a:hover{color:var(--acc2)}
.container{max-width:1400px;margin:0 auto;padding:20px;position:relative;z-index:1}
.hero{text-align:center;padding:25px 20px 15px}
.hero .profile-ring{width:100px;height:100px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#0096ff,#8b00ff,#ff0080,#ffb400);animation:ringSpin 4s linear infinite;margin:0 auto 12px}
.hero .profile-ring img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:3px solid #020010}
@keyframes ringSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.hero h1{font-size:clamp(26px,5vw,42px);font-weight:900;background:linear-gradient(90deg,#0096ff,#00d4ff,#8b00ff,#ff0080,#ffb400);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:rainbow 4s linear infinite;font-family:'Orbitron',sans-serif}@keyframes rainbow{0%{background-position:0% 50%}100%{background-position:300% 50%}}
.hero .sub{color:#444;font-size:11px;letter-spacing:4px;margin-top:4px}
.section-title{text-align:center;font-family:'Orbitron',sans-serif;font-size:16px;letter-spacing:4px;background:linear-gradient(90deg,#0096ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:20px 0 14px}
.service-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;margin-bottom:20px}
.service-card{background:var(--sur);border:1px solid var(--brd);border-radius:16px;padding:18px 14px;text-align:center;cursor:pointer;transition:.3s;backdrop-filter:blur(20px)}.service-card:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.5)}
.service-icon{font-size:35px;margin-bottom:8px}.service-name{color:#fff;font-size:13px;font-weight:700;margin-bottom:4px}
.service-credit{color:var(--gold);font-size:10px;font-weight:600;margin-bottom:6px}.service-desc{color:#444;font-size:9px;line-height:1.4}
.plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px}
.plan-card{background:var(--sur);border:1px solid var(--brd);border-radius:16px;padding:18px;text-align:center;cursor:pointer;transition:.3s;position:relative;backdrop-filter:blur(20px)}.plan-card:hover{transform:translateY(-4px);border-color:var(--gold)}
.plan-card.popular{border-color:rgba(255,180,0,.25);background:rgba(20,15,0,.7)}.popular-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ff8c00,#ffb400);color:#000;padding:4px 14px;border-radius:12px;font-size:9px;font-weight:700}
.plan-credit{font-size:28px;font-weight:900;color:var(--gold);font-family:'Orbitron',sans-serif}.plan-price{font-size:18px;color:#fff;font-weight:700;margin:6px 0}
.plan-btn{background:linear-gradient(135deg,#ffb400,#ff8c00);color:#000;padding:10px;border-radius:10px;font-weight:700;font-size:11px;margin-top:6px}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center}.modal.show{display:flex}
.modal-content{background:var(--sur);border:1px solid var(--brd);border-radius:24px;padding:24px;max-width:520px;width:90%;max-height:80vh;overflow:auto;backdrop-filter:blur(40px)}
.modal-content h3{color:#fff;font-size:18px;margin-bottom:14px;text-align:center;font-family:'Orbitron',sans-serif}
.modal-content input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:10px;font-family:'Rajdhani',sans-serif}.modal-content input:focus{border-color:var(--acc);box-shadow:0 0 30px rgba(0,150,255,.1)}
.modal-content .btn-search{padding:15px;background:linear-gradient(135deg,#0096ff,#00d4ff);color:#fff;border:none;border-radius:14px;font-weight:700;width:100%;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:2px;font-size:13px}
.modal-content .btn-close{padding:12px;background:#222;color:#888;border:none;border-radius:12px;width:100%;cursor:pointer;margin-top:8px;font-family:'Rajdhani',sans-serif}
.result-box{background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:14px;padding:16px;margin-top:12px;font-family:'Courier New',monospace;font-size:11px;color:var(--green);max-height:300px;overflow:auto;white-space:pre-wrap;display:none;line-height:1.5}
.pay-link{display:block;background:linear-gradient(135deg,#ffb400,#ff8c00);color:#000;padding:16px;border-radius:14px;font-weight:700;text-decoration:none;font-family:'Orbitron',sans-serif;letter-spacing:2px;margin-top:8px;font-size:15px;text-align:center}
footer{text-align:center;padding:20px;border-top:1px solid var(--brd);margin-top:30px}footer .fb{font-family:'Orbitron',sans-serif;background:linear-gradient(90deg,#0096ff,#00d4ff,#8b00ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:13px}
@media(max-width:768px){.service-grid{grid-template-columns:repeat(2,1fr)}.plan-grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<div class="ring-light"></div>
<div class="snowfall" id="snow"></div>
<nav><a href="/" class="logo">⚡ BRONX OSINT V5</a><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="time-badge">🕐 ${indianTime}</span>${token?`<span class="credit-badge">🪙 ${credit} Credits</span><span style="color:#444;font-size:10px">@${username}</span><a href="/login" onclick="localStorage.removeItem('token')">LOGOUT</a>`:`<a href="/login">LOGIN</a><a href="/register">REGISTER</a>`}</div></nav>
<div class="container">
<div class="hero">
<div class="profile-ring"><img src="${PROFILE_PIC}" alt="BRONX" onerror="this.style.display='none'"></div>
<h1>BRONX CREDIT OSINT V5.0</h1>
<p class="sub">🔍 10 Services · 🪙 Credit System · 💳 UPI Payments · 🇮🇳 IST Time</p>
</div>
<div class="section-title">🔍 OSINT SERVICES</div>
<div class="service-grid">${serviceCards}</div>
<div class="section-title">💳 BUY CREDITS</div>
<div class="plan-grid">${planCards}</div>
</div>
<div class="modal" id="searchModal"><div class="modal-content"><h3 id="modalTitle">Search</h3><input type="text" id="searchInput" placeholder="Enter value..." autocomplete="off"><button class="btn-search" onclick="doSearch()">🔍 SEARCH (<span id="modalCredit">0</span> credits)</button><div class="result-box" id="resultBox"></div><button class="btn-close" onclick="closeModal()">✕ CLOSE</button></div></div>
<div class="modal" id="paymentModal"><div class="modal-content"><h3>💳 Complete Payment</h3><div style="text-align:center;padding:20px"><p style="color:#666;font-size:12px;margin-bottom:16px">Click below to pay via UPI</p><a id="upiLink" href="#" class="pay-link" target="_blank">⚡ PAY NOW</a><p style="color:#444;font-size:10px;margin-top:12px">PhonePe | Google Pay | Paytm</p><p style="color:#ff8c00;font-size:11px;margin-top:16px">After payment, DM @BRONX_ULTRA with Payment ID</p><p style="color:#fff;font-size:15px;margin-top:8px;font-family:monospace" id="paymentId"></p></div><button class="btn-close" onclick="closePayment()">✕ CLOSE</button></div></div>
<footer><p class="fb">BRONX CREDIT OSINT V5.0</p></footer>
<script>
var TOKEN='${token}';var SERVICES=${JSON.stringify(SERVICES)};var currentService='',currentCredit=0;
for(var i=0;i<35;i++){var sf=document.createElement('div');sf.className='snowflake';sf.style.left=Math.random()*100+'%';sf.style.animationDelay=Math.random()*10+'s';sf.style.animationDuration=(5+Math.random()*10)+'s';sf.style.width=sf.style.height=(2+Math.random()*3)+'px';document.getElementById('snow').appendChild(sf)}
function useService(k){if(!TOKEN){location.href='/login';return}currentService=k;var s=SERVICES[k];currentCredit=s.credit;document.getElementById('modalTitle').textContent=s.name;document.getElementById('modalCredit').textContent=s.credit;document.getElementById('searchInput').placeholder='Enter '+s.param+'...';document.getElementById('searchInput').value='';document.getElementById('resultBox').style.display='none';document.getElementById('searchModal').classList.add('show')}
function closeModal(){document.getElementById('searchModal').classList.remove('show')}
async function doSearch(){var v=document.getElementById('searchInput').value.trim();if(!v){alert('Please enter a value');return}var rb=document.getElementById('resultBox');rb.style.display='block';rb.style.color='#00d4ff';rb.textContent='🔍 Searching...';try{var r=await fetch('/api/service/'+currentService+'?token='+TOKEN+'&q='+encodeURIComponent(v));var d=await r.json();if(d.success===false||d.error){rb.style.color='#ff4444';rb.textContent='❌ '+(d.error||'Unknown error')}else{rb.style.color='#00ff88';rb.textContent=JSON.stringify(d,null,2);setTimeout(()=>location.reload(),1500)}}catch(e){rb.style.color='#ff4444';rb.textContent='❌ Connection error'}}
function buyCredit(cr,pr){if(!TOKEN){location.href='/login';return}fetch('/api/create-payment?token='+TOKEN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan_credit:cr,plan_price:pr})}).then(r=>r.json()).then(d=>{if(d.success){document.getElementById('paymentId').innerHTML='📋 ID: <b style="color:#ffb400">'+d.payment_id+'</b>';document.getElementById('upiLink').href=d.upi_link;document.getElementById('paymentModal').classList.add('show');setTimeout(function(){window.open(d.upi_link,'_blank')},600)}else alert('❌ '+(d.error||'Payment failed'))}).catch(e=>alert('❌ Connection error'))}
function closePayment(){document.getElementById('paymentModal').classList.remove('show')}
</script></body></html>`;
}

// ========== RENDER: LOGIN ==========
function renderLogin(){return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BRONX LOGIN</title><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#020010;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Rajdhani',sans-serif}
.card{background:rgba(8,8,30,.85);padding:45px 35px;border-radius:24px;width:400px;border:1px solid rgba(0,150,255,.08);text-align:center;backdrop-filter:blur(30px);box-shadow:0 0 100px rgba(0,150,255,.04)}
.card h2{color:#fff;font-family:'Orbitron',sans-serif;font-size:26px;letter-spacing:3px;margin-bottom:6px}
.card .sub{color:#444;font-size:11px;letter-spacing:3px;margin-bottom:24px}
.card input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.04);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;font-family:'Rajdhani',sans-serif;transition:.3s}.card input:focus{border-color:#0096ff;box-shadow:0 0 30px rgba(0,150,255,.1)}
.card button{width:100%;padding:15px;background:linear-gradient(135deg,#0096ff,#00d4ff);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:3px;font-size:14px;transition:.3s}.card button:hover{box-shadow:0 0 40px rgba(0,150,255,.2);transform:translateY(-2px)}
.card a{color:#0096ff;font-size:11px;text-decoration:none}.msg{font-size:11px;margin-top:8px;display:none;text-align:center}
</style></head><body><div class="card"><h2>🔐 LOGIN</h2><p class="sub">BRONX CREDIT OSINT V5</p><input type="text" id="u" placeholder="Username" autocomplete="off"><input type="password" id="p" placeholder="Password"><button onclick="login()">AUTHENTICATE</button><p class="msg" id="msg"></p><p style="margin-top:14px;color:#444;font-size:11px"><a href="/register">Create Account</a> | <a href="/">Home</a></p></div><script>
async function login(){var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim(),m=document.getElementById('msg');if(!u||!p){m.style.display='block';m.style.color='#ffaa00';m.textContent='⚠ Fill all fields';return}m.style.display='block';m.style.color='#00d4ff';m.textContent='⏳ Authenticating...';try{var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});var d=await r.json();if(d.success){localStorage.setItem('token',d.token);m.style.color='#00ff88';m.textContent='✅ Login successful!';setTimeout(function(){location.href='/?token='+d.token},400)}else{m.style.color='#ff4444';m.textContent='❌ '+d.error}}catch(e){m.style.color='#ff4444';m.textContent='❌ Connection error'}}</script></body></html>`}

// ========== RENDER: REGISTER ==========
function renderRegister(){return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BRONX REGISTER</title><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#020010;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Rajdhani',sans-serif}
.card{background:rgba(8,8,30,.85);padding:45px 35px;border-radius:24px;width:400px;border:1px solid rgba(139,0,255,.08);text-align:center;backdrop-filter:blur(30px);box-shadow:0 0 100px rgba(139,0,255,.04)}
.card h2{color:#fff;font-family:'Orbitron',sans-serif;font-size:26px;letter-spacing:3px;margin-bottom:6px}
.card .sub{color:#444;font-size:11px;letter-spacing:3px;margin-bottom:24px}
.card input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.04);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;font-family:'Rajdhani',sans-serif;transition:.3s}.card input:focus{border-color:#8b00ff;box-shadow:0 0 30px rgba(139,0,255,.1)}
.card button{width:100%;padding:15px;background:linear-gradient(135deg,#8b00ff,#0096ff);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:3px;font-size:14px;transition:.3s}.card button:hover{box-shadow:0 0 40px rgba(139,0,255,.2);transform:translateY(-2px)}
.card a{color:#8b00ff;font-size:11px;text-decoration:none}.msg{font-size:11px;margin-top:8px;display:none;text-align:center}
</style></head><body><div class="card"><h2>🆕 REGISTER</h2><p class="sub">Get 1 Free Credit 🪙</p><input type="text" id="u" placeholder="Username (min 3 chars)" autocomplete="off"><input type="password" id="p" placeholder="Password (min 4 chars)"><button onclick="register()">CREATE ACCOUNT</button><p class="msg" id="msg"></p><p style="margin-top:14px;color:#444;font-size:11px"><a href="/login">Already have account?</a> | <a href="/">Home</a></p></div><script>
async function register(){var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim(),m=document.getElementById('msg');if(!u||!p){m.style.display='block';m.style.color='#ffaa00';m.textContent='⚠ Fill all fields';return}if(u.length<3){m.style.display='block';m.style.color='#ffaa00';m.textContent='⚠ Username min 3 chars';return}if(p.length<4){m.style.display='block';m.style.color='#ffaa00';m.textContent='⚠ Password min 4 chars';return}m.style.display='block';m.style.color='#00d4ff';m.textContent='⏳ Creating...';try{var r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});var d=await r.json();if(d.success){localStorage.setItem('token',d.token);m.style.color='#00ff88';m.textContent='✅ '+d.message;setTimeout(function(){location.href='/?token='+d.token},500)}else{m.style.color='#ff4444';m.textContent='❌ '+d.error}}catch(e){m.style.color='#ff4444';m.textContent='❌ Connection error'}}</script></body></html>`}

// ========== RENDER: ADMIN LOGIN ==========
function renderAdminLogin(){return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMIN LOGIN</title><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#020010;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Rajdhani',sans-serif}
.card{background:rgba(8,8,30,.85);padding:45px 35px;border-radius:24px;width:400px;border:1px solid rgba(255,180,0,.1);text-align:center;backdrop-filter:blur(30px);box-shadow:0 0 100px rgba(255,180,0,.05)}
.card h2{color:#ffb400;font-family:'Orbitron',sans-serif;font-size:26px;margin-bottom:24px;letter-spacing:3px}
.card input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.04);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;font-family:'Rajdhani',sans-serif;transition:.3s}.card input:focus{border-color:#ffb400;box-shadow:0 0 30px rgba(255,180,0,.1)}
.card button{width:100%;padding:15px;background:linear-gradient(135deg,#ffb400,#ff8c00);color:#000;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:3px;font-size:14px;transition:.3s}.card button:hover{box-shadow:0 0 40px rgba(255,180,0,.3);transform:translateY(-2px)}
.msg{font-size:11px;margin-top:8px;display:none;text-align:center}
</style></head><body><div class="card"><h2>👑 ADMIN LOGIN</h2><input type="text" id="u" placeholder="Username" autocomplete="off"><input type="password" id="p" placeholder="Password"><button onclick="login()">AUTHENTICATE</button><p class="msg" id="msg"></p><p style="margin-top:14px;color:#444;font-size:11px"><a href="/">← Back to Home</a></p></div><script>
async function login(){var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim(),m=document.getElementById('msg');if(!u||!p){m.style.display='block';m.style.color='#ffaa00';m.textContent='⚠ Fill all fields';return}m.style.display='block';m.style.color='#ffb400';m.textContent='⏳ Authenticating...';try{var r=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});var d=await r.json();if(d.success){localStorage.setItem('adminToken',d.token);m.style.color='#00ff88';m.textContent='✅ Access granted!';setTimeout(function(){location.href='/admin?token='+d.token},500)}else{m.style.color='#ff4444';m.textContent='❌ '+d.error}}catch(e){m.style.color='#ff4444';m.textContent='❌ Connection error'}}</script></body></html>`}

// ========== RENDER: ADMIN PANEL ==========
function renderAdmin(user){
    const totalUsers = Object.values(db.users).filter(v=>v.username&&v.role!=='admin').length;
    const totalPayments = db.payments.length;
    const pendingPayments = db.payments.filter(p=>p.status==='pending').length;
    const totalRevenue = db.payments.filter(p=>p.status==='approved').reduce((a,p)=>a+p.amount,0);
    const bannedUsers = Object.values(db.users).filter(v=>v.username&&v.banned).length;
    
    const usersHTML=Object.entries(db.users).filter(([k,v])=>v.role!=='admin'&&v.username).map(([k,v])=>`<tr><td style="color:#fff">@${esc(v.username)}</td><td>🪙 ${v.credit}</td><td><code>${v.ip||'?'}</code></td><td style="color:${v.banned?'#ff4444':'#00ff88'}">${v.banned?'🚫 BANNED':'✅ ACTIVE'}</td><td style="font-size:9px">${new Date(v.created).toLocaleDateString('en-IN')}</td><td><button class="ab a-g" onclick="addCreditToUser('${esc(v.username)}')">💳</button><button class="ab ${v.banned?'a-g':'a-r'}" onclick="banUser('${esc(v.username)}')">${v.banned?'✅ UNBAN':'🚫 BAN'}</button><button class="ab a-r" onclick="deleteUser('${esc(v.username)}')">🗑</button></td></tr>`).join('');
    
    const payHTML=db.payments.slice(-30).reverse().map(p=>`<tr><td><code style="font-size:8px">${p.id}</code></td><td>@${p.username}</td><td>🪙 ${p.credit}</td><td>₹${p.amount}</td><td style="color:${p.status==='approved'?'#00ff88':'#ffb400'};font-weight:700">${p.status==='approved'?'✅ APPROVED':'⏳ PENDING'}</td><td style="font-size:9px">${new Date(p.timestamp).toLocaleString('en-IN')}</td><td><code>${p.ip}</code></td><td>${p.status==='pending'?`<button class="ab a-g" onclick="approvePayment('${p.id}','${p.username}',${p.credit})">✅ APPROVE</button><button class="ab a-r" onclick="rejectPayment('${p.id}')">❌</button>`:'✅'}</td></tr>`).join('');
    
    const ipHTML=db.bannedIPs.length>0?db.bannedIPs.map(ip=>`<tr><td><code>${ip}</code></td><td style="color:#ff4444">🚫 BANNED</td><td><button class="ab a-g" onclick="unbanIP('${ip}')">✅ UNBAN</button></td></tr>`).join(''):'<tr><td colspan="3" style="color:#444;text-align:center;padding:20px">✅ No banned IPs</td></tr>';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX ADMIN V5</title><link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet"><style>
:root{--bg:#020010;--sur:rgba(8,8,30,.8);--brd:rgba(255,180,0,.06);--txt:#d8d8f0;--acc:#ffb400;--acc2:#ff8c00;--green:#00ff88;--red:#ff4444;--blue:#0096ff}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--txt);font-family:'Rajdhani',sans-serif;font-size:13px;min-height:100vh}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,180,0,.05),transparent 60%);pointer-events:none;z-index:0}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#020010}::-webkit-scrollbar-thumb{background:var(--acc);border-radius:10px}
.top{background:rgba(8,8,30,.9);border-bottom:1px solid var(--brd);padding:14px 24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;position:sticky;top:0;z-index:100;backdrop-filter:blur(30px)}
.top h1{font-family:'Orbitron',sans-serif;font-size:15px;letter-spacing:5px;background:linear-gradient(90deg,#ffb400,#ff8c00,#ffb400);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900}
.top .nav-links{display:flex;gap:8px;align-items:center}.top .nav-links a{color:#887700;text-decoration:none;font-size:10px;font-weight:600;padding:6px 12px;border:1px solid var(--brd);border-radius:8px;transition:.3s}.top .nav-links a:hover{border-color:var(--acc);color:var(--acc)}
.container{max-width:1500px;margin:0 auto;padding:20px;position:relative;z-index:1}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:18px}
.stat-card{background:var(--sur);border:1px solid var(--brd);border-radius:16px;padding:16px;text-align:center;backdrop-filter:blur(20px);transition:.3s}.stat-card:hover{border-color:var(--acc);box-shadow:0 0 40px rgba(255,180,0,.06);transform:translateY(-2px)}
.stat-card .val{font-size:28px;font-weight:900;background:linear-gradient(135deg,#ffb400,#ff8c00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-family:'Orbitron',sans-serif}
.stat-card .lbl{font-size:9px;color:#665500;text-transform:uppercase;letter-spacing:3px;margin-top:4px;font-weight:600}
.tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}.tab{padding:10px 20px;background:var(--sur);border:1px solid var(--brd);border-radius:10px;color:#665500;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:1px;transition:.3s;font-family:'Rajdhani',sans-serif}.tab:hover{border-color:var(--acc);color:var(--acc)}.tab.on{background:rgba(255,180,0,.06);border-color:var(--acc);color:#fff;box-shadow:0 0 30px rgba(255,180,0,.06)}
.panel{display:none}.panel.on{display:block}
.section{background:var(--sur);border:1px solid var(--brd);border-radius:18px;padding:20px;margin-bottom:16px;backdrop-filter:blur(20px)}
.section h3{color:#fff;margin-bottom:14px;font-family:'Orbitron',sans-serif;font-size:14px;letter-spacing:2px;display:flex;align-items:center;gap:8px}
.section h3 .count{background:rgba(255,180,0,.1);color:var(--acc);padding:2px 10px;border-radius:12px;font-size:10px}
table{width:100%;border-collapse:collapse;font-size:10px}th{background:rgba(255,180,0,.03);color:#887700;padding:10px 8px;text-align:left;font-size:9px;letter-spacing:2px;font-weight:600}td{padding:8px;border-bottom:1px solid rgba(255,255,255,.01)}tr:hover td{background:rgba(255,180,0,.01)}
code{color:#ffb400;font-family:monospace;font-size:9px}
.ab{padding:6px 12px;font-size:10px;border-radius:8px;border:1px solid;cursor:pointer;font-weight:600;transition:.3s;background:transparent;font-family:'Rajdhani',sans-serif;margin:1px}
.a-g{color:var(--green);border-color:rgba(0,255,136,.2)}.a-g:hover{background:rgba(0,255,136,.05)}.a-r{color:var(--red);border-color:rgba(255,68,68,.2)}.a-r:hover{background:rgba(255,68,68,.05)}
input,select{padding:12px 14px;background:rgba(0,0,0,.5);border:1px solid var(--brd);border-radius:12px;color:#fff;font-size:12px;outline:none;font-family:'Rajdhani',sans-serif;margin-right:8px;margin-bottom:8px;transition:.3s}input:focus{border-color:var(--acc);box-shadow:0 0 25px rgba(255,180,0,.08)}
.btn{padding:12px 24px;background:linear-gradient(135deg,#ffb400,#ff8c00);color:#000;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:2px;font-size:12px;transition:.3s}.btn:hover{transform:translateY(-2px);box-shadow:0 0 35px rgba(255,180,0,.2)}
.btn-red{padding:12px 24px;background:linear-gradient(135deg,#ff4444,#cc0000);color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif}
.alert{background:rgba(255,180,0,.05);border:1px solid rgba(255,180,0,.1);border-radius:12px;padding:14px;margin-bottom:16px;color:#ffb400;font-size:11px;text-align:center}
@media(max-width:768px){.stats-grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body>
<div class="top"><h1>👑 BRONX ADMIN V5</h1><div class="nav-links"><span style="color:#444;font-size:10px">👤 admin</span><a href="/">🏠 HOME</a><a href="/admin-login" onclick="localStorage.removeItem('adminToken')">🚪 LOGOUT</a></div></div>
<div class="container">
<div class="stats-grid">
<div class="stat-card"><div class="val">${totalUsers}</div><div class="lbl">Total Users</div></div>
<div class="stat-card"><div class="val">${bannedUsers}</div><div class="lbl">Banned</div></div>
<div class="stat-card"><div class="val">${totalPayments}</div><div class="lbl">Payments</div></div>
<div class="stat-card"><div class="val">${pendingPayments}</div><div class="lbl">Pending</div></div>
<div class="stat-card"><div class="val">₹${totalRevenue}</div><div class="lbl">Revenue</div></div>
<div class="stat-card"><div class="val">${db.bannedIPs.length}</div><div class="lbl">Banned IPs</div></div>
</div>
${pendingPayments>0?`<div class="alert">⚠️ <b>${pendingPayments}</b> pending payments need approval!</div>`:''}
<div class="tabs">
<div class="tab on" onclick="st('users')">👥 USERS</div>
<div class="tab" onclick="st('payments')">💳 PAYMENTS</div>
<div class="tab" onclick="st('addcredit')">🪙 ADD CREDIT</div>
<div class="tab" onclick="st('ips')">🛡 IPs</div>
<div class="tab" onclick="st('settings')">⚙ SETTINGS</div>
</div>
<div class="panel on" id="panel-users"><div class="section"><h3>👥 ALL USERS <span class="count">${totalUsers}</span></h3><div style="max-height:450px;overflow:auto"><table><tr><th>USERNAME</th><th>CREDIT</th><th>IP</th><th>STATUS</th><th>JOINED</th><th>ACTIONS</th></tr>${usersHTML}</table></div></div></div>
<div class="panel" id="panel-payments"><div class="section"><h3>💳 PAYMENT LOGS <span class="count">${totalPayments}</span></h3><div style="max-height:450px;overflow:auto"><table><tr><th>ID</th><th>USER</th><th>CR</th><th>₹</th><th>STATUS</th><th>DATE</th><th>IP</th><th>ACT</th></tr>${payHTML}</table></div></div></div>
<div class="panel" id="panel-addcredit"><div class="section"><h3>🪙 ADD CREDIT TO USER</h3><div style="display:flex;gap:10px;flex-wrap:wrap"><input type="text" id="addUser" placeholder="Username" style="flex:1"><input type="number" id="addCredit" placeholder="Amount" value="100" style="width:120px"><button class="btn" onclick="addCredit()">💳 ADD</button></div></div></div>
<div class="panel" id="panel-ips"><div class="section"><h3>🛡 IP MANAGER <span class="count">${db.bannedIPs.length}</span></h3><div style="display:flex;gap:10px;margin-bottom:16px"><input type="text" id="banIp" placeholder="Enter IP..." style="flex:1"><button class="btn" onclick="banIP()">🚫 BAN</button></div><div style="max-height:350px;overflow:auto"><table><tr><th>IP ADDRESS</th><th>STATUS</th><th>ACTION</th></tr>${ipHTML}</table></div></div></div>
<div class="panel" id="panel-settings"><div class="section"><h3>⚙ SETTINGS</h3><button class="btn" onclick="if(confirm('Clear ALL payment logs?'))clearPayments()" style="margin-bottom:10px">🗑 CLEAR PAYMENT LOGS</button><br><button class="btn-red" onclick="if(confirm('⚠️ Delete ALL data?'))resetAll()">⚠️ RESET ALL DATA</button></div></div>
</div>
<script>
var TOKEN='${esc(user.token)}';localStorage.setItem('adminToken',TOKEN);
function st(n){document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));document.getElementById('panel-'+n).classList.add('on');event.target.classList.add('on')}
async function ac(url,body){var o={method:body?'POST':'GET',headers:{'Content-Type':'application/json','x-admin-token':TOKEN}};if(body)o.body=JSON.stringify(body);var r=await fetch(url,o);return await r.json()}
function toast(msg,color){var t=document.createElement('div');t.style.cssText='position:fixed;top:20px;right:20px;background:'+(color||'#ffb400')+';color:#000;padding:12px 20px;border-radius:10px;font-size:12px;z-index:9999;font-weight:700;font-family:Rajdhani,sans-serif';t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove()},2500)}
async function addCredit(){var u=document.getElementById('addUser').value.trim(),c=parseInt(document.getElementById('addCredit').value);if(!u||!c)return toast('⚠ Fill fields','#ff4444');var r=await ac('/api/admin/add-credit',{username:u,credit:c});if(r.success){toast('✅ '+r.message,'#00ff88');setTimeout(()=>location.reload(),800)}else toast('❌ '+r.error,'#ff4444')}
async function addCreditToUser(u){var c=prompt('Credit amount for @'+u+':','100');if(!c)return;var r=await ac('/api/admin/add-credit',{username:u,credit:parseInt(c)});if(r.success){toast('✅ Added!','#00ff88');setTimeout(()=>location.reload(),800)}else toast('❌ '+r.error,'#ff4444')}
async function banUser(u){await ac('/api/admin/ban-user',{username:u});location.reload()}
async function deleteUser(u){if(!confirm('⚠️ Delete @'+u+'?'))return;await ac('/api/admin/delete-user',{username:u});location.reload()}
async function approvePayment(id,user,cr){if(!confirm('Approve '+id+'?'))return;var r=await ac('/api/admin/add-credit',{username:user,credit:cr,payment_id:id});if(r.success){toast('✅ Approved!','#00ff88');setTimeout(()=>location.reload(),800)}else toast('❌ '+r.error,'#ff4444')}
async function rejectPayment(id){if(!confirm('Reject?'))return;await ac('/api/admin/reject-payment',{payment_id:id});location.reload()}
async function banIP(){var ip=document.getElementById('banIp').value.trim();if(!ip)return;await ac('/api/admin/ban-ip',{ip:ip});location.reload()}
async function unbanIP(ip){await ac('/api/admin/ban-ip',{ip:ip});location.reload()}
async function clearPayments(){await ac('/api/admin/clear-payments');location.reload()}
async function resetAll(){await ac('/api/admin/reset-all');location.reload()}
</script></body></html>`;
}

// ========== STARTUP ==========
loadDB();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 BRONX CREDIT OSINT V5.0 on port ${PORT}`));
module.exports = app;
