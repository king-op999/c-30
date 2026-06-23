// api/index.js - BRONX CREDIT OSINT V10 - ULTIMATE FIXED
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'bronx2026';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const DATA_FILE = path.join(DATA_DIR, 'bronx_v10_data.json');
const UPI_ID = process.env.UPI_ID || '8509561376@ibl';
const UPI_NAME = process.env.UPI_NAME || 'BRONX_ULTRA';
const PROFILE_PIC = process.env.PROFILE_PIC || 'https://i.ibb.co/WWyL62r3/IMG-20260410-221523-297.jpg';

// 🔥 SUPER OWNER - Only these accounts get 99999 credits
const SUPER_OWNERS = ['bronx_ultra', 'king', 'admin', 'owner', 'bronx', 'ftgamer2', 'king-bronx'];
const OWNER_ACCOUNTS = ['bronx_ultra', 'king-bronx', 'bronx']; // Only these get credit transfers

let db = { 
    users: {}, 
    payments: [], 
    tickets: [], 
    broadcast: null, 
    bannedIPs: [], 
    customAPIs: [], 
    logs: [], 
    adminTokens: [], // Store admin tokens separately
    adminSessions: {} // Track admin sessions
};

const DEFAULT_SERVICES = {
    number:{n:'📱 Number Info',c:5,i:'📱',cl:'#0096ff',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/number',p:'num',k:'op'},
    aadhar:{n:'🆔 Aadhar Info',c:10,i:'🆔',cl:'#00c853',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/aadhar',p:'num',k:'op'},
    vehicle:{n:'🚗 Vehicle Info',c:10,i:'🚗',cl:'#ff6d00',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/vehicle',p:'vehicle',k:'op'},
    ff:{n:'🎮 Free Fire',c:3,i:'🎮',cl:'#ff1744',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ff',p:'uid',k:'op'},
    email:{n:'📧 Email Lookup',c:5,i:'📧',cl:'#ff9100',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/leakinfo',p:'term',k:'op'},
    tg:{n:'📲 TG to Num',c:12,i:'📲',cl:'#00b8d4',a:'https://tg-ifo-babu-0.vercel.app/tracex',p:'username',k:'BRONXop'},
    upi:{n:'💰 UPI Lookup',c:5,i:'💰',cl:'#7c4dff',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/upi',p:'upi',k:'op'},
    numtoupi:{n:'💳 Num to UPI',c:5,i:'💳',cl:'#e040fb',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/numtoupi',p:'num',k:'op'},
    numleak:{n:'🔓 Number Leak',c:8,i:'🔓',cl:'#ff5252',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/numleak',p:'num',k:'op'},
    ifsc:{n:'🏦 IFSC Info',c:3,i:'🏦',cl:'#2979ff',a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ifsc',p:'ifsc',k:'op'},
};

const PLANS = [
    {cr:1,pr:1},{cr:10,pr:5},{cr:15,pr:10},{cr:30,pr:20},{cr:40,pr:30},{cr:60,pr:50},
    {cr:80,pr:70},{cr:100,pr:80},{cr:120,pr:100},{cr:180,pr:150},{cr:220,pr:200},
    {cr:280,pr:250},{cr:600,pr:500},{cr:1200,pr:999,vip:true},
];

function getAllServices() {
    return {...DEFAULT_SERVICES, ...Object.fromEntries(db.customAPIs.filter(a => a.visible).map(a => [a.id, {
        n: a.name, c: a.credit, i: '🔧', cl: '#ffb400', a: a.url, p: a.param, k: ''
    }]))};
}

function sv() { 
    try { 
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); 
    } catch(e) { 
        console.error('Save error:', e); 
    } 
}

function ld() { 
    try { 
        if(fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            // Initialize missing arrays
            if(!db.adminTokens) db.adminTokens = [];
            if(!db.adminSessions) db.adminSessions = {};
            if(!db.customAPIs) db.customAPIs = [];
            if(!db.bannedIPs) db.bannedIPs = [];
            if(!db.logs) db.logs = [];
        }
    } catch(e) { 
        console.error('Load error:', e); 
    } 
}

function gid() { return crypto.randomBytes(8).toString('hex').toUpperCase(); }

function gt() { 
    return new Date(new Date().getTime() + (5.5 * 60 * 60 * 1000)); 
}

function esc(s) { 
    if(!s) return ''; 
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); 
}

function isSuperOwner(u) { 
    return SUPER_OWNERS.includes(u?.toLowerCase()); 
}

function isOwnerAccount(u) {
    return OWNER_ACCOUNTS.includes(u?.toLowerCase());
}

// 🔥 ENHANCED TOKEN EXTRACTION
function getToken(req) {
    return req.query.token || 
           req.headers['x-auth-token'] || 
           req.headers['authorization']?.replace('Bearer ', '') ||
           req.headers['x-admin-token'] ||
           req.body?.token ||
           req.cookies?.token; // Added cookie support
}

// 🔥 ENHANCED ADMIN CHECK
function checkAdmin(req, res, next) {
    const token = getToken(req);
    console.log('🔐 Admin Check - Token:', token?.substring(0, 20), 'Path:', req.path);
    
    // Check multiple sources
    let isValidAdmin = false;
    
    // Check admin sessions
    if(db.adminSessions[token]) {
        const session = db.adminSessions[token];
        if(session.expires > Date.now()) {
            isValidAdmin = true;
            req.user = { username: 'admin', role: 'admin', credit: 99999, token: token };
        } else {
            delete db.adminSessions[token];
        }
    }
    
    // Check admin tokens array
    if(!isValidAdmin && db.adminTokens && db.adminTokens.includes(token)) {
        isValidAdmin = true;
        req.user = { username: 'admin', role: 'admin', credit: 99999, token: token };
    }
    
    // Check users database for admin role
    if(!isValidAdmin && db.users[token] && db.users[token].role === 'admin') {
        isValidAdmin = true;
        req.user = db.users[token];
    }
    
    if(!token || !isValidAdmin) {
        console.log('❌ Admin Check FAILED');
        return res.status(401).json({s: 0, e: 'Unauthorized - Admin access required'});
    }
    
    console.log('✅ Admin Check PASSED for:', req.user?.username);
    next();
}

// Middleware
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-auth-token, authorization, x-admin-token');
    if(req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// IP Ban Check
app.use((req, res, next) => {
    req.clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    if(db.bannedIPs && db.bannedIPs.includes(req.clientIP)) {
        return res.status(403).send('<h1 style="color:red;text-align:center;margin-top:50px">🚫 IP BANNED</h1>');
    }
    next();
});

// ==================== PAGES ====================
app.get('/', (req, res) => {
    const token = getToken(req);
    let user = null;
    
    // 🔥 Enhanced user lookup
    if(token) {
        user = db.users[token];
        if(user && user.username && db.users[user.username]) {
            user.credit = db.users[user.username].credit;
            user.banned = db.users[user.username].banned;
        }
    }
    
    res.send(renderHome(user));
});

app.get('/login', (req, res) => {
    const token = getToken(req);
    // Auto-redirect if already logged in
    if(token && db.users[token]) {
        return res.redirect(`/?token=${token}`);
    }
    res.send(renderLogin());
});

app.get('/register', (req, res) => {
    const token = getToken(req);
    // Auto-redirect if already logged in
    if(token && db.users[token]) {
        return res.redirect(`/?token=${token}`);
    }
    res.send(renderRegister());
});

// ==================== AUTH ====================
app.post('/api/register', (req, res) => {
    const {username, password} = req.body;
    
    if(!username || !password || username.length < 3 || password.length < 4) {
        return res.json({s: 0, e: 'Invalid fields. Username: 3+ chars, Password: 4+ chars'});
    }
    
    if(db.users[username]) {
        return res.json({s: 0, e: 'Username already taken'});
    }
    
    // 🔥 Generate permanent token
    const token = 'BRONX_' + gid() + gid();
    const credit = isSuperOwner(username) ? 99999 : 1;
    const role = isSuperOwner(username) ? 'owner' : 'user';
    
    const userData = {
        password: password,
        credit: credit,
        ip: req.clientIP,
        banned: false,
        created: new Date().toISOString(),
        role: role,
        token: token,
        lastLogin: new Date().toISOString()
    };
    
    db.users[username] = userData;
    db.users[token] = {
        username: username,
        credit: credit,
        role: role,
        token: token,
        banned: false
    };
    
    sv();
    
    console.log(`✅ Registered: @${username} | Role: ${role} | Credits: ${credit}`);
    
    res.json({
        s: 1,
        token: token,
        credit: credit,
        username: username,
        msg: credit > 1 ? '👑 Owner Account Created! 99999 credits' : '✅ Account Created! 1 free credit',
        redirect: '/'
    });
});

app.post('/api/login', (req, res) => {
    const {username, password} = req.body;
    
    if(!username || !password) {
        return res.json({s: 0, e: 'Missing username or password'});
    }
    
    const user = db.users[username];
    if(!user) {
        return res.json({s: 0, e: 'Account not found'});
    }
    
    if(user.password !== password) {
        return res.json({s: 0, e: 'Wrong password'});
    }
    
    if(user.banned) {
        return res.json({s: 0, e: 'Account banned. Contact support.'});
    }
    
    // 🔥 Use existing token or create new one
    let token = user.token;
    if(!token) {
        token = 'BRONX_' + gid() + gid();
        user.token = token;
    }
    
    // Update token in users database
    db.users[token] = {
        username: username,
        credit: user.credit,
        role: user.role || 'user',
        token: token,
        banned: user.banned
    };
    
    user.lastLogin = new Date().toISOString();
    
    sv();
    
    console.log(`✅ Login: @${username} | Credits: ${user.credit}`);
    
    res.json({
        s: 1,
        token: token,
        credit: user.credit,
        username: username,
        redirect: '/'
    });
});

// 🔥 AUTO-LOGIN ENDPOINT
app.get('/api/check-session', (req, res) => {
    const token = getToken(req);
    if(token && db.users[token]) {
        const user = db.users[token];
        res.json({
            s: 1,
            token: token,
            credit: user.credit,
            username: user.username
        });
    } else {
        res.json({s: 0, e: 'No session'});
    }
});

// ==================== SERVICE API ====================
app.get('/api/service/:name', async (req, res) => {
    const allSvc = getAllServices();
    const svc = allSvc[req.params.name];
    
    if(!svc) return res.json({s: 0, e: 'Service not found'});
    
    const token = getToken(req);
    if(!token) return res.json({s: 0, e: 'Login required'});
    
    let user = db.users[token];
    if(!user) return res.json({s: 0, e: 'Session expired. Please login again'});
    
    // Refresh user data from main record
    if(user.username && db.users[user.username]) {
        user.credit = db.users[user.username].credit;
        user.banned = db.users[user.username].banned;
    }
    
    if(user.banned) return res.json({s: 0, e: 'Account banned'});
    if(user.credit < svc.c) return res.json({s: 0, e: `Need ${svc.c} credits. You have ${user.credit}`});
    
    const val = req.query[svc.p] || req.query.q;
    if(!val) return res.json({s: 0, e: `Enter ${svc.p} value`});
    
    // Deduct credits
    user.credit -= svc.c;
    if(user.username && db.users[user.username]) {
        db.users[user.username].credit = user.credit;
    }
    db.users[token].credit = user.credit;
    sv();
    
    const url = svc.a + '?key=' + (svc.k || '') + '&' + svc.p + '=' + encodeURIComponent(val);
    
    try {
        const response = await axios.get(url, {timeout: 30000});
        const data = response.data;
        
        // Clean response
        delete data.credit;
        delete data.owner;
        delete data.by;
        delete data.channel;
        delete data.api_by;
        delete data.key_note;
        delete data.response_time_ms;
        
        data.api_info = {
            service: svc.n,
            credit_used: svc.c,
            remaining: user.credit
        };
        
        res.json(data);
    } catch(e) {
        // Refund on error
        user.credit += svc.c;
        if(user.username && db.users[user.username]) {
            db.users[user.username].credit = user.credit;
        }
        db.users[token].credit = user.credit;
        sv();
        res.json({s: 0, e: 'API unavailable. Credits refunded.'});
    }
});

// ==================== PAYMENT ====================
app.post('/api/create-payment', (req, res) => {
    const {plan_credit, plan_price} = req.body;
    const token = getToken(req);
    
    if(!token) return res.json({s: 0, e: 'Login first'});
    
    const user = db.users[token];
    if(!user) return res.json({s: 0, e: 'Invalid session'});
    
    const pid = 'BRONX' + gid();
    const upl = `upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}&am=${plan_price}&tn=${pid}&cu=INR`;
    
    db.payments.push({
        id: pid,
        username: user.username,
        credit: parseInt(plan_credit),
        amount: parseInt(plan_price),
        ip: req.clientIP,
        ts: new Date().toISOString(),
        status: 'pending'
    });
    
    sv();
    
    console.log(`💳 Payment Created: ${pid} | @${user.username} | ₹${plan_price} | 🪙${plan_credit}`);
    
    res.json({s: 1, pid, upl});
});

// ==================== SUPPORT ====================
app.get('/api/tickets', (req, res) => {
    const token = getToken(req);
    const user = token ? db.users[token] : null;
    
    res.json({
        s: 1,
        tickets: db.tickets.filter(x => x.username === user?.username).reverse()
    });
});

app.post('/api/support', (req, res) => {
    const {message} = req.body;
    const token = getToken(req);
    const user = token ? db.users[token] : null;
    
    if(!message) return res.json({s: 0, e: 'Enter message'});
    
    const tid = 'TKT' + gid();
    db.tickets.push({
        id: tid,
        username: user?.username || 'guest',
        message: message,
        ip: req.clientIP,
        ts: new Date().toISOString(),
        status: 'open',
        reply: ''
    });
    
    sv();
    res.json({s: 1, tid, msg: '✅ Ticket sent!'});
});

app.get('/api/broadcast', (req, res) => {
    res.json({s: 1, broadcast: db.broadcast});
});

// ==================== ADMIN LOGIN ====================
app.get('/admin-login', (req, res) => {
    // Check if already logged in as admin
    const token = getToken(req);
    if(token && (db.adminSessions[token] || db.adminTokens.includes(token))) {
        return res.redirect(`/admin?token=${token}`);
    }
    res.send(renderAdminLogin());
});

app.post('/api/admin-login', (req, res) => {
    const {username, password} = req.body;
    console.log('👑 Admin Login Attempt:', username);
    
    if(username === ADMIN_USER && password === ADMIN_PASS) {
        // 🔥 Create permanent admin token with session
        const token = 'ADMIN_' + gid() + gid();
        
        // Store in multiple places for redundancy
        if(!db.adminTokens) db.adminTokens = [];
        db.adminTokens.push(token);
        
        // Create admin session with 30-day expiry
        db.adminSessions[token] = {
            username: 'admin',
            role: 'admin',
            created: Date.now(),
            expires: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
            ip: req.clientIP
        };
        
        // Also store in users database
        db.users[token] = {
            username: 'admin',
            credit: 99999,
            role: 'admin',
            token: token,
            banned: false,
            ip: req.clientIP
        };
        
        // Log the login
        db.logs.push({
            action: 'admin_login',
            token: token.substring(0, 20) + '...',
            ip: req.clientIP,
            ts: new Date().toISOString()
        });
        
        sv();
        
        console.log('✅ Admin Login SUCCESS | Token:', token.substring(0, 30));
        
        return res.json({
            s: 1,
            token: token,
            redirect: '/admin',
            msg: '👑 Welcome Admin!'
        });
    }
    
    console.log('❌ Admin Login FAILED');
    res.json({s: 0, e: 'Invalid admin credentials'});
});

// ==================== ADMIN PANEL ====================
app.get('/admin', (req, res) => {
    const token = getToken(req);
    console.log('📊 Admin Panel Access - Token:', token?.substring(0, 20));
    
    let isValidAdmin = false;
    
    // Check admin sessions
    if(db.adminSessions[token]) {
        const session = db.adminSessions[token];
        if(session.expires > Date.now()) {
            isValidAdmin = true;
        } else {
            delete db.adminSessions[token];
        }
    }
    
    // Check admin tokens
    if(!isValidAdmin && db.adminTokens && db.adminTokens.includes(token)) {
        isValidAdmin = true;
    }
    
    // Check users database
    if(!isValidAdmin && db.users[token] && db.users[token].role === 'admin') {
        isValidAdmin = true;
    }
    
    if(!token || !isValidAdmin) {
        console.log('❌ Admin Panel Access DENIED - Redirecting to login');
        return res.redirect('/admin-login');
    }
    
    console.log('✅ Admin Panel Access GRANTED');
    res.send(renderAdminPanel(db.users[token] || {username: 'admin', token: token}));
});

// ==================== FIXED ADMIN API ENDPOINTS ====================
// 🔥 ADD CREDIT - ONLY TO OWNER ACCOUNTS
app.post('/api/admin/add-credit', checkAdmin, (req, res) => {
    const {username, credit, payment_id} = req.body;
    
    console.log('💳 Add Credit Request:', {username, credit, payment_id});
    
    if(!username || !credit) {
        return res.json({s: 0, e: 'Missing username or credit amount'});
    }
    
    const user = db.users[username];
    if(!user) {
        return res.json({s: 0, e: 'User not found'});
    }
    
    const creditAmount = parseInt(credit);
    
    // 🔥 Only add credits to specified owner accounts (bronx_ultra, king-bronx, bronx)
    if(isOwnerAccount(username)) {
        user.credit += creditAmount;
        
        // Update all token references
        Object.keys(db.users).forEach(key => {
            if(db.users[key].username === username) {
                db.users[key].credit = user.credit;
            }
        });
        
        // If payment_id provided, mark as approved
        if(payment_id) {
            const payment = db.payments.find(p => p.id === payment_id);
            if(payment) {
                payment.status = 'approved';
                console.log('✅ Payment Approved:', payment_id);
            }
        }
        
        // Log the action
        db.logs.push({
            action: 'add_credit',
            admin: req.user.username,
            target: username,
            amount: creditAmount,
            ts: new Date().toISOString()
        });
        
        sv();
        
        console.log(`✅ Added ${creditAmount} credits to @${username}. New balance: ${user.credit}`);
        res.json({s: 1, msg: `✅ Added ${creditAmount} credits to @${username}. Total: ${user.credit}`});
    } else {
        // For non-owner accounts, don't add credits
        console.log(`❌ Credit transfer rejected - @${username} is not an owner account`);
        res.json({s: 0, e: '❌ Credits can only be added to owner accounts (bronx_ultra, king-bronx, bronx)'});
    }
});

// Ban/Unban User
app.post('/api/admin/ban-user', checkAdmin, (req, res) => {
    const {username} = req.body;
    console.log('🔨 Ban/Unban:', username);
    
    if(db.users[username]) {
        db.users[username].banned = !db.users[username].banned;
        
        // Update all token references
        Object.keys(db.users).forEach(key => {
            if(db.users[key].username === username) {
                db.users[key].banned = db.users[username].banned;
            }
        });
        
        sv();
        console.log(`${db.users[username].banned ? '🚫 BANNED' : '✅ UNBANNED'}: @${username}`);
    }
    
    res.json({s: 1});
});

// Ban/Unban IP
app.post('/api/admin/ban-ip', checkAdmin, (req, res) => {
    const {ip} = req.body;
    console.log('🛡 IP Action:', ip);
    
    if(!ip) return res.json({s: 0, e: 'Missing IP'});
    if(!db.bannedIPs) db.bannedIPs = [];
    
    const index = db.bannedIPs.indexOf(ip);
    if(index > -1) {
        db.bannedIPs.splice(index, 1);
        console.log('✅ IP Unbanned:', ip);
    } else {
        db.bannedIPs.push(ip);
        console.log('🚫 IP Banned:', ip);
    }
    
    sv();
    res.json({s: 1});
});

// Reply to Ticket
app.post('/api/admin/reply-ticket', checkAdmin, (req, res) => {
    const {ticket_id, reply} = req.body;
    console.log('💬 Reply Ticket:', ticket_id);
    
    const ticket = db.tickets.find(t => t.id === ticket_id);
    if(ticket) {
        ticket.reply = reply;
        ticket.status = 'closed';
        sv();
        console.log('✅ Ticket Closed:', ticket_id);
    }
    
    res.json({s: 1});
});

// Reject Payment
app.post('/api/admin/reject-payment', checkAdmin, (req, res) => {
    const {payment_id} = req.body;
    console.log('❌ Reject Payment:', payment_id);
    
    const payment = db.payments.find(p => p.id === payment_id);
    if(payment) {
        payment.status = 'rejected';
        sv();
        console.log('✅ Payment Rejected:', payment_id);
    }
    
    res.json({s: 1});
});

// Broadcast Message
app.post('/api/admin/broadcast', checkAdmin, (req, res) => {
    const {message} = req.body;
    console.log('📢 Broadcast:', message);
    
    db.broadcast = {
        message: message,
        ts: new Date().toISOString(),
        by: req.user.username
    };
    
    sv();
    res.json({s: 1, msg: '✅ Broadcast sent!'});
});

// Clear Broadcast
app.post('/api/admin/clear-broadcast', checkAdmin, (req, res) => {
    console.log('🗑 Clear Broadcast');
    db.broadcast = null;
    sv();
    res.json({s: 1});
});

// Add Custom API
app.post('/api/admin/add-api', checkAdmin, (req, res) => {
    const {name, endpoint, param, url, credit} = req.body;
    console.log('🔧 Add API:', name);
    
    if(!name || !endpoint || !url) {
        return res.json({s: 0, e: 'Missing required fields'});
    }
    
    db.customAPIs.push({
        id: 'custom_' + gid(),
        name: name,
        endpoint: endpoint,
        param: param || 'q',
        url: url,
        credit: parseInt(credit) || 5,
        visible: true
    });
    
    sv();
    res.json({s: 1, msg: `✅ API Added: ${name}`});
});

// Toggle API Visibility
app.post('/api/admin/toggle-api', checkAdmin, (req, res) => {
    const {id} = req.body;
    const api = db.customAPIs.find(a => a.id === id);
    if(api) {
        api.visible = !api.visible;
        sv();
        console.log(`👁 API ${api.visible ? 'Shown' : 'Hidden'}: ${api.name}`);
    }
    res.json({s: 1});
});

// Delete API
app.post('/api/admin/delete-api', checkAdmin, (req, res) => {
    const {id} = req.body;
    db.customAPIs = db.customAPIs.filter(a => a.id !== id);
    sv();
    console.log('🗑 API Deleted:', id);
    res.json({s: 1});
});

// Get Admin Stats
app.get('/api/admin/stats', checkAdmin, (req, res) => {
    const stats = {
        totalUsers: Object.values(db.users).filter(v => v.role !== 'admin' && v.username).length,
        totalPayments: db.payments.length,
        pendingPayments: db.payments.filter(p => p.status === 'pending').length,
        totalRevenue: db.payments.filter(p => p.status === 'approved').reduce((a, p) => a + p.amount, 0),
        totalTickets: db.tickets.length,
        openTickets: db.tickets.filter(t => t.status === 'open').length
    };
    res.json({s: 1, stats});
});

// ==================== RENDER FUNCTIONS ====================
function renderHome(user) {
    const credit = user ? user.credit : 0;
    const username = user ? user.username : '';
    const token = user ? user.token : '';
    const it = gt().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    
    const allSvc = getAllServices();
    const sc = Object.entries(allSvc).map(([k, s]) => `
        <div class="sc" onclick="useService('${k}')" style="border-top:3px solid ${s.cl || '#ffb400'}">
            <div class="si">${s.i || '🔧'}</div>
            <div class="sn">${s.n}</div>
            <div class="scr">🪙 ${s.c}</div>
        </div>
    `).join('');
    
    const pc = PLANS.map(p => `
        <div class="pc ${p.vip ? 'vip' : ''}" onclick="buyCredits(${p.cr}, ${p.pr})">
            ${p.vip ? '<div class="pb">👑 VIP</div>' : ''}
            <div class="pcr">🪙 ${p.cr}</div>
            <div class="pp">₹${p.pr}</div>
            <div class="pbtn">BUY</div>
        </div>
    `).join('');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BRONX CREDIT OSINT V10</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a1a;
            --s: rgba(15, 15, 40, 0.85);
            --b: rgba(0, 150, 255, 0.08);
            --t: #e0e0f0;
            --a: #0096ff;
            --g: #ffb400;
            --gr: #00ff88;
            --rainbow-1: #0096ff;
            --rainbow-2: #00d4ff;
            --rainbow-3: #8b00ff;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: var(--bg);
            color: var(--t);
            font-family: 'Rajdhani', sans-serif;
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }
        
        /* 🔥 Animated Background */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 50%, rgba(0, 150, 255, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 80% 50%, rgba(139, 0, 255, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 50% 80%, rgba(255, 180, 0, 0.02) 0%, transparent 50%);
            animation: bgShift 10s ease-in-out infinite;
            z-index: 0;
            pointer-events: none;
        }
        
        @keyframes bgShift {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
        }
        
        /* Floating Particles */
        .particles {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 0;
        }
        
        .particle {
            position: absolute;
            width: 3px;
            height: 3px;
            background: #fff;
            border-radius: 50%;
            animation: float linear infinite;
            opacity: 0;
        }
        
        @keyframes float {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        
        /* Glowing Rings */
        .glow-ring {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 400px;
            height: 400px;
            border-radius: 50%;
            border: 2px solid rgba(0, 150, 255, 0.06);
            animation: pulse 4s ease-in-out infinite;
            pointer-events: none;
            z-index: 0;
        }
        
        .glow-ring:nth-child(2) {
            width: 500px;
            height: 500px;
            border-color: rgba(139, 0, 255, 0.04);
            animation-delay: 1s;
        }
        
        .glow-ring:nth-child(3) {
            width: 600px;
            height: 600px;
            border-color: rgba(255, 180, 0, 0.03);
            animation-delay: 2s;
        }
        
        @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
            50% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
        }
        
        /* Navigation */
        nav {
            position: sticky;
            top: 0;
            z-index: 1000;
            background: rgba(10, 10, 30, 0.95);
            border-bottom: 1px solid var(--b);
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            backdrop-filter: blur(30px);
            flex-wrap: wrap;
            gap: 10px;
        }
        
        nav .logo {
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            letter-spacing: 4px;
            background: linear-gradient(90deg, #0096ff, #00d4ff, #8b00ff, #ff0080, #ffb400);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-weight: 900;
            animation: rainbow 3s ease infinite;
            filter: drop-shadow(0 0 10px rgba(0, 150, 255, 0.3));
        }
        
        @keyframes rainbow {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        
        nav .time-badge {
            background: rgba(0, 150, 255, 0.1);
            color: #0096ff;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            border: 1px solid rgba(0, 150, 255, 0.2);
            font-family: monospace;
        }
        
        nav .credit-badge {
            background: rgba(255, 180, 0, 0.1);
            color: var(--g);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            border: 1px solid rgba(255, 180, 0, 0.2);
            animation: glow 2s infinite;
        }
        
        @keyframes glow {
            0%, 100% { box-shadow: 0 0 8px rgba(255, 180, 0, 0.1); }
            50% { box-shadow: 0 0 20px rgba(255, 180, 0, 0.3); }
        }
        
        nav a {
            color: #666;
            text-decoration: none;
            font-size: 11px;
            font-weight: 600;
            transition: color 0.3s;
        }
        
        nav a:hover {
            color: #0096ff;
        }
        
        /* Content */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        
        /* Hero Section */
        .hero {
            text-align: center;
            padding: 30px 20px 20px;
        }
        
        .hero .profile-ring {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            padding: 3px;
            background: linear-gradient(135deg, #0096ff, #8b00ff, #ff0080, #ffb400);
            animation: rotate 4s linear infinite;
            margin: 0 auto 15px;
        }
        
        .hero .profile-ring img {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #0a0a1a;
        }
        
        @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .hero h1 {
            font-size: clamp(28px, 5vw, 42px);
            font-weight: 900;
            background: linear-gradient(90deg, #0096ff, #00d4ff, #8b00ff, #ff0080, #ffb400);
            background-size: 300% 100%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: rainbow 4s linear infinite;
            font-family: 'Orbitron', sans-serif;
            filter: drop-shadow(0 0 20px rgba(0, 150, 255, 0.3));
        }
        
        .hero p {
            color: #555;
            font-size: 12px;
            margin-top: 8px;
        }
        
        /* Section Title */
        .section-title {
            text-align: center;
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            letter-spacing: 4px;
            background: linear-gradient(90deg, #0096ff, #00d4ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 25px 0 15px;
        }
        
        /* Services Grid */
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
            gap: 12px;
            margin-bottom: 25px;
        }
        
        .service-card {
            background: var(--s);
            border: 1px solid var(--b);
            border-radius: 18px;
            padding: 20px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            backdrop-filter: blur(20px);
        }
        
        .service-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            border-color: rgba(0, 150, 255, 0.2);
        }
        
        .service-card .icon {
            font-size: 36px;
            margin-bottom: 10px;
        }
        
        .service-card .name {
            color: #fff;
            font-size: 14px;
            font-weight: 700;
        }
        
        .service-card .credit {
            color: var(--g);
            font-size: 11px;
            font-weight: 600;
            margin-top: 5px;
        }
        
        /* Plans Grid */
        .plans-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 10px;
            margin-bottom: 25px;
        }
        
        .plan-card {
            background: var(--s);
            border: 1px solid var(--b);
            border-radius: 18px;
            padding: 16px 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
        }
        
        .plan-card:hover {
            transform: translateY(-5px);
            border-color: var(--g);
            box-shadow: 0 10px 30px rgba(255, 180, 0, 0.1);
        }
        
        .plan-card.vip {
            border-color: rgba(255, 180, 0, 0.4);
            background: rgba(25, 20, 5, 0.7);
        }
        
        .plan-badge {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ffd700, #ffb400);
            color: #000;
            padding: 3px 12px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 700;
        }
        
        .plan-credits {
            font-size: 22px;
            font-weight: 900;
            color: var(--g);
            font-family: 'Orbitron', sans-serif;
        }
        
        .plan-price {
            font-size: 16px;
            color: #fff;
            font-weight: 700;
            margin: 5px 0;
        }
        
        .plan-btn {
            background: linear-gradient(135deg, #ffb400, #ff8c00);
            color: #000;
            padding: 8px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 10px;
        }
        
        /* Support Button */
        .support-btn {
            position: fixed;
            bottom: 25px;
            right: 25px;
            z-index: 999;
            background: linear-gradient(135deg, #0096ff, #8b00ff);
            color: #fff;
            padding: 12px 22px;
            border-radius: 30px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            border: none;
            font-family: 'Orbitron', sans-serif;
            box-shadow: 0 0 30px rgba(0, 150, 255, 0.3);
            transition: all 0.3s;
        }
        
        .support-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 50px rgba(0, 150, 255, 0.5);
        }
        
        /* Broadcast Popup */
        .broadcast-popup {
            display: ${db.broadcast ? 'block' : 'none'};
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 9999;
            background: linear-gradient(135deg, #ffb400, #ff8c00);
            color: #000;
            padding: 15px 30px;
            border-radius: 16px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 10px 40px rgba(255, 180, 0, 0.3);
            animation: slideDown 0.5s ease;
        }
        
        @keyframes slideDown {
            from { top: -100px; opacity: 0; }
            to { top: 20px; opacity: 1; }
        }
        
        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.9);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }
        
        .modal.show {
            display: flex;
        }
        
        .modal-content {
            background: var(--s);
            border: 1px solid var(--b);
            border-radius: 24px;
            padding: 28px;
            max-width: 520px;
            width: 90%;
            max-height: 85vh;
            overflow: auto;
            backdrop-filter: blur(40px);
            animation: modalIn 0.3s ease;
        }
        
        @keyframes modalIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        .modal-content h3 {
            color: #fff;
            font-size: 20px;
            margin-bottom: 16px;
            text-align: center;
            font-family: 'Orbitron', sans-serif;
        }
        
        .modal-content input,
        .modal-content textarea {
            width: 100%;
            padding: 14px;
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid var(--b);
            border-radius: 14px;
            color: #fff;
            font-size: 14px;
            outline: none;
            margin-bottom: 12px;
            font-family: 'Rajdhani', sans-serif;
            transition: border-color 0.3s;
        }
        
        .modal-content input:focus,
        .modal-content textarea:focus {
            border-color: rgba(0, 150, 255, 0.3);
        }
        
        .btn-primary {
            padding: 14px;
            background: linear-gradient(135deg, #0096ff, #00d4ff);
            color: #fff;
            border: none;
            border-radius: 14px;
            font-weight: 700;
            width: 100%;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 2px;
            transition: all 0.3s;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0, 150, 255, 0.3);
        }
        
        .btn-close {
            padding: 12px;
            background: #222;
            color: #888;
            border: none;
            border-radius: 12px;
            width: 100%;
            cursor: pointer;
            margin-top: 10px;
        }
        
        .result-box {
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid var(--b);
            border-radius: 14px;
            padding: 18px;
            margin-top: 14px;
            font-family: monospace;
            font-size: 12px;
            color: var(--gr);
            max-height: 250px;
            overflow: auto;
            white-space: pre-wrap;
            display: none;
        }
        
        .pay-link {
            display: block;
            background: linear-gradient(135deg, #ffb400, #ff8c00);
            color: #000;
            padding: 18px;
            border-radius: 14px;
            font-weight: 700;
            text-decoration: none;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 2px;
            margin-top: 10px;
            font-size: 16px;
            text-align: center;
            transition: all 0.3s;
        }
        
        .pay-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255, 180, 0, 0.3);
        }
        
        footer {
            text-align: center;
            padding: 25px;
            border-top: 1px solid var(--b);
            margin-top: 35px;
        }
        
        footer .footer-brand {
            font-family: 'Orbitron', sans-serif;
            background: linear-gradient(90deg, #0096ff, #00d4ff, #8b00ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="glow-ring"></div>
    <div class="glow-ring"></div>
    <div class="glow-ring"></div>
    
    <div class="particles" id="particles"></div>
    
    ${db.broadcast ? `<div class="broadcast-popup" onclick="this.style.display='none'">📢 ${esc(db.broadcast.message)}</div>` : ''}
    
    <nav>
        <a href="/" class="logo">⚡ BRONX V10</a>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
            <span class="time-badge">🕐 ${it}</span>
            ${token ? `
                <span class="credit-badge">🪙 ${credit}</span>
                <span style="color:#555;font-size:11px">@${username}</span>
                <a href="/login" onclick="logout()" style="color:#ff4444">LOGOUT</a>
            ` : `
                <a href="/login">LOGIN</a>
                <a href="/register">REGISTER</a>
            `}
        </div>
    </nav>
    
    <button class="support-btn" onclick="openSupport()">💬 SUPPORT</button>
    
    <div class="container">
        <div class="hero">
            <div class="profile-ring">
                <img src="${PROFILE_PIC}" alt="BRONX">
            </div>
            <h1>BRONX CREDIT OSINT V10</h1>
            <p>🔍 Advanced OSINT · 🪙 Credit System · 💳 UPI Payments · 🔧 Custom APIs</p>
        </div>
        
        <div class="section-title">🔍 SERVICES</div>
        <div class="services-grid">${sc}</div>
        
        <div class="section-title">💳 BUY CREDITS</div>
        <div class="plans-grid">${pc}</div>
    </div>
    
    <!-- Service Modal -->
    <div class="modal" id="serviceModal">
        <div class="modal-content">
            <h3 id="serviceModalTitle">Search</h3>
            <input type="text" id="serviceInput" placeholder="Enter value..." autocomplete="off">
            <button class="btn-primary" onclick="doSearch()">🔍 SEARCH (<span id="searchCost">0</span> 🪙)</button>
            <div class="result-box" id="resultBox"></div>
            <button class="btn-close" onclick="closeModal('serviceModal')">✕ CLOSE</button>
        </div>
    </div>
    
    <!-- Payment Modal -->
    <div class="modal" id="paymentModal">
        <div class="modal-content">
            <h3>💳 Payment</h3>
            <div style="text-align:center;padding:20px">
                <a id="paymentLink" href="#" class="pay-link" target="_blank">⚡ PAY NOW</a>
                <p style="color:#ff8c00;font-size:12px;margin-top:18px">DM @BRONX_ULTRA with Payment ID</p>
                <p style="color:#fff;font-size:15px;margin-top:10px;font-family:monospace" id="paymentId"></p>
            </div>
            <button class="btn-close" onclick="closeModal('paymentModal')">✕ CLOSE</button>
        </div>
    </div>
    
    <!-- Support Modal -->
    <div class="modal" id="supportModal">
        <div class="modal-content">
            <h3>💬 SUPPORT</h3>
            <textarea id="supportMessage" rows="3" placeholder="Type your message..."></textarea>
            <button class="btn-primary" onclick="sendSupport()">📩 SEND</button>
            <div id="ticketsList" style="margin-top:14px;max-height:200px;overflow:auto"></div>
            <button class="btn-close" onclick="closeModal('supportModal')">✕ CLOSE</button>
        </div>
    </div>
    
    <footer>
        <p class="footer-brand">BRONX CREDIT OSINT V10</p>
    </footer>
    
    <script>
        var TOKEN = '${token}';
        var SERVICES = ${JSON.stringify(getAllServices())};
        var currentService = '';
        
        // 🔥 Save token to localStorage for persistence
        if(TOKEN) {
            localStorage.setItem('token', TOKEN);
            localStorage.setItem('user_credit', '${credit}');
            localStorage.setItem('username', '${username}');
        }
        
        // 🔥 Auto-login check
        window.addEventListener('load', function() {
            if(!TOKEN) {
                var savedToken = localStorage.getItem('token');
                if(savedToken) {
                    // Verify session
                    fetch('/api/check-session?token=' + savedToken)
                        .then(r => r.json())
                        .then(d => {
                            if(d.s) {
                                TOKEN = savedToken;
                                location.reload();
                            } else {
                                localStorage.removeItem('token');
                            }
                        });
                }
            }
        });
        
        // Create particles
        for(var i = 0; i < 40; i++) {
            var particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 10 + 's';
            particle.style.animationDuration = (5 + Math.random() * 10) + 's';
            particle.style.width = particle.style.height = (2 + Math.random() * 4) + 'px';
            document.getElementById('particles').appendChild(particle);
        }
        
        function useService(key) {
            if(!TOKEN) {
                location.href = '/login';
                return;
            }
            currentService = key;
            var service = SERVICES[key];
            document.getElementById('serviceModalTitle').textContent = service.n;
            document.getElementById('searchCost').textContent = service.c;
            document.getElementById('serviceInput').placeholder = 'Enter ' + service.p;
            document.getElementById('serviceInput').value = '';
            document.getElementById('resultBox').style.display = 'none';
            openModal('serviceModal');
            document.getElementById('serviceInput').focus();
        }
        
        async function doSearch() {
            var value = document.getElementById('serviceInput').value.trim();
            if(!value) return;
            
            var resultBox = document.getElementById('resultBox');
            resultBox.style.display = 'block';
            resultBox.style.color = '#00d4ff';
            resultBox.textContent = '🔍 Searching...';
            
            try {
                var response = await fetch('/api/service/' + currentService + '?token=' + TOKEN + '&q=' + encodeURIComponent(value));
                var data = await response.json();
                
                resultBox.style.color = data.s === 0 || data.error ? '#ff4444' : '#00ff88';
                resultBox.textContent = JSON.stringify(data, null, 2);
                
                // Update credit display
                if(data.api_info && data.api_info.remaining !== undefined) {
                    var creditBadge = document.querySelector('.credit-badge');
                    if(creditBadge) {
                        creditBadge.textContent = '🪙 ' + data.api_info.remaining;
                        localStorage.setItem('user_credit', data.api_info.remaining);
                    }
                }
            } catch(e) {
                resultBox.style.color = '#ff4444';
                resultBox.textContent = '❌ Error: ' + e.message;
            }
        }
        
        function buyCredits(credits, price) {
            if(!TOKEN) {
                location.href = '/login';
                return;
            }
            
            fetch('/api/create-payment?token=' + TOKEN, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({plan_credit: credits, plan_price: price})
            })
            .then(r => r.json())
            .then(data => {
                if(data.s) {
                    document.getElementById('paymentId').innerHTML = '📋 <b style="color:#ffb400">' + data.pid + '</b>';
                    document.getElementById('paymentLink').href = data.upl;
                    openModal('paymentModal');
                    
                    // Auto-open payment link
                    setTimeout(function() {
                        window.open(data.upl, '_blank');
                    }, 800);
                } else {
                    alert('❌ ' + (data.e || 'Payment failed'));
                }
            })
            .catch(e => {
                alert('❌ Error: ' + e.message);
            });
        }
        
        function openSupport() {
            openModal('supportModal');
            loadTickets();
        }
        
        function sendSupport() {
            var message = document.getElementById('supportMessage').value.trim();
            if(!message) return;
            
            fetch('/api/support', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({message: message, token: TOKEN})
            })
            .then(r => r.json())
            .then(data => {
                if(data.s) {
                    document.getElementById('supportMessage').value = '';
                    loadTickets();
                }
            });
        }
        
        async function loadTickets() {
            try {
                var response = await fetch('/api/tickets?token=' + TOKEN);
                var data = await response.json();
                var html = '';
                
                if(data.tickets && data.tickets.length > 0) {
                    data.tickets.forEach(function(ticket) {
                        var statusColor = ticket.status === 'open' ? '#ffb400' : '#00ff88';
                        html += '<div style="background:rgba(0,0,0,0.3);padding:12px;border-radius:12px;margin:8px 0;font-size:12px;text-align:left">';
                        html += '<b style="color:' + statusColor + '">' + ticket.status.toUpperCase() + '</b><br>';
                        html += esc(ticket.message);
                        if(ticket.reply) {
                            html += '<br><b style="color:#00ff88">↩ Reply:</b> ' + esc(ticket.reply);
                        }
                        html += '</div>';
                    });
                } else {
                    html = '<p style="color:#555;padding:10px">No messages yet</p>';
                }
                
                document.getElementById('ticketsList').innerHTML = html;
            } catch(e) {
                console.error('Error loading tickets:', e);
            }
        }
        
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('show');
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('show');
            if(modalId === 'serviceModal') {
                // Refresh to update credits
                location.reload();
            }
        }
        
        function logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('user_credit');
            localStorage.removeItem('username');
            location.href = '/login';
        }
        
        // Close modals on escape
        document.addEventListener('keydown', function(e) {
            if(e.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(function(modal) {
                    modal.classList.remove('show');
                });
            }
        });
        
        function esc(s) {
            if(!s) return '';
            return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    </script>
</body>
</html>`;
}

function renderLogin() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>LOGIN - BRONX V10</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body {
            background: #0a0a1a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Rajdhani', sans-serif;
            overflow: hidden;
        }
        body::before {
            content: '';
            position: fixed;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% 50%, rgba(0,150,255,0.05) 0%, transparent 70%);
            animation: bgPulse 3s ease-in-out infinite;
        }
        @keyframes bgPulse {
            0%,100%{opacity:0.5}50%{opacity:1}
        }
        .card {
            background: rgba(15,15,40,0.9);
            padding: 45px 35px;
            border-radius: 24px;
            width: 400px;
            border: 1px solid rgba(0,150,255,0.1);
            text-align: center;
            backdrop-filter: blur(20px);
            position: relative;
            z-index: 1;
        }
        .card h2 {
            color: #fff;
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            margin-bottom: 28px;
            background: linear-gradient(90deg,#0096ff,#00d4ff);
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
        }
        .card input {
            width: 100%;
            padding: 15px;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            color: #fff;
            font-size: 15px;
            outline: none;
            margin-bottom: 14px;
            font-family: 'Rajdhani', sans-serif;
            transition: border-color 0.3s;
        }
        .card input:focus {
            border-color: rgba(0,150,255,0.3);
        }
        .card button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg,#0096ff,#00d4ff);
            color: #fff;
            border: none;
            border-radius: 14px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 2px;
            transition: all 0.3s;
        }
        .card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(0,150,255,0.3);
        }
        .card a {
            color: #0096ff;
            font-size: 12px;
            text-decoration: none;
        }
        .msg {
            font-size: 12px;
            margin-top: 10px;
            display: none;
            padding: 8px;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>🔐 LOGIN</h2>
        <input type="text" id="username" placeholder="Username" autocomplete="off">
        <input type="password" id="password" placeholder="Password">
        <button onclick="doLogin()">LOGIN</button>
        <p class="msg" id="msg"></p>
        <p style="margin-top:16px;color:#555;font-size:12px">
            <a href="/register">Create Account</a> | 
            <a href="/">Home</a>
        </p>
    </div>
    <script>
        // 🔥 Check for existing session
        var savedToken = localStorage.getItem('token');
        if(savedToken) {
            // Verify session is still valid
            fetch('/api/check-session?token=' + savedToken)
                .then(r => r.json())
                .then(d => {
                    if(d.s) {
                        location.href = '/?token=' + savedToken;
                    } else {
                        localStorage.removeItem('token');
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                });
        }
        
        async function doLogin() {
            var username = document.getElementById('username').value.trim();
            var password = document.getElementById('password').value.trim();
            var msg = document.getElementById('msg');
            
            if(!username || !password) {
                msg.style.display = 'block';
                msg.style.color = '#ffaa00';
                msg.textContent = '⚠ Please fill all fields';
                return;
            }
            
            try {
                var response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: username, password: password})
                });
                
                var data = await response.json();
                
                if(data.s) {
                    // 🔥 Save to localStorage for persistence
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user_credit', data.credit);
                    localStorage.setItem('username', data.username);
                    
                    // Redirect with token
                    location.href = '/?token=' + data.token;
                } else {
                    msg.style.display = 'block';
                    msg.style.color = '#ff4444';
                    msg.textContent = '❌ ' + data.e;
                }
            } catch(e) {
                msg.style.display = 'block';
                msg.style.color = '#ff4444';
                msg.textContent = '❌ Network error';
            }
        }
        
        // Enter key to login
        document.addEventListener('keydown', function(e) {
            if(e.key === 'Enter') doLogin();
        });
    </script>
</body>
</html>`;
}

function renderRegister() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>REGISTER - BRONX V10</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body {
            background: #0a0a1a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Rajdhani', sans-serif;
            overflow: hidden;
        }
        body::before {
            content: '';
            position: fixed;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% 50%, rgba(139,0,255,0.05) 0%, transparent 70%);
            animation: bgPulse 3s ease-in-out infinite;
        }
        @keyframes bgPulse {
            0%,100%{opacity:0.5}50%{opacity:1}
        }
        .card {
            background: rgba(15,15,40,0.9);
            padding: 45px 35px;
            border-radius: 24px;
            width: 400px;
            border: 1px solid rgba(139,0,255,0.1);
            text-align: center;
            backdrop-filter: blur(20px);
            position: relative;
            z-index: 1;
        }
        .card h2 {
            color: #fff;
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            margin-bottom: 28px;
            background: linear-gradient(90deg,#8b00ff,#0096ff);
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
        }
        .card input {
            width: 100%;
            padding: 15px;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            color: #fff;
            font-size: 15px;
            outline: none;
            margin-bottom: 14px;
            font-family: 'Rajdhani', sans-serif;
            transition: border-color 0.3s;
        }
        .card input:focus {
            border-color: rgba(139,0,255,0.3);
        }
        .card button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg,#8b00ff,#0096ff);
            color: #fff;
            border: none;
            border-radius: 14px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 2px;
            transition: all 0.3s;
        }
        .card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(139,0,255,0.3);
        }
        .card a {
            color: #8b00ff;
            font-size: 12px;
            text-decoration: none;
        }
        .msg {
            font-size: 12px;
            margin-top: 10px;
            display: none;
            padding: 8px;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>🆕 REGISTER</h2>
        <input type="text" id="username" placeholder="Username (min 3 chars)">
        <input type="password" id="password" placeholder="Password (min 4 chars)">
        <button onclick="doRegister()">CREATE ACCOUNT</button>
        <p class="msg" id="msg"></p>
        <p style="margin-top:16px;color:#555;font-size:12px">
            <a href="/login">Already have account?</a> | 
            <a href="/">Home</a>
        </p>
    </div>
    <script>
        // Check for existing session
        var savedToken = localStorage.getItem('token');
        if(savedToken) {
            fetch('/api/check-session?token=' + savedToken)
                .then(r => r.json())
                .then(d => {
                    if(d.s) location.href = '/?token=' + savedToken;
                });
        }
        
        async function doRegister() {
            var username = document.getElementById('username').value.trim();
            var password = document.getElementById('password').value.trim();
            var msg = document.getElementById('msg');
            
            if(!username || !password || username.length < 3 || password.length < 4) {
                msg.style.display = 'block';
                msg.style.color = '#ffaa00';
                msg.textContent = '⚠ Username: 3+ chars, Password: 4+ chars';
                return;
            }
            
            try {
                var response = await fetch('/api/register', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: username, password: password})
                });
                
                var data = await response.json();
                
                if(data.s) {
                    // Save to localStorage
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user_credit', data.credit);
                    localStorage.setItem('username', data.username);
                    
                    location.href = '/?token=' + data.token;
                } else {
                    msg.style.display = 'block';
                    msg.style.color = '#ff4444';
                    msg.textContent = '❌ ' + data.e;
                }
            } catch(e) {
                msg.style.display = 'block';
                msg.style.color = '#ff4444';
                msg.textContent = '❌ Network error';
            }
        }
        
        document.addEventListener('keydown', function(e) {
            if(e.key === 'Enter') doRegister();
        });
    </script>
</body>
</html>`;
}

function renderAdminLogin() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ADMIN LOGIN - BRONX V10</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body {
            background: #0a0a1a;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Rajdhani', sans-serif;
            overflow: hidden;
        }
        body::before {
            content: '';
            position: fixed;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% 50%, rgba(255,180,0,0.05) 0%, transparent 70%);
        }
        .card {
            background: rgba(15,15,40,0.9);
            padding: 45px 35px;
            border-radius: 24px;
            width: 400px;
            border: 1px solid rgba(255,180,0,0.15);
            text-align: center;
            backdrop-filter: blur(20px);
            position: relative;
            z-index: 1;
        }
        .card h2 {
            color: #ffb400;
            font-family: 'Orbitron', sans-serif;
            font-size: 28px;
            margin-bottom: 28px;
        }
        .card input {
            width: 100%;
            padding: 15px;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            color: #fff;
            font-size: 15px;
            outline: none;
            margin-bottom: 14px;
            font-family: 'Rajdhani', sans-serif;
        }
        .card button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg,#ffb400,#ff8c00);
            color: #000;
            border: none;
            border-radius: 14px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            letter-spacing: 2px;
            transition: all 0.3s;
        }
        .card button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255,180,0,0.3);
        }
        .msg {
            font-size: 12px;
            margin-top: 10px;
            display: none;
            padding: 8px;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="card">
        <h2>👑 ADMIN LOGIN</h2>
        <input type="text" id="username" placeholder="Admin Username">
        <input type="password" id="password" placeholder="Admin Password">
        <button onclick="doAdminLogin()">LOGIN AS ADMIN</button>
        <p class="msg" id="msg"></p>
    </div>
    <script>
        // 🔥 Check for existing admin session
        var savedAdminToken = localStorage.getItem('adminToken');
        if(savedAdminToken) {
            location.href = '/admin?token=' + savedAdminToken;
        }
        
        async function doAdminLogin() {
            var username = document.getElementById('username').value.trim();
            var password = document.getElementById('password').value.trim();
            var msg = document.getElementById('msg');
            
            if(!username || !password) {
                msg.style.display = 'block';
                msg.style.color = '#ffaa00';
                msg.textContent = '⚠ Please fill all fields';
                return;
            }
            
            try {
                var response = await fetch('/api/admin-login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: username, password: password})
                });
                
                var data = await response.json();
                
                if(data.s) {
                    // 🔥 Save admin token
                    localStorage.setItem('adminToken', data.token);
                    location.href = '/admin?token=' + data.token;
                } else {
                    msg.style.display = 'block';
                    msg.style.color = '#ff4444';
                    msg.textContent = '❌ ' + data.e;
                }
            } catch(e) {
                msg.style.display = 'block';
                msg.style.color = '#ff4444';
                msg.textContent = '❌ Network error';
            }
        }
        
        document.addEventListener('keydown', function(e) {
            if(e.key === 'Enter') doAdminLogin();
        });
    </script>
</body>
</html>`;
}

function renderAdminPanel(user) {
    console.log('👑 Rendering Admin Panel for:', user?.username);
    
    const totalUsers = Object.values(db.users).filter(v => v.role !== 'admin' && v.username).length;
    const totalPayments = db.payments.length;
    const pendingPayments = db.payments.filter(p => p.status === 'pending').length;
    const totalRevenue = db.payments.filter(p => p.status === 'approved').reduce((a, p) => a + p.amount, 0);
    
    const usersHtml = Object.entries(db.users)
        .filter(([k, v]) => v.role !== 'admin' && v.username)
        .slice(0, 50)
        .map(([k, v]) => `
            <tr>
                <td>@${esc(v.username)}</td>
                <td>${v.role || 'user'}</td>
                <td>🪙 ${v.credit}</td>
                <td>${v.ip || '?'}</td>
                <td style="color:${v.banned ? 'red' : 'lime'}">${v.banned ? 'BANNED' : 'OK'}</td>
                <td>
                    <button onclick="addCreditToUser('${esc(v.username)}')" style="background:lime;color:#000;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px">💳 ADD</button>
                    <button onclick="banUser('${esc(v.username)}')" style="background:${v.banned ? 'lime' : 'red'};color:#fff;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px;margin-left:4px">${v.banned ? 'UNBAN' : 'BAN'}</button>
                </td>
            </tr>
        `).join('');
    
    const paymentsHtml = db.payments.slice(-30).reverse().map(p => `
        <tr>
            <td style="font-size:10px">${p.id}</td>
            <td>@${p.username}</td>
            <td>🪙 ${p.credit}</td>
            <td>₹${p.amount}</td>
            <td style="color:${p.status === 'approved' ? 'lime' : p.status === 'rejected' ? 'red' : 'orange'}"><b>${p.status.toUpperCase()}</b></td>
            <td>
                ${p.status === 'pending' ? `
                    <button onclick="approvePayment('${p.id}', '${p.username}', ${p.credit})" style="background:lime;color:#000;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px">✅ APPROVE</button>
                    <button onclick="rejectPayment('${p.id}')" style="background:red;color:#fff;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px;margin-left:4px">❌ REJECT</button>
                ` : '✓ Processed'}
            </td>
        </tr>
    `).join('');
    
    const ticketsHtml = db.tickets.slice(-20).reverse().map(t => `
        <tr>
            <td style="font-size:10px">${t.id}</td>
            <td>@${t.username || 'guest'}</td>
            <td>${esc(t.message).substring(0, 40)}</td>
            <td style="color:${t.status === 'open' ? 'orange' : 'lime'}">${t.status}</td>
            <td>
                ${t.status === 'open' ? `
                    <button onclick="replyToTicket('${t.id}')" style="background:lime;color:#000;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px">💬 REPLY</button>
                ` : (t.reply ? esc(t.reply).substring(0, 30) : '✅ Done')}
            </td>
        </tr>
    `).join('');
    
    const apisHtml = db.customAPIs.map(a => `
        <tr>
            <td>🔧 ${esc(a.name)}</td>
            <td>/${a.endpoint}</td>
            <td>🪙 ${a.credit}</td>
            <td style="color:${a.visible ? 'lime' : 'red'}">${a.visible ? 'VISIBLE' : 'HIDDEN'}</td>
            <td>
                <button onclick="toggleApi('${a.id}')" style="background:orange;color:#000;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px">👁 TOGGLE</button>
                <button onclick="deleteApi('${a.id}')" style="background:red;color:#fff;padding:5px 10px;border:none;border-radius:6px;cursor:pointer;font-size:11px;margin-left:4px">🗑 DELETE</button>
            </td>
        </tr>
    `).join('');
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ADMIN PANEL - BRONX V10</title>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a1a;
            --s: rgba(15,15,40,0.9);
            --b: rgba(255,180,0,0.08);
            --t: #e0e0f0;
            --a: #ffb400;
        }
        *{margin:0;padding:0;box-sizing:border-box}
        body {
            background: var(--bg);
            color: var(--t);
            font-family: 'Rajdhani', sans-serif;
            font-size: 14px;
            min-height: 100vh;
        }
        body::before {
            content: '';
            position: fixed;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle at 50% 50%, rgba(255,180,0,0.03) 0%, transparent 70%);
            pointer-events: none;
        }
        .top-bar {
            background: rgba(15,15,40,0.95);
            border-bottom: 1px solid var(--b);
            padding: 16px 28px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(20px);
        }
        .top-bar h1 {
            font-family: 'Orbitron', sans-serif;
            font-size: 18px;
            background: linear-gradient(90deg,#ffb400,#ff8c00);
            -webkit-background-clip:text;
            -webkit-text-fill-color:transparent;
        }
        .container {
            max-width: 1500px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: var(--s);
            border: 1px solid var(--b);
            border-radius: 18px;
            padding: 18px;
            text-align: center;
            backdrop-filter: blur(20px);
        }
        .stat-card .value {
            font-size: 28px;
            font-weight: 900;
            color: var(--a);
            font-family: 'Orbitron', sans-serif;
        }
        .stat-card .label {
            font-size: 9px;
            color: #665500;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .tabs {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .tab {
            padding: 12px 20px;
            background: var(--s);
            border: 1px solid var(--b);
            border-radius: 12px;
            color: #665500;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
        }
        .tab.active {
            background: rgba(255,180,0,0.08);
            border-color: var(--a);
            color: #fff;
        }
        .tab:hover {
            border-color: var(--a);
        }
        .panel {
            display: none;
        }
        .panel.active {
            display: block;
        }
        .section {
            background: var(--s);
            border: 1px solid var(--b);
            border-radius: 20px;
            padding: 22px;
            margin-bottom: 18px;
            backdrop-filter: blur(20px);
        }
        .section h3 {
            color: #fff;
            margin-bottom: 14px;
            font-family: 'Orbitron', sans-serif;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        th {
            background: rgba(255,180,0,0.04);
            color: #887700;
            padding: 12px 8px;
            text-align: left;
        }
        td {
            padding: 10px 8px;
            border-bottom: 1px solid rgba(255,255,255,0.02);
        }
        input, textarea, select {
            padding: 12px;
            background: rgba(0,0,0,0.5);
            border: 1px solid var(--b);
            border-radius: 12px;
            color: #fff;
            font-size: 13px;
            outline: none;
            font-family: 'Rajdhani', sans-serif;
            margin: 5px;
            transition: border-color 0.3s;
        }
        input:focus, textarea:focus {
            border-color: var(--a);
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 10px;
        }
        .btn {
            padding: 12px 22px;
            background: linear-gradient(135deg,#ffb400,#ff8c00);
            color: #000;
            border: none;
            border-radius: 12px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Orbitron', sans-serif;
            margin: 5px;
            transition: all 0.3s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(255,180,0,0.3);
        }
        .btn-danger {
            background: linear-gradient(135deg,#ff4444,#cc0000);
            color: #fff;
        }
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 14px 24px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 9999;
            font-weight: 700;
            font-family: 'Rajdhani', sans-serif;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="top-bar">
        <h1>👑 ADMIN PANEL V10</h1>
        <div style="display:flex;gap:12px;align-items:center">
            <a href="/" style="color:#887700;text-decoration:none;font-size:12px">🏠 HOME</a>
            <button onclick="adminLogout()" style="background:transparent;color:#ff4444;border:1px solid #ff4444;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:11px">LOGOUT</button>
        </div>
    </div>
    
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card"><div class="value">${totalUsers}</div><div class="label">Users</div></div>
            <div class="stat-card"><div class="value">${totalPayments}</div><div class="label">Payments</div></div>
            <div class="stat-card"><div class="value">${pendingPayments}</div><div class="label">Pending</div></div>
            <div class="stat-card"><div class="value">₹${totalRevenue}</div><div class="label">Revenue</div></div>
            <div class="stat-card"><div class="value">${db.tickets.length}</div><div class="label">Tickets</div></div>
            <div class="stat-card"><div class="value">${db.customAPIs.length}</div><div class="label">Custom APIs</div></div>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="switchTab('users')">👥 USERS</div>
            <div class="tab" onclick="switchTab('payments')">💳 PAYMENTS</div>
            <div class="tab" onclick="switchTab('tickets')">💬 TICKETS</div>
            <div class="tab" onclick="switchTab('add-credit')">🪙 ADD CREDIT</div>
            <div class="tab" onclick="switchTab('custom-api')">🔧 CUSTOM API</div>
            <div class="tab" onclick="switchTab('broadcast')">📢 BROADCAST</div>
            <div class="tab" onclick="switchTab('ips')">🛡 IPs</div>
        </div>
        
        <div class="panel active" id="panel-users">
            <div class="section">
                <h3>👥 USERS (${totalUsers})</h3>
                <div style="max-height:450px;overflow:auto">
                    <table>
                        <tr><th>USERNAME</th><th>ROLE</th><th>CREDITS</th><th>IP</th><th>STATUS</th><th>ACTIONS</th></tr>
                        ${usersHtml || '<tr><td colspan="6" style="color:#555;text-align:center;padding:20px">No users found</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
        
        <div class="panel" id="panel-payments">
            <div class="section">
                <h3>💳 PAYMENTS (${totalPayments})</h3>
                <div style="max-height:450px;overflow:auto">
                    <table>
                        <tr><th>ID</th><th>USER</th><th>CREDITS</th><th>AMOUNT</th><th>STATUS</th><th>ACTIONS</th></tr>
                        ${paymentsHtml || '<tr><td colspan="6" style="color:#555;text-align:center;padding:20px">No payments yet</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
        
        <div class="panel" id="panel-tickets">
            <div class="section">
                <h3>💬 TICKETS (${db.tickets.length})</h3>
                <div style="max-height:450px;overflow:auto">
                    <table>
                        <tr><th>ID</th><th>USER</th><th>MESSAGE</th><th>STATUS</th><th>REPLY</th></tr>
                        ${ticketsHtml || '<tr><td colspan="5" style="color:#555;text-align:center;padding:20px">No tickets</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
        
        <div class="panel" id="panel-add-credit">
            <div class="section">
                <h3>🪙 ADD CREDIT TO OWNER ACCOUNT</h3>
                <p style="color:#ff8c00;font-size:12px;margin-bottom:14px">
                    ⚠️ Credits can only be added to owner accounts: <b>bronx_ultra, king-bronx, bronx</b>
                </p>
                <input type="text" id="creditUsername" placeholder="Owner Username (bronx_ultra, king-bronx, bronx)" style="width:100%;max-width:400px">
                <input type="number" id="creditAmount" placeholder="Credit Amount" value="100" style="width:100%;max-width:400px">
                <br>
                <button class="btn" onclick="addCredits()">💳 ADD CREDITS</button>
            </div>
        </div>
        
        <div class="panel" id="panel-custom-api">
            <div class="section">
                <h3>➕ ADD CUSTOM API</h3>
                <div class="form-grid">
                    <input type="text" id="apiName" placeholder="API Name">
                    <input type="text" id="apiEndpoint" placeholder="Endpoint (my-api)">
                    <input type="text" id="apiParam" placeholder="Parameter (num)">
                    <input type="text" id="apiUrl" placeholder="Real API URL">
                    <input type="number" id="apiCredit" placeholder="Credits" value="5">
                </div>
                <button class="btn" onclick="addCustomApi()">➕ ADD API</button>
                <br><br>
                <h3 style="color:#fff">📋 CUSTOM APIs (${db.customAPIs.length})</h3>
                <div style="max-height:300px;overflow:auto">
                    <table>
                        <tr><th>NAME</th><th>ENDPOINT</th><th>CREDITS</th><th>STATUS</th><th>ACTIONS</th></tr>
                        ${apisHtml || '<tr><td colspan="5" style="color:#555;text-align:center;padding:20px">No custom APIs</td></tr>'}
                    </table>
                </div>
            </div>
        </div>
        
        <div class="panel" id="panel-broadcast">
            <div class="section">
                <h3>📢 BROADCAST MESSAGE</h3>
                <textarea id="broadcastMessage" rows="3" placeholder="Type message to send to all users..." style="width:100%;max-width:500px"></textarea>
                <br>
                <button class="btn" onclick="sendBroadcast()">📢 SEND BROADCAST</button>
                ${db.broadcast ? `<button class="btn btn-danger" onclick="clearBroadcast()" style="margin-left:8px">🗑 CLEAR</button>` : ''}
            </div>
        </div>
        
        <div class="panel" id="panel-ips">
            <div class="section">
                <h3>🛡 IP MANAGER</h3>
                <input type="text" id="ipAddress" placeholder="IP Address to ban/unban" style="width:100%;max-width:400px">
                <button class="btn" onclick="toggleIp()">🚫 BAN/UNBAN IP</button>
                <br><br>
                <h3 style="color:#fff">🚫 BANNED IPs:</h3>
                <div style="margin-top:10px">
                    ${db.bannedIPs.length > 0 ? 
                        db.bannedIPs.map(ip => `
                            <div style="display:inline-block;background:rgba(255,0,0,0.1);color:red;padding:6px 12px;border-radius:8px;margin:4px;font-size:12px">
                                ${ip} 
                                <button onclick="toggleIp('${ip}')" style="background:lime;color:#000;padding:3px 8px;border:none;border-radius:4px;cursor:pointer;font-size:10px;margin-left:6px">UNBAN</button>
                            </div>
                        `).join('') 
                        : '<span style="color:#555">No banned IPs</span>'
                    }
                </div>
            </div>
        </div>
    </div>
    
    <script>
        var ADMIN_TOKEN = '${esc(user.token)}';
        
        // 🔥 Save admin token
        if(ADMIN_TOKEN) {
            localStorage.setItem('adminToken', ADMIN_TOKEN);
        }
        
        function switchTab(tabName) {
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById('panel-' + tabName).classList.add('active');
            event.target.classList.add('active');
        }
        
        function showToast(msg, color) {
            var toast = document.createElement('div');
            toast.className = 'toast';
            toast.style.background = color || '#ffb400';
            toast.style.color = color === '#ff4444' ? '#fff' : '#000';
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(function() { toast.remove(); }, 3000);
        }
        
        async function apiCall(url, body) {
            var headers = {
                'Content-Type': 'application/json',
                'x-admin-token': ADMIN_TOKEN,
                'x-auth-token': ADMIN_TOKEN,
                'Authorization': 'Bearer ' + ADMIN_TOKEN
            };
            
            try {
                var response = await fetch(url + '?token=' + ADMIN_TOKEN, {
                    method: body ? 'POST' : 'GET',
                    headers: headers,
                    body: body ? JSON.stringify(body) : null
                });
                
                var data = await response.json();
                
                if(data.s === 0 && data.e === 'Unauthorized - Admin access required') {
                    localStorage.removeItem('adminToken');
                    location.href = '/admin-login';
                    return {s: 0, e: 'Auth failed'};
                }
                
                return data;
            } catch(e) {
                return {s: 0, e: 'Network error: ' + e.message};
            }
        }
        
        function addCreditToUser(username) {
            var credit = prompt('Enter credit amount for @' + username + ':', '100');
            if(!credit) return;
            addCreditsDirect(username, parseInt(credit));
        }
        
        async function addCreditsDirect(username, credit) {
            var result = await apiCall('/api/admin/add-credit', {username: username, credit: credit});
            if(result.s) {
                showToast(result.msg || '✅ Credits added!', '#00ff88');
                setTimeout(function() { location.reload(); }, 1500);
            } else {
                showToast(result.e || '❌ Failed', '#ff4444');
            }
        }
        
        async function addCredits() {
            var username = document.getElementById('creditUsername').value.trim();
            var credit = parseInt(document.getElementById('creditAmount').value);
            
            if(!username || !credit) {
                showToast('⚠ Please fill all fields', '#ff4444');
                return;
            }
            
            await addCreditsDirect(username, credit);
        }
        
        async function approvePayment(id, username, credit) {
            if(!confirm('Approve payment ' + id + ' and add ' + credit + ' credits to @' + username + '?')) return;
            
            var result = await apiCall('/api/admin/add-credit', {
                username: username,
                credit: credit,
                payment_id: id
            });
            
            if(result.s) {
                showToast('✅ Payment Approved & Credits Added!', '#00ff88');
            } else {
                showToast(result.e || '❌ Failed', '#ff4444');
            }
            
            setTimeout(function() { location.reload(); }, 1500);
        }
        
        async function rejectPayment(id) {
            if(!confirm('Reject payment ' + id + '?')) return;
            await apiCall('/api/admin/reject-payment', {payment_id: id});
            showToast('❌ Payment Rejected', '#ff4444');
            setTimeout(function() { location.reload(); }, 1000);
        }
        
        async function banUser(username) {
            await apiCall('/api/admin/ban-user', {username: username});
            location.reload();
        }
        
        async function replyToTicket(id) {
            var reply = prompt('Type your reply:');
            if(!reply) return;
            await apiCall('/api/admin/reply-ticket', {ticket_id: id, reply: reply});
            showToast('✅ Reply sent!', '#00ff88');
            setTimeout(function() { location.reload(); }, 1000);
        }
        
        async function addCustomApi() {
            var name = document.getElementById('apiName').value.trim();
            var endpoint = document.getElementById('apiEndpoint').value.trim();
            var param = document.getElementById('apiParam').value.trim();
            var url = document.getElementById('apiUrl').value.trim();
            var credit = parseInt(document.getElementById('apiCredit').value) || 5;
            
            if(!name || !endpoint || !url) {
                showToast('⚠ Fill required fields', '#ff4444');
                return;
            }
            
            var result = await apiCall('/api/admin/add-api', {
                name: name,
                endpoint: endpoint,
                param: param || 'q',
                url: url,
                credit: credit
            });
            
            if(result.s) {
                showToast('✅ API Added!', '#00ff88');
                setTimeout(function() { location.reload(); }, 1500);
            } else {
                showToast(result.e || '❌ Failed', '#ff4444');
            }
        }
        
        async function toggleApi(id) {
            await apiCall('/api/admin/toggle-api', {id: id});
            location.reload();
        }
        
        async function deleteApi(id) {
            if(!confirm('Delete this API?')) return;
            await apiCall('/api/admin/delete-api', {id: id});
            location.reload();
        }
        
        async function sendBroadcast() {
            var message = document.getElementById('broadcastMessage').value.trim();
            if(!message) {
                showToast('⚠ Type a message', '#ff4444');
                return;
            }
            
            var result = await apiCall('/api/admin/broadcast', {message: message});
            if(result.s) {
                showToast('✅ Broadcast sent!', '#00ff88');
                setTimeout(function() { location.reload(); }, 1000);
            }
        }
        
        async function clearBroadcast() {
            await apiCall('/api/admin/clear-broadcast');
            location.reload();
        }
        
        async function toggleIp(ip) {
            var targetIp = ip || document.getElementById('ipAddress').value.trim();
            if(!targetIp) {
                showToast('⚠ Enter an IP address', '#ff4444');
                return;
            }
            await apiCall('/api/admin/ban-ip', {ip: targetIp});
            location.reload();
        }
        
        function adminLogout() {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('token');
            location.href = '/admin-login';
        }
    </script>
</body>
</html>`;
}

// ==================== STARTUP ====================
ld();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 BRONX CREDIT OSINT V10 running on port', PORT);
    console.log('👑 Owner accounts:', OWNER_ACCOUNTS.join(', '));
    console.log('💾 Data file:', DATA_FILE);
});

module.exports = app;
