// api/index.js - BRONX V10.1 - ADMIN LOGIN FULLY FIXED
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
const DATA_FILE = path.join(DATA_DIR, 'bronx_data.json');
const UPI_ID = process.env.UPI_ID || '8509561376@ibl';
const UPI_NAME = process.env.UPI_NAME || 'BRONX_ULTRA';

// ========== DATABASE ==========
let db = { 
    users: {}, 
    payments: [], 
    tickets: [], 
    broadcast: null, 
    bannedIPs: [], 
    customAPIs: [], 
    adminSessions: {} // 🔥 SEPARATE ADMIN SESSION STORE
};

// Owner accounts that get special privileges
const OWNER_ACCOUNTS = ['bronx_ultra', 'king-bronx', 'bronx', 'king', 'admin', 'owner', 'ftgamer2'];

// ========== HELPERS ==========
function save() { 
    try { 
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); 
        console.log('💾 Data saved');
    } catch(e) { 
        console.error('Save error:', e); 
    } 
}

function load() { 
    try { 
        if(fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if(!db.adminSessions) db.adminSessions = {};
            console.log('📂 Data loaded | Users:', Object.keys(db.users).filter(k => db.users[k].username).length);
        }
    } catch(e) { 
        console.error('Load error:', e); 
    } 
}

function genToken() { 
    return crypto.randomBytes(16).toString('hex'); 
}

function isOwner(username) { 
    return OWNER_ACCOUNTS.includes(username?.toLowerCase()); 
}

// 🔥 SIMPLE TOKEN EXTRACTION
function getToken(req) {
    return req.query.token || 
           req.headers['x-auth-token'] || 
           req.headers['authorization']?.replace('Bearer ', '') ||
           req.body?.token;
}

// 🔥 ULTRA SIMPLE ADMIN CHECK - NO COMPLEX LOGIC
function isAdmin(req) {
    const token = getToken(req);
    if(!token) return false;
    
    // Check admin sessions
    if(db.adminSessions[token]) {
        return true;
    }
    
    // Check users DB for admin role
    if(db.users[token] && db.users[token].role === 'admin') {
        return true;
    }
    
    return false;
}

// Middleware
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token, authorization');
    if(req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// ========== PAGES ==========
app.get('/', (req, res) => {
    const token = getToken(req);
    let user = token ? db.users[token] : null;
    res.send(renderHome(user));
});

app.get('/login', (req, res) => {
    // Auto-redirect if already logged in
    const token = getToken(req);
    if(token && db.users[token]) {
        return res.redirect('/?token=' + token);
    }
    res.send(renderLogin());
});

app.get('/register', (req, res) => {
    const token = getToken(req);
    if(token && db.users[token]) {
        return res.redirect('/?token=' + token);
    }
    res.send(renderRegister());
});

// ========== AUTH API ==========
app.post('/api/register', (req, res) => {
    const {username, password} = req.body;
    
    if(!username || !password || username.length < 3 || password.length < 4) {
        return res.json({s: 0, e: 'Username 3+ chars, Password 4+ chars'});
    }
    
    if(db.users[username]) {
        return res.json({s: 0, e: 'Username already taken'});
    }
    
    const token = genToken();
    const credit = isOwner(username) ? 99999 : 1;
    
    db.users[username] = {
        username: username,
        password: password,
        credit: credit,
        role: isOwner(username) ? 'owner' : 'user',
        token: token,
        banned: false,
        created: new Date().toISOString()
    };
    
    db.users[token] = {
        username: username,
        credit: credit,
        role: isOwner(username) ? 'owner' : 'user',
        token: token
    };
    
    save();
    console.log(`✅ Registered: ${username} | Credits: ${credit}`);
    
    res.json({s: 1, token: token, credit: credit, username: username});
});

app.post('/api/login', (req, res) => {
    const {username, password} = req.body;
    
    if(!username || !password) {
        return res.json({s: 0, e: 'Fill all fields'});
    }
    
    const user = db.users[username];
    if(!user) return res.json({s: 0, e: 'Account not found'});
    if(user.password !== password) return res.json({s: 0, e: 'Wrong password'});
    if(user.banned) return res.json({s: 0, e: 'Account banned'});
    
    // Use existing token or create new
    let token = user.token;
    if(!token) {
        token = genToken();
        user.token = token;
    }
    
    // Update token reference
    db.users[token] = {
        username: username,
        credit: user.credit,
        role: user.role || 'user',
        token: token
    };
    
    save();
    console.log(`✅ Login: ${username}`);
    
    res.json({s: 1, token: token, credit: user.credit, username: username});
});

// ========== 🔥 ADMIN LOGIN - COMPLETELY REWRITTEN ==========
app.get('/admin-login', (req, res) => {
    // 🔥 CHECK IF ALREADY LOGGED IN AS ADMIN
    const token = getToken(req);
    if(token && db.adminSessions[token]) {
        console.log('🔄 Admin already logged in, redirecting to panel');
        return res.redirect('/admin?token=' + token);
    }
    res.send(renderAdminLogin());
});

app.post('/api/admin-login', (req, res) => {
    const {username, password} = req.body;
    console.log('👑 Admin login attempt:', username);
    
    if(username === ADMIN_USER && password === ADMIN_PASS) {
        // 🔥 CREATE ADMIN SESSION
        const token = 'ADMIN_' + genToken();
        
        // Store in admin sessions
        db.adminSessions[token] = {
            username: 'admin',
            role: 'admin',
            created: Date.now(),
            ip: req.ip
        };
        
        // Also store in users DB
        db.users[token] = {
            username: 'admin',
            credit: 99999,
            role: 'admin',
            token: token
        };
        
        save();
        console.log('✅ Admin logged in | Token:', token.substring(0, 20));
        
        // 🔥 RETURN SIMPLE RESPONSE
        return res.json({
            s: 1, 
            token: token,
            redirect: '/admin'
        });
    }
    
    console.log('❌ Admin login failed');
    res.json({s: 0, e: 'Wrong credentials'});
});

// ========== 🔥 ADMIN PANEL - FIXED ==========
app.get('/admin', (req, res) => {
    const token = getToken(req);
    console.log('📊 Admin panel access - Token exists:', !!token);
    
    // 🔥 SIMPLE CHECK
    if(!token) {
        console.log('❌ No token, redirecting to login');
        return res.redirect('/admin-login');
    }
    
    if(!db.adminSessions[token] && (!db.users[token] || db.users[token].role !== 'admin')) {
        console.log('❌ Invalid admin session, redirecting to login');
        return res.redirect('/admin-login');
    }
    
    console.log('✅ Admin panel access granted');
    res.send(renderAdminPanel(token));
});

// ========== 🔥 ADMIN API - FIXED ==========
app.post('/api/admin/add-credit', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    const {username, credit, payment_id} = req.body;
    console.log('💳 Add credit:', {username, credit});
    
    if(!username || !credit) return res.json({s: 0, e: 'Missing fields'});
    
    const user = db.users[username];
    if(!user) return res.json({s: 0, e: 'User not found'});
    
    const amount = parseInt(credit);
    
    // 🔥 ONLY ADD TO OWNER ACCOUNTS
    if(OWNER_ACCOUNTS.includes(username.toLowerCase())) {
        user.credit += amount;
        
        // Update all token references
        Object.keys(db.users).forEach(k => {
            if(db.users[k].username === username) {
                db.users[k].credit = user.credit;
            }
        });
        
        if(payment_id) {
            const payment = db.payments.find(p => p.id === payment_id);
            if(payment) payment.status = 'approved';
        }
        
        save();
        console.log(`✅ ${amount} credits added to ${username}`);
        res.json({s: 1, msg: `✅ Added ${amount} credits to @${username}`});
    } else {
        res.json({s: 0, e: '❌ Credits only for owner accounts'});
    }
});

app.post('/api/admin/ban-user', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    const {username} = req.body;
    if(db.users[username]) {
        db.users[username].banned = !db.users[username].banned;
        save();
    }
    res.json({s: 1});
});

app.post('/api/admin/ban-ip', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    const {ip} = req.body;
    if(!ip) return res.json({s: 0, e: 'Missing IP'});
    
    if(!db.bannedIPs) db.bannedIPs = [];
    const index = db.bannedIPs.indexOf(ip);
    if(index > -1) {
        db.bannedIPs.splice(index, 1);
    } else {
        db.bannedIPs.push(ip);
    }
    save();
    res.json({s: 1});
});

app.post('/api/admin/reply-ticket', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    const {ticket_id, reply} = req.body;
    const ticket = db.tickets.find(t => t.id === ticket_id);
    if(ticket) {
        ticket.reply = reply;
        ticket.status = 'closed';
        save();
    }
    res.json({s: 1});
});

app.post('/api/admin/reject-payment', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    const {payment_id} = req.body;
    const payment = db.payments.find(p => p.id === payment_id);
    if(payment) {
        payment.status = 'rejected';
        save();
    }
    res.json({s: 1});
});

app.post('/api/admin/broadcast', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    db.broadcast = {message: req.body.message, ts: new Date().toISOString()};
    save();
    res.json({s: 1});
});

app.post('/api/admin/clear-broadcast', (req, res) => {
    if(!isAdmin(req)) return res.status(401).json({s: 0, e: 'Unauthorized'});
    
    db.broadcast = null;
    save();
    res.json({s: 1});
});

// ========== SERVICES API ==========
const SERVICES = {
    number: {n:'📱 Number Info', c:5, a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/number', p:'num'},
    aadhar: {n:'🆔 Aadhar Info', c:10, a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/aadhar', p:'num'},
    vehicle: {n:'🚗 Vehicle Info', c:10, a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/vehicle', p:'vehicle'},
    ff: {n:'🎮 Free Fire', c:3, a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ff', p:'uid'},
    upi: {n:'💰 UPI Lookup', c:5, a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/upi', p:'upi'},
    ifsc: {n:'🏦 IFSC Info', c:3, a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ifsc', p:'ifsc'}
};

app.get('/api/service/:name', async (req, res) => {
    const service = SERVICES[req.params.name];
    if(!service) return res.json({s: 0, e: 'Service not found'});
    
    const token = getToken(req);
    if(!token) return res.json({s: 0, e: 'Login required'});
    
    let user = db.users[token];
    if(!user) return res.json({s: 0, e: 'Session expired'});
    
    if(user.username && db.users[user.username]) {
        user.credit = db.users[user.username].credit;
    }
    
    if(user.credit < service.c) {
        return res.json({s: 0, e: `Need ${service.c} credits. You have ${user.credit}`});
    }
    
    const value = req.query[service.p] || req.query.q;
    if(!value) return res.json({s: 0, e: `Enter ${service.p}`});
    
    // Deduct credit
    user.credit -= service.c;
    if(user.username && db.users[user.username]) {
        db.users[user.username].credit = user.credit;
    }
    save();
    
    try {
        const url = service.a + '?key=op&' + service.p + '=' + encodeURIComponent(value);
        const response = await axios.get(url, {timeout: 20000});
        const data = response.data;
        data.api_info = {service: service.n, credit_used: service.c, remaining: user.credit};
        res.json(data);
    } catch(e) {
        // Refund
        user.credit += service.c;
        if(user.username && db.users[user.username]) {
            db.users[user.username].credit = user.credit;
        }
        save();
        res.json({s: 0, e: 'API error. Credits refunded.'});
    }
});

// Payment
app.post('/api/create-payment', (req, res) => {
    const token = getToken(req);
    if(!token) return res.json({s: 0, e: 'Login first'});
    
    const user = db.users[token];
    if(!user) return res.json({s: 0, e: 'Invalid session'});
    
    const {plan_credit, plan_price} = req.body;
    const pid = 'BRONX' + genToken().substring(0, 8).toUpperCase();
    
    db.payments.push({
        id: pid,
        username: user.username,
        credit: plan_credit,
        amount: plan_price,
        status: 'pending',
        ts: new Date().toISOString()
    });
    
    const upl = `upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}&am=${plan_price}&tn=${pid}&cu=INR`;
    
    save();
    res.json({s: 1, pid, upl});
});

// Support
app.post('/api/support', (req, res) => {
    const token = getToken(req);
    const user = token ? db.users[token] : null;
    
    db.tickets.push({
        id: 'TKT' + genToken().substring(0, 6).toUpperCase(),
        username: user?.username || 'guest',
        message: req.body.message,
        status: 'open',
        reply: '',
        ts: new Date().toISOString()
    });
    save();
    res.json({s: 1});
});

app.get('/api/tickets', (req, res) => {
    const token = getToken(req);
    const user = token ? db.users[token] : null;
    res.json({s: 1, tickets: db.tickets.filter(t => t.username === user?.username).reverse()});
});

app.get('/api/broadcast', (req, res) => {
    res.json({s: 1, broadcast: db.broadcast});
});

// ========== RENDER FUNCTIONS (SIMPLIFIED) ==========
function renderHome(user) {
    const credit = user ? user.credit : 0;
    const username = user ? user.username : '';
    const token = user ? user.token : '';
    
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX OSINT</title>
<style>body{background:#0a0a1a;color:#fff;font-family:sans-serif;margin:0;padding:20px}nav{display:flex;justify-content:space-between;padding:10px;background:rgba(0,0,0,.5);border-radius:10px;margin-bottom:20px}.card{background:rgba(255,255,255,.05);padding:20px;border-radius:15px;margin:10px;cursor:pointer;display:inline-block;text-align:center;min-width:150px}.card:hover{background:rgba(255,255,255,.1)}.btn{background:#ffb400;color:#000;padding:12px 24px;border:none;border-radius:10px;cursor:pointer;font-weight:bold;margin:5px}</style></head><body>
<nav><h2>⚡ BRONX V10</h2><div>${token ? `<span>🪙 ${credit}</span> @${username} <a href="/login" onclick="localStorage.clear()" style="color:red">LOGOUT</a>` : '<a href="/login" style="color:#ffb400">LOGIN</a>'}</div></nav>
<h1 style="text-align:center">🔍 OSINT SERVICES</h1>
<div style="text-align:center">
${Object.entries(SERVICES).map(([k,s]) => `<div class="card" onclick="useService('${k}')"><h3>${s.n}</h3><p>🪙 ${s.c} credits</p></div>`).join('')}
</div>
<div id="result" style="background:rgba(0,0,0,.3);padding:15px;border-radius:10px;margin:20px;display:none;white-space:pre-wrap;font-family:monospace"></div>
<script>
var TOKEN='${token}';if(TOKEN)localStorage.setItem('token',TOKEN);
async function useService(name){
    if(!TOKEN){location.href='/login';return}
    var val=prompt('Enter value:');
    if(!val)return;
    document.getElementById('result').style.display='block';
    document.getElementById('result').textContent='Searching...';
    try{
        var r=await fetch('/api/service/'+name+'?token='+TOKEN+'&q='+encodeURIComponent(val));
        var d=await r.json();
        document.getElementById('result').textContent=JSON.stringify(d,null,2);
    }catch(e){
        document.getElementById('result').textContent='Error: '+e.message;
    }
}
</script></body></html>`;
}

function renderLogin() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LOGIN</title>
<style>body{background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif}.card{background:rgba(0,0,0,.5);padding:40px;border-radius:20px;width:350px;text-align:center}.card input{width:100%;padding:12px;margin:8px 0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:16px}.card button{width:100%;padding:12px;background:#ffb400;color:#000;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;margin-top:10px}.card a{color:#ffb400;text-decoration:none;font-size:14px}</style></head><body>
<div class="card"><h2 style="color:#ffb400">🔐 LOGIN</h2>
<input type="text" id="u" placeholder="Username"><input type="password" id="p" placeholder="Password">
<button onclick="login()">LOGIN</button><p id="msg" style="color:red;display:none"></p>
<p style="margin-top:15px"><a href="/register">Register</a> | <a href="/">Home</a></p></div>
<script>
var saved=localStorage.getItem('token');if(saved)location.href='/?token='+saved;
async function login(){
    var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim();
    if(!u||!p)return;
    var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    var d=await r.json();
    if(d.s){localStorage.setItem('token',d.token);location.href='/?token='+d.token}
    else{document.getElementById('msg').style.display='block';document.getElementById('msg').textContent=d.e}
}
</script></body></html>`;
}

function renderRegister() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>REGISTER</title>
<style>body{background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif}.card{background:rgba(0,0,0,.5);padding:40px;border-radius:20px;width:350px;text-align:center}.card input{width:100%;padding:12px;margin:8px 0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:16px}.card button{width:100%;padding:12px;background:#8b00ff;color:#fff;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;margin-top:10px}.card a{color:#8b00ff;text-decoration:none;font-size:14px}</style></head><body>
<div class="card"><h2 style="color:#8b00ff">🆕 REGISTER</h2>
<input type="text" id="u" placeholder="Username (min 3 chars)"><input type="password" id="p" placeholder="Password (min 4 chars)">
<button onclick="register()">CREATE ACCOUNT</button><p id="msg" style="color:red;display:none"></p>
<p style="margin-top:15px"><a href="/login">Login</a> | <a href="/">Home</a></p></div>
<script>
async function register(){
    var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim();
    if(!u||!p||u.length<3||p.length<4){document.getElementById('msg').style.display='block';document.getElementById('msg').textContent='Username 3+, Password 4+';return}
    var r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    var d=await r.json();
    if(d.s){localStorage.setItem('token',d.token);location.href='/?token='+d.token}
    else{document.getElementById('msg').style.display='block';document.getElementById('msg').textContent=d.e}
}
</script></body></html>`;
}

// 🔥 ADMIN LOGIN PAGE - SIMPLE
function renderAdminLogin() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMIN LOGIN</title>
<style>body{background:#0a0a1a;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif}.card{background:rgba(0,0,0,.5);padding:40px;border-radius:20px;width:350px;text-align:center;border:2px solid rgba(255,180,0,.2)}.card input{width:100%;padding:12px;margin:8px 0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff;font-size:16px}.card button{width:100%;padding:12px;background:#ffb400;color:#000;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;margin-top:10px}</style></head><body>
<div class="card"><h2 style="color:#ffb400">👑 ADMIN LOGIN</h2>
<input type="text" id="u" placeholder="Admin Username"><input type="password" id="p" placeholder="Admin Password">
<button onclick="adminLogin()">LOGIN AS ADMIN</button><p id="msg" style="color:red;display:none"></p></div>
<script>
// 🔥 Check if already logged in
var savedAdmin = localStorage.getItem('adminToken');
if(savedAdmin) {
    // Verify session is still valid
    fetch('/admin?token=' + savedAdmin, {method: 'HEAD'})
        .then(r => {
            if(r.ok) location.href = '/admin?token=' + savedAdmin;
            else localStorage.removeItem('adminToken');
        })
        .catch(() => localStorage.removeItem('adminToken'));
}

async function adminLogin(){
    var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim();
    if(!u||!p)return;
    
    var r=await fetch('/api/admin-login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username:u,password:p})
    });
    
    var d=await r.json();
    
    if(d.s){
        // 🔥 SAVE TOKEN AND REDIRECT
        localStorage.setItem('adminToken', d.token);
        window.location.href = '/admin?token=' + d.token;
    } else {
        document.getElementById('msg').style.display='block';
        document.getElementById('msg').textContent = '❌ ' + d.e;
    }
}
</script></body></html>`;
}

// 🔥 ADMIN PANEL - FIXED
function renderAdminPanel(token) {
    const users = Object.values(db.users).filter(u => u.username && u.role !== 'admin');
    const payments = db.payments.slice(-30).reverse();
    const tickets = db.tickets.slice(-20).reverse();
    
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMIN PANEL</title>
<style>body{background:#0a0a1a;color:#fff;font-family:sans-serif;margin:0;padding:20px}nav{background:rgba(0,0,0,.5);padding:15px;border-radius:10px;display:flex;justify-content:space-between;margin-bottom:20px}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid rgba(255,255,255,.1);padding:10px;text-align:left}th{background:rgba(255,180,0,.1)}.btn{padding:8px 16px;margin:3px;border:none;border-radius:6px;cursor:pointer;font-weight:bold}.btn-green{background:#00ff88;color:#000}.btn-red{background:#ff4444;color:#fff}.btn-orange{background:#ffb400;color:#000}.section{background:rgba(0,0,0,.3);padding:20px;border-radius:15px;margin:15px 0}input,textarea{width:100%;padding:10px;margin:5px 0;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);border-radius:8px;color:#fff}</style></head><body>
<nav><h2>👑 ADMIN PANEL</h2><div><button class="btn btn-red" onclick="logout()">LOGOUT</button> <a href="/" style="color:#ffb400">HOME</a></div></nav>

<div class="section"><h3>📊 STATS</h3>
<p>Users: ${users.length} | Payments: ${payments.length} | Pending: ${payments.filter(p=>p.status==='pending').length}</p>
</div>

<div class="section"><h3>👥 USERS</h3>
<table><tr><th>Username</th><th>Credits</th><th>Role</th><th>Status</th><th>Actions</th></tr>
${users.map(u => `<tr><td>@${u.username}</td><td>🪙 ${u.credit}</td><td>${u.role||'user'}</td><td style="color:${u.banned?'red':'lime'}">${u.banned?'BANNED':'OK'}</td>
<td><button class="btn btn-green" onclick="addCredit('${u.username}')">ADD CREDIT</button>
<button class="btn ${u.banned?'btn-green':'btn-red'}" onclick="banUser('${u.username}')">${u.banned?'UNBAN':'BAN'}</button></td></tr>`).join('')}
</table></div>

<div class="section"><h3>💳 PAYMENTS</h3>
<table><tr><th>ID</th><th>User</th><th>Credits</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
${payments.map(p => `<tr><td>${p.id}</td><td>@${p.username}</td><td>${p.credit}</td><td>₹${p.amount}</td>
<td style="color:${p.status==='approved'?'lime':p.status==='rejected'?'red':'orange'}">${p.status}</td>
<td>${p.status==='pending'?`<button class="btn btn-green" onclick="approve('${p.id}','${p.username}',${p.credit})">APPROVE</button><button class="btn btn-red" onclick="reject('${p.id}')">REJECT</button>`:'✓'}</td></tr>`).join('')}
</table></div>

<div class="section"><h3>💬 TICKETS</h3>
<table><tr><th>ID</th><th>User</th><th>Message</th><th>Status</th><th>Reply</th></tr>
${tickets.map(t => `<tr><td>${t.id}</td><td>@${t.username||'guest'}</td><td>${t.message.substring(0,50)}</td>
<td style="color:${t.status==='open'?'orange':'lime'}">${t.status}</td>
<td>${t.status==='open'?`<button class="btn btn-green" onclick="replyTicket('${t.id}')">REPLY</button>`:(t.reply||'✅')}</td></tr>`).join('')}
</table></div>

<div class="section"><h3>📢 BROADCAST</h3>
<textarea id="bmsg" placeholder="Message to all users..."></textarea>
<button class="btn btn-orange" onclick="broadcast()">SEND</button>
${db.broadcast ? `<button class="btn btn-red" onclick="clearBroadcast()">CLEAR</button>` : ''}
</div>

<script>
var TOKEN = '${token}';
if(TOKEN) localStorage.setItem('adminToken', TOKEN);

async function api(url, body) {
    var r = await fetch(url + '?token=' + TOKEN, {
        method: body ? 'POST' : 'GET',
        headers: {'Content-Type': 'application/json'},
        body: body ? JSON.stringify(body) : null
    });
    return await r.json();
}

async function addCredit(u) {
    var c = prompt('Credit amount:', '100');
    if(!c) return;
    var r = await api('/api/admin/add-credit', {username: u, credit: parseInt(c)});
    alert(r.s ? r.msg : r.e);
    if(r.s) location.reload();
}

async function banUser(u) { await api('/api/admin/ban-user', {username: u}); location.reload(); }
async function approve(id, u, c) {
    if(!confirm('Approve and add ' + c + ' credits?')) return;
    await api('/api/admin/add-credit', {username: u, credit: c, payment_id: id});
    location.reload();
}
async function reject(id) { await api('/api/admin/reject-payment', {payment_id: id}); location.reload(); }
async function replyTicket(id) {
    var r = prompt('Reply:');
    if(!r) return;
    await api('/api/admin/reply-ticket', {ticket_id: id, reply: r});
    location.reload();
}
async function broadcast() {
    var m = document.getElementById('bmsg').value.trim();
    if(!m) return;
    await api('/api/admin/broadcast', {message: m});
    location.reload();
}
async function clearBroadcast() { await api('/api/admin/clear-broadcast'); location.reload(); }
function logout() { localStorage.clear(); location.href = '/admin-login'; }
</script></body></html>`;
}

// ========== START ==========
load();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 BRONX V10.1 running on port', PORT);
    console.log('👑 Admin:', ADMIN_USER, '/', ADMIN_PASS);
});
