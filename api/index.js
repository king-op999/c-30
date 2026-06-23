// ============================================
// 🩸 BRONX CREDIT OSINT V10 – COMPLETE REWRITE
// ALL FIXED – ADMIN LOGIN + AUTO CREDIT + THEME
// ============================================
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const app = express();

// ============ CONFIG ============
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'bronx2026';
const DATA_DIR = process.env.RENDER_DATA_DIR || '/tmp';
const DATA_FILE = path.join(DATA_DIR, 'bronx_v10_data.json');
const UPI_ID = process.env.UPI_ID || '8509561376@ibl';
const UPI_NAME = process.env.UPI_NAME || 'BRONX_ULTRA';
const PROFILE_PIC = process.env.PROFILE_PIC || 'https://i.ibb.co/WWyL62r3/IMG-20260410-221523-297.jpg';

// ============ DATABASE ============
let db = {
    users: {},        // {username: {password, credit, banned, role, sessions:[]}}
    sessions: {},     // {token: {username, role}}
    payments: [],
    tickets: [],
    broadcast: null,
    bannedIPs: [],
    customAPIs: [],
    adminSessions: [] // List of admin tokens
};

const OWNERS = ['bronx_ultra', 'king', 'admin', 'owner', 'bronx', 'ftgamer2'];

// ============ HELPERS ============
function sv() {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)) } 
    catch(e) { console.error('Save error:', e) }
}

function ld() {
    try {
        if(fs.existsSync(DATA_FILE)) {
            db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
            if(!db.adminSessions) db.adminSessions = [];
            if(!db.sessions) db.sessions = {};
        }
    } catch(e) { console.error('Load error:', e) }
}

function gid() { return crypto.randomBytes(8).toString('hex').toUpperCase() }
function gt() { return new Date(new Date().getTime() + (5.5*60*60*1000)) }
function esc(s) { 
    if(!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function own(u) { return OWNERS.includes(u?.toLowerCase()) }

// ============ GET TOKEN ============
function getToken(req) {
    return req.query.token || 
           req.headers['x-auth-token'] || 
           req.headers['authorization']?.replace('Bearer ','') ||
           req.body?.token;
}

// ============ GET USER FROM TOKEN ============
function getUser(req) {
    const token = getToken(req);
    if(!token) return null;
    
    // Check admin sessions
    if(db.adminSessions && db.adminSessions.includes(token)) {
        return { username: 'admin', role: 'admin', credit: 99999, token };
    }
    
    // Check user sessions
    if(db.sessions[token]) {
        const username = db.sessions[token].username;
        const user = db.users[username];
        if(user && !user.banned) {
            return { ...user, username, token };
        }
    }
    
    return null;
}

// ============ MIDDLEWARE ============
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers','Content-Type,x-auth-token,authorization');
    if(req.method === 'OPTIONS') return res.status(200).end();
    next();
});

// ============ SERVICES ============
const DEFAULT_SERVICES = {
    number:  { n:'📱 Number Info',  c:5,  i:'📱', cl:'#0096ff', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/number',   p:'num', k:'op' },
    aadhar:  { n:'🆔 Aadhar Info',  c:10, i:'🆔', cl:'#00c853', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/aadhar',   p:'num', k:'op' },
    vehicle: { n:'🚗 Vehicle Info', c:10, i:'🚗', cl:'#ff6d00', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/vehicle',  p:'vehicle', k:'op' },
    ff:      { n:'🎮 Free Fire',    c:3,  i:'🎮', cl:'#ff1744', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ff',       p:'uid', k:'op' },
    email:   { n:'📧 Email Lookup', c:5,  i:'📧', cl:'#ff9100', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/leakinfo',  p:'term', k:'op' },
    tg:      { n:'📲 TG to Num',    c:12, i:'📲', cl:'#00b8d4', a:'https://tg-ifo-babu-0.vercel.app/tracex',                            p:'username', k:'BRONXop' },
    upi:     { n:'💰 UPI Lookup',   c:5,  i:'💰', cl:'#7c4dff', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/upi',      p:'upi', k:'op' },
    numtoupi:{ n:'💳 Num to UPI',   c:5,  i:'💳', cl:'#e040fb', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/numtoupi', p:'num', k:'op' },
    numleak: { n:'🔓 Number Leak',  c:8,  i:'🔓', cl:'#ff5252', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/numleak',  p:'num', k:'op' },
    ifsc:    { n:'🏦 IFSC Info',    c:3,  i:'🏦', cl:'#2979ff', a:'https://osint-bronx-ultra-2-0.onrender.com/api/key-bronx/ifsc',     p:'ifsc', k:'op' },
};

function getAllServices() {
    const custom = {};
    db.customAPIs.filter(a => a.visible).forEach(a => {
        custom[a.id] = { n:a.name, c:a.credit, i:'🔧', cl:'#ffb400', a:a.url, p:a.param, k:'' };
    });
    return { ...DEFAULT_SERVICES, ...custom };
}

const PLANS = [
    {cr:1,pr:1},{cr:10,pr:5},{cr:15,pr:10},{cr:30,pr:20},{cr:40,pr:30},{cr:60,pr:50},
    {cr:80,pr:70},{cr:100,pr:80},{cr:120,pr:100},{cr:180,pr:150},{cr:220,pr:200},
    {cr:280,pr:250},{cr:600,pr:500},{cr:1200,pr:999,vip:true},
];

// ============ RENDER HTML PAGES ============
function renderHome(user) {
    const cr = user ? user.credit : 0;
    const un = user ? user.username : '';
    const token = user ? user.token : '';
    const it = gt().toLocaleString('en-IN', { timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit', second:'2-digit', day:'numeric', month:'short', year:'numeric' });
    const allSvc = getAllServices();
    
    const sc = Object.entries(allSvc).map(([k,s]) => 
        `<div class="sc" onclick="us('${k}')" style="border-top:3px solid ${s.cl||'#ffb400'}">
            <div class="si">${s.i||'🔧'}</div>
            <div class="sn">${s.n}</div>
            <div class="scr">🪙 ${s.c}</div>
        </div>`
    ).join('');
    
    const pc = PLANS.map(p => 
        `<div class="pc ${p.vip?'vip':''}" onclick="bc(${p.cr},${p.pr})">
            ${p.vip?'<div class="pb">👑</div>':''}
            <div class="pcr">🪙 ${p.cr}</div>
            <div class="pp">₹${p.pr}</div>
            <div class="pbtn">BUY</div>
        </div>`
    ).join('');
    
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BRONX V10</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
:root{--bg:#000a14;--s:rgba(5,15,35,.8);--b:rgba(0,150,255,.08);--t:#d0d8f0;--a:#0096ff;--g:#ffb400;--gr:#00ff88;--r:#ff3366}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--t);font-family:'Rajdhani',sans-serif;min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(0,150,255,.04),transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(0,200,255,.03),transparent 60%);pointer-events:none;z-index:0}
.rl{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;border-radius:50%;border:1px solid rgba(0,150,255,.04);animation:ri 5s infinite;pointer-events:none;z-index:0}@keyframes ri{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:.5}50%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
.sf{position:fixed;inset:0;pointer-events:none;z-index:0}.snf{position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;animation:fl linear infinite;opacity:0}@keyframes fl{0%{transform:translateY(-10vh);opacity:0}10%{opacity:.6}90%{opacity:.6}100%{transform:translateY(110vh);opacity:0}}
nav{position:sticky;top:0;z-index:1000;background:rgba(0,10,20,.9);border-bottom:1px solid var(--b);padding:10px 20px;display:flex;justify-content:space-between;align-items:center;backdrop-filter:blur(30px);flex-wrap:wrap;gap:8px}
nav .logo{font-family:'Orbitron',sans-serif;font-size:15px;letter-spacing:4px;background:linear-gradient(90deg,#0096ff,#00d4ff,#8b00ff,#ff0080);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:900;animation:la 3s ease infinite}@keyframes la{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
nav .tb{background:rgba(0,150,255,.06);color:#0096ff;padding:5px 12px;border-radius:20px;font-size:10px;border:1px solid rgba(0,150,255,.12);font-family:monospace}
nav .cb{background:rgba(255,180,0,.06);color:var(--g);padding:5px 12px;border-radius:20px;font-size:10px;font-weight:700;border:1px solid rgba(255,180,0,.12);animation:gp 2s infinite}@keyframes gp{0%,100%{box-shadow:0 0 8px rgba(255,180,0,.06)}50%{box-shadow:0 0 20px rgba(255,180,0,.15)}}
nav a{color:#667;text-decoration:none;font-size:10px;font-weight:600;transition:.3s}nav a:hover{color:#0096ff}
.sbtn{position:fixed;bottom:20px;right:20px;z-index:999;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;padding:10px 18px;border-radius:25px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:'Orbitron',sans-serif;box-shadow:0 0 30px rgba(0,150,255,.2)}
.bcpop{display:none;position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;padding:14px 28px;border-radius:16px;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 0 40px rgba(0,150,255,.3)}
.ct{max-width:1400px;margin:0 auto;padding:20px;position:relative;z-index:1}
.hero{text-align:center;padding:25px 20px 15px}
.hero .pr{width:90px;height:90px;border-radius:50%;padding:3px;background:linear-gradient(135deg,#0096ff,#8b00ff,#ff0080);animation:rs 4s linear infinite;margin:0 auto 12px}.hero .pr img{width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid #000a14}@keyframes rs{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.hero h1{font-size:clamp(24px,5vw,38px);font-weight:900;background:linear-gradient(90deg,#0096ff,#00d4ff,#8b00ff,#ff0080,#ffb400);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:rb 4s linear infinite;font-family:'Orbitron',sans-serif}@keyframes rb{0%{background-position:0% 50%}100%{background-position:300% 50%}}
.st{text-align:center;font-family:'Orbitron',sans-serif;font-size:16px;letter-spacing:4px;background:linear-gradient(90deg,#0096ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:20px 0 14px}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:20px}
.sc{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:18px 14px;text-align:center;cursor:pointer;transition:.3s;backdrop-filter:blur(20px)}.sc:hover{transform:translateY(-4px);box-shadow:0 20px 50px rgba(0,0,0,.5);border-color:#0096ff}
.si{font-size:32px;margin-bottom:8px}.sn{color:#fff;font-size:13px;font-weight:700}.scr{color:var(--g);font-size:10px;font-weight:600;margin-top:4px}
.pg{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-bottom:20px}
.pc{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:14px 10px;text-align:center;cursor:pointer;transition:.3s;position:relative}.pc:hover{transform:translateY(-4px);border-color:var(--g)}.pc.vip{border-color:rgba(255,180,0,.4);background:rgba(10,10,30,.7)}.pb{position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ffd700,#ffb400);color:#000;padding:2px 10px;border-radius:8px;font-size:8px;font-weight:700}
.pcr{font-size:20px;font-weight:900;color:var(--g);font-family:'Orbitron',sans-serif}.pp{font-size:14px;color:#fff;font-weight:700;margin:4px 0}.pbtn{background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;padding:7px;border-radius:8px;font-weight:700;font-size:9px}
.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center}.modal.sh{display:flex}
.mc{background:var(--s);border:1px solid rgba(0,150,255,.12);border-radius:20px;padding:24px;max-width:520px;width:90%;max-height:85vh;overflow:auto;backdrop-filter:blur(40px)}
.mc h3{color:#fff;font-size:18px;margin-bottom:14px;text-align:center;font-family:'Orbitron',sans-serif}
.mc input,.mc textarea{width:100%;padding:14px;background:rgba(0,0,0,.5);border:1px solid rgba(0,150,255,.12);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:10px;font-family:'Rajdhani',sans-serif}
.mc input:focus,.mc textarea:focus{border-color:#0096ff;box-shadow:0 0 20px rgba(0,150,255,.1)}
.bs{padding:14px;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;border:none;border-radius:14px;font-weight:700;width:100%;cursor:pointer;font-family:'Orbitron',sans-serif;letter-spacing:2px}
.bc-btn{padding:12px;background:#1a1a2e;color:#667;border:none;border-radius:12px;width:100%;cursor:pointer;margin-top:8px}
.rb{background:rgba(0,0,0,.5);border:1px solid rgba(0,150,255,.12);border-radius:14px;padding:16px;margin-top:12px;font-family:monospace;font-size:11px;color:var(--gr);max-height:250px;overflow:auto;white-space:pre-wrap;display:none}
.pl{display:block;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;padding:16px;border-radius:14px;font-weight:700;text-decoration:none;font-family:'Orbitron',sans-serif;letter-spacing:2px;margin-top:8px;font-size:15px;text-align:center}
footer{text-align:center;padding:20px;border-top:1px solid var(--b);margin-top:30px}footer .fb{font-family:'Orbitron',sans-serif;background:linear-gradient(90deg,#0096ff,#00d4ff,#8b00ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:13px}
</style></head><body>
<div class="rl"></div><div class="sf" id="snow"></div>
${db.broadcast?`<div class="bcpop" id="bcpop" onclick="this.style.display='none'">📢 ${esc(db.broadcast.message)}</div>`:''}
<nav><a href="/" class="logo">⚡ BRONX V10</a><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="tb">🕐 ${it}</span>${token?`<span class="cb">🪙 ${cr}</span><span style="color:#667;font-size:10px">@${un}</span><a href="/logout">LOGOUT</a>`:`<a href="/login">LOGIN</a><a href="/register">REGISTER</a>`}</div></nav>
<button class="sbtn" onclick="os()">💬 SUPPORT</button>
<div class="ct"><div class="hero"><div class="pr"><img src="${PROFILE_PIC}" alt="BRONX"></div><h1>BRONX CREDIT OSINT V10</h1><p style="color:#667;font-size:11px">🔍 Services · 🪙 Credits · 💳 UPI · 🔧 Custom APIs</p></div>
<div class="st">🔍 SERVICES</div><div class="sg">${sc}</div><div class="st">💳 BUY CREDITS</div><div class="pg">${pc}</div></div>
<div class="modal" id="sm"><div class="mc"><h3 id="mt">Search</h3><input type="text" id="si" placeholder="Enter value..." autocomplete="off"><button class="bs" onclick="ds()">🔍 SEARCH (<span id="mc">0</span>)</button><div class="rb" id="rb"></div><button class="bc-btn" onclick="cm()">✕ CLOSE</button></div></div>
<div class="modal" id="pm"><div class="mc"><h3>💳 Payment</h3><div style="text-align:center;padding:20px"><a id="ul" href="#" class="pl" target="_blank">⚡ PAY NOW</a><p style="color:#667;font-size:11px;margin-top:16px">DM @BRONX_ULTRA with Payment ID</p><p style="color:#fff;font-size:14px;margin-top:8px;font-family:monospace" id="pid"></p></div><button class="bc-btn" onclick="cp()">✕ CLOSE</button></div></div>
<div class="modal" id="supm"><div class="mc"><h3>💬 SUPPORT</h3><textarea id="sum" rows="3" placeholder="Message..."></textarea><button class="bs" onclick="ss()">📩 SEND</button><div id="stickets" style="margin-top:12px;max-height:200px;overflow:auto"></div><button class="bc-btn" onclick="cs()">✕ CLOSE</button></div></div>
<footer><p class="fb">BRONX CREDIT OSINT V10</p></footer>
<script>
var TOKEN='${token}';var SERVICES=${JSON.stringify(getAllServices())};var cs='';
if(TOKEN)localStorage.setItem('token',TOKEN);
for(var i=0;i<30;i++){var sf=document.createElement('div');sf.className='snf';sf.style.left=Math.random()*100+'%';sf.style.animationDelay=Math.random()*10+'s';sf.style.animationDuration=(5+Math.random()*10)+'s';sf.style.width=sf.style.height=(2+Math.random()*3)+'px';document.getElementById('snow').appendChild(sf)}
function us(k){if(!TOKEN){location.href='/login';return}cs=k;var s=SERVICES[k];document.getElementById('mt').textContent=s.n;document.getElementById('mc').textContent=s.c;document.getElementById('si').placeholder='Enter '+s.p;document.getElementById('si').value='';document.getElementById('rb').style.display='none';document.getElementById('sm').classList.add('sh')}
function cm(){document.getElementById('sm').classList.remove('sh');location.reload()}
async function ds(){var v=document.getElementById('si').value.trim();if(!v)return;var rb=document.getElementById('rb');rb.style.display='block';rb.style.color='#0096ff';rb.textContent='🔍...';try{var r=await fetch('/api/service/'+cs+'?token='+TOKEN+'&q='+encodeURIComponent(v));var d=await r.json();rb.style.color=d.s===0?'#ff3366':'#00ff88';rb.textContent=JSON.stringify(d,null,2)}catch(e){rb.style.color='#ff3366';rb.textContent='❌ Error'}}
function bc(cr,pr){if(!TOKEN){location.href='/login';return}fetch('/api/create-payment?token='+TOKEN,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan_credit:cr,plan_price:pr})}).then(r=>r.json()).then(d=>{if(d.s){document.getElementById('pid').innerHTML='📋 <b style="color:#0096ff">'+d.pid+'</b>';document.getElementById('ul').href=d.upl;document.getElementById('pm').classList.add('sh');setTimeout(function(){window.open(d.upl,'_blank')},600)}else alert('❌ '+(d.e||'Failed'))})}
function cp(){document.getElementById('pm').classList.remove('sh')}
function os(){document.getElementById('supm').classList.add('sh');loadTickets()}
function cs(){document.getElementById('supm').classList.remove('sh')}
async function ss(){var m=document.getElementById('sum').value.trim();if(!m)return;await fetch('/api/support',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:m})});document.getElementById('sum').value='';loadTickets()}
async function loadTickets(){try{var r=await fetch('/api/tickets?token='+TOKEN);var d=await r.json();var h='';if(d.tickets&&d.tickets.length>0){d.tickets.forEach(function(t){h+='<div style="background:rgba(0,0,0,.3);padding:10px;border-radius:10px;margin:6px 0;font-size:11px;text-align:left"><b style="color:'+(t.status==='open'?'#ffb400':'#00ff88')+'">'+t.status.toUpperCase()+'</b><br>'+esc(t.message)+(t.reply?'<br><b style="color:#00ff88">↩</b> '+esc(t.reply):'')+'</div>'})}else h='<p style="color:#667;padding:10px">No messages</p>';document.getElementById('stickets').innerHTML=h}catch(e){}}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
</script></body></html>`;
}

// ============ LOGIN PAGE ============
function renderLogin() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>LOGIN</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0}body{background:#000a14;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Rajdhani',sans-serif}.card{background:rgba(5,15,35,.85);padding:45px 35px;border-radius:24px;width:400px;border:1px solid rgba(0,150,255,.08);text-align:center;backdrop-filter:blur(20px)}.card h2{color:#fff;font-family:'Orbitron',sans-serif;font-size:26px;margin-bottom:24px;background:linear-gradient(90deg,#0096ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.card input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid rgba(0,150,255,.08);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;font-family:'Rajdhani',sans-serif;transition:.3s}.card input:focus{border-color:#0096ff;box-shadow:0 0 20px rgba(0,150,255,.1)}.card button{width:100%;padding:15px;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif}.card a{color:#0096ff;font-size:11px;text-decoration:none}.msg{font-size:11px;margin-top:8px;display:none}</style></head><body><div class="card">
<h2>🔐 LOGIN</h2>
<input type="text" id="u" placeholder="Username" autocomplete="off">
<input type="password" id="p" placeholder="Password">
<button onclick="login()">LOGIN</button>
<p class="msg" id="msg"></p>
<p style="margin-top:14px;color:#667;font-size:11px"><a href="/register">Register</a> | <a href="/">Home</a></p>
</div><script>
var savedToken=localStorage.getItem('token');
if(savedToken)location.href='/?token='+savedToken;
async function login(){
    var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim(),m=document.getElementById('msg');
    if(!u||!p){m.style.display='block';m.style.color='#ffb400';m.textContent='⚠ Fill all';return}
    try{
        var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
        var d=await r.json();
        if(d.s){
            localStorage.setItem('token',d.token);
            location.href='/?token='+d.token;
        }else{
            m.style.display='block';m.style.color='#ff3366';m.textContent='❌ '+d.e;
        }
    }catch(e){m.textContent='❌ Error'}
}
</script></body></html>`;
}

// ============ REGISTER PAGE ============
function renderRegister() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>REGISTER</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0}body{background:#000a14;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Rajdhani',sans-serif}.card{background:rgba(5,15,35,.85);padding:45px 35px;border-radius:24px;width:400px;border:1px solid rgba(0,150,255,.08);text-align:center;backdrop-filter:blur(20px)}.card h2{color:#fff;font-family:'Orbitron',sans-serif;font-size:26px;margin-bottom:24px;background:linear-gradient(90deg,#8b00ff,#0096ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.card input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid rgba(0,150,255,.08);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;font-family:'Rajdhani',sans-serif;transition:.3s}.card input:focus{border-color:#8b00ff;box-shadow:0 0 20px rgba(139,0,255,.1)}.card button{width:100%;padding:15px;background:linear-gradient(135deg,#8b00ff,#0096ff);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif}.card a{color:#8b00ff;font-size:11px}.msg{font-size:11px;margin-top:8px;display:none}</style></head><body><div class="card">
<h2>🆕 REGISTER</h2>
<input type="text" id="u" placeholder="Username">
<input type="password" id="p" placeholder="Password">
<button onclick="register()">CREATE ACCOUNT</button>
<p class="msg" id="msg"></p>
<p style="margin-top:14px;color:#667;font-size:11px"><a href="/login">Login</a> | <a href="/">Home</a></p>
</div><script>
async function register(){
    var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim(),m=document.getElementById('msg');
    if(!u||!p||u.length<3||p.length<4){m.style.display='block';m.style.color='#ffb400';m.textContent='⚠ Invalid';return}
    try{
        var r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
        var d=await r.json();
        if(d.s){
            localStorage.setItem('token',d.token);
            location.href='/?token='+d.token;
        }else{
            m.style.display='block';m.style.color='#ff3366';m.textContent='❌ '+d.e;
        }
    }catch(e){}
}
</script></body></html>`;
}

// ============ ADMIN LOGIN PAGE ============
function renderAdminLogin() {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMIN LOGIN</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0}body{background:#000a14;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Rajdhani',sans-serif}.card{background:rgba(5,15,35,.85);padding:45px 35px;border-radius:24px;width:400px;border:1px solid rgba(0,150,255,.08);text-align:center;backdrop-filter:blur(20px)}.card h2{color:#0096ff;font-family:'Orbitron',sans-serif;font-size:26px;margin-bottom:24px}.card input{width:100%;padding:15px;background:rgba(0,0,0,.5);border:1px solid rgba(0,150,255,.08);border-radius:14px;color:#fff;font-size:14px;outline:none;margin-bottom:12px;font-family:'Rajdhani',sans-serif;transition:.3s}.card input:focus{border-color:#0096ff;box-shadow:0 0 20px rgba(0,150,255,.1)}.card button{width:100%;padding:15px;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;border:none;border-radius:14px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif}.msg{font-size:11px;margin-top:8px;display:none}</style></head><body><div class="card">
<h2>👑 ADMIN LOGIN</h2>
<input type="text" id="u" placeholder="Username">
<input type="password" id="p" placeholder="Password">
<button onclick="login()">LOGIN</button>
<p class="msg" id="msg"></p>
</div><script>
var savedAdmin=localStorage.getItem('adminToken');
if(savedAdmin)location.href='/admin?token='+savedAdmin;
async function login(){
    var u=document.getElementById('u').value.trim(),p=document.getElementById('p').value.trim(),m=document.getElementById('msg');
    if(!u||!p){m.style.display='block';m.style.color='#ffb400';m.textContent='⚠ Fill all';return}
    try{
        var r=await fetch('/api/admin-login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
        var d=await r.json();
        if(d.s){
            localStorage.setItem('adminToken',d.token);
            location.href='/admin?token='+d.token;
        }else{
            m.style.display='block';m.style.color='#ff3366';m.textContent='❌ '+d.e;
        }
    }catch(e){m.textContent='❌ Error'}
}
</script></body></html>`;
}

// ============ ADMIN PANEL ============
function renderAdmin(user) {
    const tu = Object.values(db.users).filter(v => v.role !== 'admin' && v.username).length;
    const tp = db.payments.length;
    const pp = db.payments.filter(p => p.status === 'pending').length;
    const tr = db.payments.filter(p => p.status === 'approved').reduce((a,p) => a + p.amount, 0);
    
    const uh = Object.entries(db.users).filter(([k,v]) => v.role !== 'admin' && v.username).slice(0,50).map(([k,v]) =>
        `<tr><td>@${esc(v.username)}</td><td>🪙 ${v.credit}</td><td>${v.ip||'?'}</td>
        <td style="color:${v.banned?'red':'#00ff88'}">${v.banned?'BANNED':'OK'}</td>
        <td><button onclick="addCredit('${esc(v.username)}')" style="background:#0096ff;color:#fff;padding:4px 8px;border:none;border-radius:4px;cursor:pointer;font-size:10px">💳</button>
        <button onclick="toggleBan('${esc(v.username)}')" style="background:${v.banned?'#00ff88':'#ff3366'};color:#fff;padding:4px 8px;border:none;border-radius:4px;cursor:pointer;font-size:10px">${v.banned?'UNBAN':'BAN'}</button></td></tr>`
    ).join('');
    
    const ph = db.payments.slice(-30).reverse().map(p =>
        `<tr><td style="font-size:9px">${p.id}</td><td>@${p.username}</td><td>🪙 ${p.credit}</td><td>₹${p.amount}</td>
        <td style="color:${p.status==='approved'?'#00ff88':p.status==='rejected'?'red':'#ffb400'}"><b>${p.status.toUpperCase()}</b></td>
        <td>${p.status==='pending'?`<button onclick="approvePayment('${p.id}','${p.username}',${p.credit})" style="background:#0096ff;color:#fff;padding:4px 8px;border:none;border-radius:4px;cursor:pointer;font-size:10px;margin:2px">✅</button>
        <button onclick="rejectPayment('${p.id}')" style="background:red;color:#fff;padding:4px 8px;border:none;border-radius:4px;cursor:pointer;font-size:10px;margin:2px">❌</button>`:'✓'}</td></tr>`
    ).join('');
    
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ADMIN V10</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;600;700&display=swap" rel="stylesheet"><style>
:root{--bg:#000a14;--s:rgba(5,15,35,.8);--b:rgba(0,150,255,.08);--t:#d0d8f0;--a:#0096ff}
*{margin:0;padding:0;box-sizing:border-box}body{background:var(--bg);color:var(--t);font-family:'Rajdhani',sans-serif;font-size:13px;min-height:100vh}
.top{background:rgba(5,15,35,.9);border-bottom:1px solid var(--b);padding:14px 24px;display:flex;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(20px)}.top h1{font-family:'Orbitron',sans-serif;font-size:15px;background:linear-gradient(90deg,#0096ff,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ct{max-width:1500px;margin:0 auto;padding:20px}
.sg{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin-bottom:18px}
.sc{background:var(--s);border:1px solid var(--b);border-radius:16px;padding:14px;text-align:center}.sc .v{font-size:24px;font-weight:900;color:var(--a);font-family:'Orbitron',sans-serif}.sc .l{font-size:8px;color:#667}
.tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}.tab{padding:10px 18px;background:var(--s);border:1px solid var(--b);border-radius:10px;color:#667;cursor:pointer;font-size:11px;transition:.3s}.tab:hover{color:#0096ff}.tab.on{background:rgba(0,150,255,.06);border-color:var(--a);color:#fff}
.panel{display:none}.panel.on{display:block}
.sec{background:var(--s);border:1px solid var(--b);border-radius:18px;padding:20px;margin-bottom:16px}.sec h3{color:#fff;margin-bottom:12px;font-family:'Orbitron',sans-serif}
table{width:100%;border-collapse:collapse;font-size:10px}th{background:rgba(0,150,255,.03);color:#667;padding:10px 6px}td{padding:8px 6px;border-bottom:1px solid rgba(255,255,255,.01)}
input,textarea,select{padding:10px;background:rgba(0,0,0,.5);border:1px solid var(--b);border-radius:10px;color:#fff;font-size:12px;outline:none;font-family:'Rajdhani',sans-serif;margin:4px;width:calc(100% - 8px)}input:focus{border-color:var(--a)}
.fg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}
.btn{padding:10px 20px;background:linear-gradient(135deg,#0096ff,#0066cc);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Orbitron',sans-serif;margin:4px}
</style></head><body>
<div class="top"><h1>👑 ADMIN V10</h1><a href="/" style="color:#667;text-decoration:none;font-size:11px">🏠 HOME</a></div>
<div class="ct">
<div class="sg"><div class="sc"><div class="v">${tu}</div><div class="l">Users</div></div><div class="sc"><div class="v">${tp}</div><div class="l">Payments</div></div><div class="sc"><div class="v">${pp}</div><div class="l">Pending</div></div><div class="sc"><div class="v">₹${tr}</div><div class="l">Revenue</div></div></div>
<div class="tabs"><div class="tab on" onclick="st('users')">👥 USERS</div><div class="tab" onclick="st('payments')">💳 PAYMENTS</div><div class="tab" onclick="st('addcredit')">🪙 ADD CREDIT</div><div class="tab" onclick="st('custom')">🔧 API</div><div class="tab" onclick="st('broadcast')">📢 BROADCAST</div></div>

<div class="panel on" id="panel-users"><div class="sec"><h3>👥 USERS (${tu})</h3><div style="max-height:400px;overflow:auto"><table><tr><th>USER</th><th>CR</th><th>IP</th><th>STATUS</th><th>ACTIONS</th></tr>${uh}</table></div></div></div>

<div class="panel" id="panel-payments"><div class="sec"><h3>💳 PAYMENTS (${tp})</h3><div style="max-height:400px;overflow:auto"><table><tr><th>ID</th><th>USER</th><th>CR</th><th>₹</th><th>STATUS</th><th>ACTIONS</th></tr>${ph}</table></div></div></div>

<div class="panel" id="panel-addcredit"><div class="sec"><h3>🪙 ADD CREDIT</h3><input type="text" id="au" placeholder="Username"><input type="number" id="ac" placeholder="Credit Amount" value="100"><br><button class="btn" onclick="addCredit()">💳 ADD CREDIT</button></div></div>

<div class="panel" id="panel-custom"><div class="sec"><h3>➕ ADD CUSTOM API</h3><div class="fg"><input type="text" id="aname" placeholder="API Name"><input type="text" id="aep" placeholder="Endpoint"><input type="text" id="aparam" placeholder="Parameter"><input type="text" id="aurl" placeholder="Real API URL"><input type="number" id="acr" placeholder="Credits" value="5"></div><button class="btn" onclick="addAPI()">➕ ADD</button></div></div>

<div class="panel" id="panel-broadcast"><div class="sec"><h3>📢 BROADCAST</h3><textarea id="bmsg" rows="3" placeholder="Message..."></textarea><button class="btn" onclick="bcast()">📢 SEND</button>${db.broadcast?`<br><button class="btn" style="background:red" onclick="cbcast()">🗑 CLEAR</button>`:''}</div></div>
</div>
<script>
var TOKEN='${esc(user.token)}';
localStorage.setItem('adminToken',TOKEN);

function st(n){
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
    document.getElementById('panel-'+n).classList.add('on');
    event.target.classList.add('on');
}

async function api(url,body){
    var r = await fetch(url+'?token='+TOKEN,{
        method:body?'POST':'GET',
        headers:{'Content-Type':'application/json','x-auth-token':TOKEN},
        body:body?JSON.stringify(body):null
    });
    return await r.json();
}

function showMsg(m,c){var d=document.createElement('div');d.style.cssText='position:fixed;top:20px;right:20px;background:'+(c||'#0096ff')+';color:#fff;padding:14px 22px;border-radius:10px;font-size:13px;z-index:9999;font-weight:700;font-family:Rajdhani,sans-serif';d.textContent=m;document.body.appendChild(d);setTimeout(function(){d.remove()},3000)}

async function addCredit(username){
    var u = username || document.getElementById('au').value.trim();
    var c = parseInt(document.getElementById('ac').value) || 100;
    if(!u)return showMsg('⚠ Enter username','#ff3366');
    if(!username) c = parseInt(prompt('Credit amount for @'+u+':','100')) || 100;
    var r = await api('/api/admin/add-credit',{username:u,credit:c});
    if(r.s) showMsg(r.msg||'✅ Credits added!','#00ff88');
    else showMsg(r.e||'❌ Failed','#ff3366');
    setTimeout(function(){location.reload()},1500);
}

async function toggleBan(u){await api('/api/admin/ban-user',{username:u});location.reload()}

async function approvePayment(id,u,cr){
    if(!confirm('Approve payment and add '+cr+' credits to @'+u+'?'))return;
    var r = await api('/api/admin/add-credit',{username:u,credit:cr,payment_id:id});
    if(r.s) showMsg('✅ Approved! +'+cr+'cr','#00ff88');
    else showMsg(r.e||'❌ Failed','#ff3366');
    setTimeout(function(){location.reload()},1500);
}

async function rejectPayment(id){
    if(!confirm('Reject payment '+id+'?'))return;
    await api('/api/admin/reject-payment',{payment_id:id});
    location.reload();
}

async function addAPI(){
    var n=document.getElementById('aname').value.trim();
    var e=document.getElementById('aep').value.trim();
    var p=document.getElementById('aparam').value.trim();
    var u=document.getElementById('aurl').value.trim();
    var c=parseInt(document.getElementById('acr').value)||5;
    if(!n||!e||!u)return showMsg('⚠ Fill all','#ff3366');
    var r=await api('/api/admin/add-api',{name:n,endpoint:e,param:p,url:u,credit:c});
    if(r.s) showMsg(r.msg,'#00ff88');
    setTimeout(function(){location.reload()},1500);
}

async function bcast(){
    var m=document.getElementById('bmsg').value.trim();
    if(!m)return showMsg('⚠ Type message','#ff3366');
    var r=await api('/api/admin/broadcast',{message:m});
    if(r.s) showMsg('✅ Broadcast set!','#00ff88');
    setTimeout(function(){location.reload()},1000);
}

async function cbcast(){await api('/api/admin/clear-broadcast');location.reload()}
</script></body></html>`;
}

// ============ ROUTES ============
app.get('/', (req,res) => {
    const user = getUser(req);
    res.send(renderHome(user));
});

app.get('/login', (req,res) => {
    const user = getUser(req);
    if(user) return res.redirect('/');
    res.send(renderLogin());
});

app.get('/register', (req,res) => {
    const user = getUser(req);
    if(user) return res.redirect('/');
    res.send(renderRegister());
});

app.get('/logout', (req,res) => {
    const token = getToken(req);
    if(token && db.sessions[token]) {
        delete db.sessions[token];
        sv();
    }
    res.redirect('/login');
});

app.get('/admin-login', (req,res) => {
    const token = getToken(req);
    if(token && db.adminSessions && db.adminSessions.includes(token)) {
        return res.redirect('/admin?token='+token);
    }
    res.send(renderAdminLogin());
});

app.get('/admin', (req,res) => {
    const token = getToken(req);
    if(!token || !db.adminSessions || !db.adminSessions.includes(token)) {
        return res.redirect('/admin-login');
    }
    res.send(renderAdmin({ username:'admin', role:'admin', credit:99999, token }));
});

// ============ API ROUTES ============
app.post('/api/register', (req,res) => {
    const { username, password } = req.body;
    if(!username || !password || username.length < 3 || password.length < 4) {
        return res.json({ s:0, e:'Invalid fields' });
    }
    if(db.users[username]) {
        return res.json({ s:0, e:'Username taken' });
    }
    
    const token = gid() + gid();
    const credit = own(username) ? 99999 : 1;
    
    db.users[username] = {
        password,
        credit,
        ip: req.clientIP,
        banned: false,
        role: own(username) ? 'owner' : 'user'
    };
    
    db.sessions[token] = { username, role: db.users[username].role };
    sv();
    
    res.json({ s:1, token, credit, msg: credit > 1 ? '✅ Owner! 99999 credits' : '✅ Created! 1 credit' });
});

app.post('/api/login', (req,res) => {
    const { username, password } = req.body;
    if(!username || !password) return res.json({ s:0, e:'Missing fields' });
    
    const user = db.users[username];
    if(!user) return res.json({ s:0, e:'Account not found' });
    if(user.password !== password) return res.json({ s:0, e:'Wrong password' });
    if(user.banned) return res.json({ s:0, e:'Banned' });
    
    const token = gid() + gid();
    db.sessions[token] = { username, role: user.role || 'user' };
    sv();
    
    res.json({ s:1, token, credit: user.credit, username });
});

app.post('/api/admin-login', (req,res) => {
    const { username, password } = req.body;
    
    if(username === ADMIN_USER && password === ADMIN_PASS) {
        const token = 'ADMIN_' + gid() + gid();
        if(!db.adminSessions) db.adminSessions = [];
        db.adminSessions.push(token);
        sv();
        return res.json({ s:1, token, redirect:'/admin' });
    }
    
    res.json({ s:0, e:'Invalid admin credentials' });
});

// ============ ADMIN API (with proper auth) ============
function adminAuth(req, res, next) {
    const token = getToken(req);
    if(!token || !db.adminSessions || !db.adminSessions.includes(token)) {
        return res.status(401).json({ s:0, e:'Unauthorized - Admin access required' });
    }
    next();
}

app.post('/api/admin/add-credit', adminAuth, (req,res) => {
    const { username, credit, payment_id } = req.body;
    if(!username || !credit) return res.json({ s:0, e:'Missing fields' });
    
    const user = db.users[username];
    if(!user) return res.json({ s:0, e:'User not found' });
    
    const amt = parseInt(credit);
    user.credit += amt;
    
    if(payment_id) {
        const p = db.payments.find(x => x.id === payment_id);
        if(p) p.status = 'approved';
    }
    
    sv();
    res.json({ s:1, msg:`✅ Added ${amt} credits to @${username}. New: ${user.credit}` });
});

app.post('/api/admin/ban-user', adminAuth, (req,res) => {
    const { username } = req.body;
    if(db.users[username]) {
        db.users[username].banned = !db.users[username].banned;
        sv();
    }
    res.json({ s:1 });
});

app.post('/api/admin/reject-payment', adminAuth, (req,res) => {
    const { payment_id } = req.body;
    const p = db.payments.find(x => x.id === payment_id);
    if(p) { p.status = 'rejected'; sv(); }
    res.json({ s:1 });
});

app.post('/api/admin/broadcast', adminAuth, (req,res) => {
    const { message } = req.body;
    db.broadcast = { message, ts: new Date().toISOString() };
    sv();
    res.json({ s:1 });
});

app.post('/api/admin/clear-broadcast', adminAuth, (req,res) => {
    db.broadcast = null;
    sv();
    res.json({ s:1 });
});

app.post('/api/admin/add-api', adminAuth, (req,res) => {
    const { name, endpoint, param, url, credit } = req.body;
    if(!name || !endpoint || !url) return res.json({ s:0, e:'Missing fields' });
    db.customAPIs.push({
        id: 'custom_' + gid(),
        name, endpoint,
        param: param || 'q',
        url,
        credit: parseInt(credit) || 5,
        visible: true
    });
    sv();
    res.json({ s:1, msg:`✅ Added: ${name}` });
});

// ============ SERVICE API ============
app.get('/api/service/:name', async(req,res) => {
    const user = getUser(req);
    if(!user) return res.json({ s:0, e:'Login required' });
    if(user.banned) return res.json({ s:0, e:'Banned' });
    
    const allSvc = getAllServices();
    const svc = allSvc[req.params.name];
    if(!svc) return res.json({ s:0, e:'Service not found' });
    
    if(user.credit < svc.c) return res.json({ s:0, e:`Need ${svc.c} credits. You have ${user.credit}` });
    
    const val = req.query[svc.p] || req.query.q;
    if(!val) return res.json({ s:0, e:`Enter ${svc.p}` });
    
    user.credit -= svc.c;
    if(db.users[user.username]) db.users[user.username].credit = user.credit;
    sv();
    
    const url = svc.a + '?key=' + (svc.k||'') + '&' + svc.p + '=' + encodeURIComponent(val);
    try {
        const r = await axios.get(url, { timeout: 30000 });
        const d = r.data;
        delete d.credit; delete d.owner; delete d.by; delete d.channel;
        d.api_info = { service: svc.n, credit_used: svc.c, remaining: user.credit };
        res.json(d);
    } catch(e) {
        user.credit += svc.c;
        if(db.users[user.username]) db.users[user.username].credit = user.credit;
        sv();
        res.json({ s:0, e:'API unavailable. Refunded.' });
    }
});

// ============ PAYMENT ============
app.post('/api/create-payment', (req,res) => {
    const user = getUser(req);
    if(!user) return res.json({ s:0, e:'Login required' });
    
    const { plan_credit, plan_price } = req.body;
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
    
    res.json({ s:1, pid, upl });
});

// ============ SUPPORT ============
app.get('/api/tickets', (req,res) => {
    const user = getUser(req);
    res.json({ s:1, tickets: db.tickets.filter(t => t.username === user?.username).reverse() });
});

app.post('/api/support', (req,res) => {
    const user = getUser(req);
    const { message } = req.body;
    if(!message) return res.json({ s:0, e:'Enter message' });
    
    const tid = 'TKT' + gid();
    db.tickets.push({
        id: tid,
        username: user?.username || 'guest',
        message,
        ip: req.clientIP,
        ts: new Date().toISOString(),
        status: 'open',
        reply: ''
    });
    sv();
    res.json({ s:1, tid, msg:'✅ Sent!' });
});

// ============ STARTUP ============
ld();
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log('🩸 BRONX V10 on port', PORT));
module.exports = app;
