const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));

// Webhooks need RAW body for signature verification
app.use('/api/payments/webhooks/paddle', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});
app.use('/api/payments/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body;
  next();
});

app.use(express.json());

const { rateLimit } = require('./middleware/security');
app.use('/api', rateLimit);

// API Routes
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/products', require('./routes/products'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/support', require('./routes/support'));
app.use('/api/currency', require('./routes/currency'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ===================== IMPROVED ADMIN DASHBOARD =====================
// ===================== PASSWORD-PROTECTED ADMIN =====================

app.get('/admin', (req, res) => {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'kamitopup2026';

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KamiTopup Admin</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    body { background: #0f0f13; color: #fff; font-family: system-ui, sans-serif; }
    .card { background: #1a1a24; border: 1px solid rgba(255,255,255,0.08); }
  </style>
</head>
<body class="min-h-screen p-4 md:p-8">
  <div id="loginScreen" class="max-w-sm mx-auto mt-24">
    <div class="card rounded-2xl p-8 text-center">
      <div class="w-14 h-14 mx-auto rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-xl mb-4">K</div>
      <h1 class="text-xl font-bold mb-2">Admin Login</h1>
      <p class="text-gray-400 text-sm mb-6">Enter the admin password</p>
      <input type="password" id="pwd" placeholder="Password" class="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none mb-4">
      <button onclick="tryLogin()" class="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold">Login</button>
      <p id="loginError" class="text-red-400 text-sm mt-3 hidden">Wrong password</p>
    </div>
  </div>

  <div id="dashboard" class="max-w-7xl mx-auto hidden">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold">K</span>
          KamiTopup Admin
        </h1>
        <p class="text-gray-400 text-sm mt-1">Orders & Security Management</p>
      </div>
      <div class="flex gap-3">
        <button onclick="loadData()" class="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium">
          <i class="fas fa-sync-alt mr-2"></i>Refresh
        </button>
        <button onclick="logout()" class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm">Logout</button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="card rounded-2xl p-5">
        <div class="text-gray-400 text-sm mb-1">Total Orders</div>
        <div class="text-2xl font-bold" id="stat-total">—</div>
      </div>
      <div class="card rounded-2xl p-5">
        <div class="text-gray-400 text-sm mb-1">Completed</div>
        <div class="text-2xl font-bold text-green-400" id="stat-completed">—</div>
      </div>
      <div class="card rounded-2xl p-5">
        <div class="text-gray-400 text-sm mb-1">Failed</div>
        <div class="text-2xl font-bold text-red-400" id="stat-failed">—</div>
      </div>
      <div class="card rounded-2xl p-5">
        <div class="text-gray-400 text-sm mb-1">Revenue</div>
        <div class="text-2xl font-bold text-cyan-400" id="stat-revenue">—</div>
      </div>
    </div>

    <!-- Analytics -->
    <div class="grid md:grid-cols-2 gap-6 mb-8" id="analyticsSection">
      <div class="card rounded-2xl p-5">
        <h3 class="font-semibold mb-4 text-sm text-gray-400">Top Games by Revenue</h3>
        <div id="topGames" class="space-y-2 text-sm">—</div>
      </div>
      <div class="card rounded-2xl p-5">
        <h3 class="font-semibold mb-4 text-sm text-gray-400">Last 7 Days</h3>
        <div id="dailyStats" class="space-y-2 text-sm">—</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button onclick="showTab('orders')" id="tab-orders" class="tab-btn px-4 py-2 rounded-lg bg-violet-600 text-sm font-medium">Orders</button>
      <button onclick="showTab('blacklist')" id="tab-blacklist" class="tab-btn px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">Blacklist</button>
      <button onclick="showTab('promos')" id="tab-promos" class="tab-btn px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">Promos</button>
      <button onclick="showTab('support')" id="tab-support" class="tab-btn px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">Support</button>
    </div>

    <!-- Orders Tab -->
    <div id="panel-orders">
      <div class="flex flex-wrap gap-3 mb-4">
        <button onclick="filterStatus('')" class="filter-btn px-3 py-1.5 rounded-lg bg-violet-600 text-sm">All</button>
        <button onclick="filterStatus('completed')" class="filter-btn px-3 py-1.5 rounded-lg bg-white/10 text-sm">Completed</button>
        <button onclick="filterStatus('failed')" class="filter-btn px-3 py-1.5 rounded-lg bg-white/10 text-sm">Failed</button>
        <button onclick="filterStatus('processing')" class="filter-btn px-3 py-1.5 rounded-lg bg-white/10 text-sm">Processing</button>
      </div>
      <div class="card rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-black/30 text-gray-400">
              <tr>
                <th class="text-left p-4">Order ID</th>
                <th class="text-left p-4">Game</th>
                <th class="text-left p-4">Package</th>
                <th class="text-left p-4">Price</th>
                <th class="text-left p-4">Player ID</th>
                <th class="text-left p-4">Supplier</th>
                <th class="text-left p-4">Status</th>
                <th class="text-left p-4">Created</th>
                <th class="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody id="orders-body">
              <tr><td colspan="9" class="p-8 text-center text-gray-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Blacklist Tab -->
    <div id="panel-blacklist" class="hidden">
      <div class="card rounded-2xl p-6 mb-6">
        <h2 class="font-semibold mb-4">Add Player ID to Blacklist</h2>
        <div class="flex flex-col sm:flex-row gap-3">
          <input type="text" id="blPlayerId" placeholder="Player ID" class="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none">
          <input type="text" id="blReason" placeholder="Reason (optional)" class="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none">
          <button onclick="addBlacklist()" class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 font-medium">
            <i class="fas fa-ban mr-1"></i> Block
          </button>
        </div>
      </div>

      <div class="card rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-black/30 text-gray-400">
              <tr>
                <th class="text-left p-4">Player ID</th>
                <th class="text-left p-4">Reason</th>
                <th class="text-left p-4">Added</th>
                <th class="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody id="blacklist-body">
              <tr><td colspan="4" class="p-8 text-center text-gray-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>


    <!-- Promos Tab -->
    <div id="panel-promos" class="hidden">
      <div class="card rounded-2xl p-6 mb-6">
        <h2 class="font-semibold mb-4">Create Promo Code</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          <input type="text" id="promoCodeInput" placeholder="CODE" class="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none uppercase">
          <select id="promoType" class="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none">
            <option value="percent">Percent (%)</option>
            <option value="fixed">Fixed ($)</option>
          </select>
          <input type="number" id="promoValue" placeholder="Value (e.g. 10)" class="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none">
          <input type="number" id="promoMin" placeholder="Min order $" class="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none">
          <input type="number" id="promoMaxUses" placeholder="Max uses (0=∞)" class="px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none">
          <button onclick="createPromo()" class="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium">Create</button>
        </div>
      </div>
      <div class="card rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-black/30 text-gray-400">
              <tr>
                <th class="text-left p-4">Code</th>
                <th class="text-left p-4">Type</th>
                <th class="text-left p-4">Value</th>
                <th class="text-left p-4">Min</th>
                <th class="text-left p-4">Used</th>
                <th class="text-left p-4">Active</th>
                <th class="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody id="promos-body">
              <tr><td colspan="7" class="p-8 text-center text-gray-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Support Tab -->
    <div id="panel-support" class="hidden">
      <div class="flex gap-3 mb-4">
        <button onclick="loadTickets('')" class="ticket-filter px-3 py-1.5 rounded-lg bg-violet-600 text-sm">All</button>
        <button onclick="loadTickets('open')" class="ticket-filter px-3 py-1.5 rounded-lg bg-white/10 text-sm">Open</button>
        <button onclick="loadTickets('replied')" class="ticket-filter px-3 py-1.5 rounded-lg bg-white/10 text-sm">Replied</button>
        <button onclick="loadTickets('closed')" class="ticket-filter px-3 py-1.5 rounded-lg bg-white/10 text-sm">Closed</button>
      </div>
      <div class="card rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-black/30 text-gray-400">
              <tr>
                <th class="text-left p-4">ID</th>
                <th class="text-left p-4">Email</th>
                <th class="text-left p-4">Subject</th>
                <th class="text-left p-4">Order</th>
                <th class="text-left p-4">Status</th>
                <th class="text-left p-4">Created</th>
                <th class="text-left p-4">Action</th>
              </tr>
            </thead>
            <tbody id="tickets-body">
              <tr><td colspan="7" class="p-8 text-center text-gray-500">Loading...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <!-- Reply modal area -->
      <div id="replyBox" class="hidden card rounded-2xl p-6 mt-6">
        <h3 class="font-semibold mb-2">Reply to <span id="replyTicketId"></span></h3>
        <textarea id="replyText" rows="3" class="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-violet-500 focus:outline-none mb-3" placeholder="Your reply..."></textarea>
        <div class="flex gap-3">
          <button onclick="sendReply()" class="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium">Send Reply</button>
          <button onclick="closeTicketAdmin()" class="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15">Close Ticket</button>
          <button onclick="document.getElementById('replyBox').classList.add('hidden')" class="px-5 py-2 rounded-xl bg-white/5">Cancel</button>
        </div>
      </div>
    </div>

  <script>
    const ADMIN_PASSWORD = '${ADMIN_PASSWORD}';
    let currentStatus = '';
    let adminPass = '';

    function tryLogin() {
      const pwd = document.getElementById('pwd').value;
      if (pwd === ADMIN_PASSWORD) {
        adminPass = pwd;
        sessionStorage.setItem('kamitopup_admin', '1');
        sessionStorage.setItem('kamitopup_pass', pwd);
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        loadData();
        loadBlacklist();
      } else {
        document.getElementById('loginError').classList.remove('hidden');
      }
    }

    function logout() {
      sessionStorage.removeItem('kamitopup_admin');
      sessionStorage.removeItem('kamitopup_pass');
      location.reload();
    }

    if (sessionStorage.getItem('kamitopup_admin') === '1') {
      adminPass = sessionStorage.getItem('kamitopup_pass') || ADMIN_PASSWORD;
      document.getElementById('loginScreen').classList.add('hidden');
      document.getElementById('dashboard').classList.remove('hidden');
      loadData();
      loadBlacklist();
    }

    document.getElementById('pwd').addEventListener('keydown', e => {
      if (e.key === 'Enter') tryLogin();
    });

    function showTab(tab) {
      ['orders','blacklist','promos','support'].forEach(t => {
        const el = document.getElementById('panel-' + t);
        if (el) el.classList.toggle('hidden', t !== tab);
      });
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('bg-violet-600');
        b.classList.add('bg-white/10');
      });
      const tabBtn = document.getElementById('tab-' + tab);
      if (tabBtn) {
        tabBtn.classList.remove('bg-white/10');
        tabBtn.classList.add('bg-violet-600');
      }
      if (tab === 'promos') loadPromos();
      if (tab === 'support') loadTickets('');
    }

    function filterStatus(status) {
      currentStatus = status;
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.classList.remove('bg-violet-600');
        b.classList.add('bg-white/10');
      });
      event.target.classList.remove('bg-white/10');
      event.target.classList.add('bg-violet-600');
      loadOrders();
    }

    async function loadData() {
      const stats = await fetch('/api/orders/stats').then(r => r.json());
      document.getElementById('stat-total').textContent = stats.total || 0;
      document.getElementById('stat-completed').textContent = stats.completed || 0;
      document.getElementById('stat-failed').textContent = stats.failed || 0;
      document.getElementById('stat-revenue').textContent = '$' + (stats.revenue || 0).toFixed(2);

      // Top games
      const topEl = document.getElementById('topGames');
      if (topEl && stats.topGames) {
        topEl.innerHTML = stats.topGames.length
          ? stats.topGames.map(g => \`<div class="flex justify-between"><span class="capitalize">\${g.game}</span><span>\${g.orders} orders · $\${Number(g.revenue||0).toFixed(0)}</span></div>\`).join('')
          : '<span class="text-gray-500">No data yet</span>';
      }

      // Daily
      const dailyEl = document.getElementById('dailyStats');
      if (dailyEl && stats.daily) {
        dailyEl.innerHTML = stats.daily.length
          ? stats.daily.map(d => \`<div class="flex justify-between"><span>\${d.day}</span><span>\${d.orders} orders · $\${Number(d.revenue||0).toFixed(0)}</span></div>\`).join('')
          : '<span class="text-gray-500">No data yet</span>';
      }

      loadOrders();
    }

    async function loadOrders() {
      const url = currentStatus ? '/api/orders?status=' + currentStatus : '/api/orders';
      const [ordersData, blData] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch('/api/admin/blacklist', { headers: { 'x-admin-password': adminPass } }).then(r => r.json()).catch(() => ({ blacklist: [] }))
      ]);

      const blacklistedIds = new Set((blData.blacklist || []).map(b => b.player_id));
      const tbody = document.getElementById('orders-body');

      if (!ordersData.orders || ordersData.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-500">No orders yet</td></tr>';
        return;
      }

      tbody.innerHTML = ordersData.orders.map(o => {
        const statusColor = { completed: 'text-green-400', failed: 'text-red-400', processing: 'text-yellow-400' }[o.status] || 'text-gray-400';
        const isBlocked = blacklistedIds.has(o.player_id);
        const blockedBadge = isBlocked
          ? '<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-600/30 text-red-400 font-semibold">BLOCKED</span>'
          : '';
        return \`
          <tr class="border-t border-white/5 hover:bg-white/5 \${isBlocked ? 'bg-red-950/20' : ''}">
            <td class="p-4 font-mono text-xs">\${o.id}</td>
            <td class="p-4 capitalize">\${o.game}</td>
            <td class="p-4">\${o.package_amount}</td>
            <td class="p-4">$\${o.package_price}</td>
            <td class="p-4 font-mono text-xs">
              \${o.player_id}\${blockedBadge}
            </td>
            <td class="p-4 text-xs">\${o.supplier || '—'}</td>
            <td class="p-4 font-medium \${statusColor}">\${o.status}</td>
            <td class="p-4 text-xs text-gray-400">\${o.created_at}</td>
            <td class="p-4">
              \${isBlocked
                ? '<span class="text-xs text-red-400">Blocked</span>'
                : \`<button onclick="blockPlayer('\${o.player_id}')" class="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40" title="Blacklist this Player ID"><i class="fas fa-ban"></i></button>\`
              }
            </td>
          </tr>
        \`;
      }).join('');
    }

    async function loadBlacklist() {
      const data = await fetch('/api/admin/blacklist', {
        headers: { 'x-admin-password': adminPass }
      }).then(r => r.json());

      const tbody = document.getElementById('blacklist-body');
      if (!data.blacklist || data.blacklist.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">No blacklisted IDs</td></tr>';
        return;
      }

      tbody.innerHTML = data.blacklist.map(b => \`
        <tr class="border-t border-white/5 hover:bg-white/5">
          <td class="p-4 font-mono">\${b.player_id}</td>
          <td class="p-4 text-gray-400">\${b.reason || '—'}</td>
          <td class="p-4 text-xs text-gray-500">\${b.created_at}</td>
          <td class="p-4">
            <button onclick="removeBlacklist('\${b.player_id}')" class="text-xs px-2 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/40">
              Unblock
            </button>
          </td>
        </tr>
      \`).join('');
    }

    async function addBlacklist() {
      const playerId = document.getElementById('blPlayerId').value.trim();
      const reason = document.getElementById('blReason').value.trim();
      if (!playerId) return alert('Enter a Player ID');

      await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPass
        },
        body: JSON.stringify({ playerId, reason })
      });

      document.getElementById('blPlayerId').value = '';
      document.getElementById('blReason').value = '';
      loadBlacklist();
    }

    async function removeBlacklist(playerId) {
      if (!confirm('Unblock ' + playerId + '?')) return;
      await fetch('/api/admin/blacklist/' + encodeURIComponent(playerId), {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPass }
      });
      loadBlacklist();
    }

    async function blockPlayer(playerId) {
      if (!confirm('Blacklist Player ID: ' + playerId + '?')) return;
      await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPass
        },
        body: JSON.stringify({ playerId, reason: 'Blocked from orders list' })
      });
      alert('Player ID blacklisted');
      loadBlacklist();
    }


    // ========== PROMOS ==========
    async function loadPromos() {
      const data = await fetch('/api/promo', {
        headers: { 'x-admin-password': adminPass }
      }).then(r => r.json()).catch(() => ({ promos: [] }));

      const tbody = document.getElementById('promos-body');
      if (!data.promos || data.promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500">No promo codes yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.promos.map(p => `
        <tr class="border-t border-white/5 hover:bg-white/5">
          <td class="p-4 font-mono font-medium">${p.code}</td>
          <td class="p-4">${p.discount_type}</td>
          <td class="p-4">${p.discount_type === 'percent' ? p.discount_value + '%' : '$' + p.discount_value}</td>
          <td class="p-4">$${p.min_order || 0}</td>
          <td class="p-4">${p.used_count}${p.max_uses ? ' / ' + p.max_uses : ''}</td>
          <td class="p-4">${p.active ? '<span class="text-green-400">Yes</span>' : '<span class="text-red-400">No</span>'}</td>
          <td class="p-4">
            ${p.active ? `<button onclick="deactivatePromo('${p.code}')" class="text-xs px-2 py-1 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40">Deactivate</button>` : '—'}
          </td>
        </tr>
      `).join('');
    }

    async function createPromo() {
      const code = document.getElementById('promoCodeInput').value.trim();
      const discountType = document.getElementById('promoType').value;
      const discountValue = document.getElementById('promoValue').value;
      const minOrder = document.getElementById('promoMin').value || 0;
      const maxUses = document.getElementById('promoMaxUses').value || 0;
      if (!code || !discountValue) return alert('Code and value required');

      await fetch('/api/promo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPass
        },
        body: JSON.stringify({ code, discountType, discountValue, minOrder, maxUses })
      });
      document.getElementById('promoCodeInput').value = '';
      document.getElementById('promoValue').value = '';
      loadPromos();
    }

    async function deactivatePromo(code) {
      if (!confirm('Deactivate ' + code + '?')) return;
      await fetch('/api/promo/' + encodeURIComponent(code), {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPass }
      });
      loadPromos();
    }

    // ========== SUPPORT TICKETS ==========
    let currentReplyId = null;

    async function loadTickets(status) {
      document.querySelectorAll('.ticket-filter').forEach(b => {
        b.classList.remove('bg-violet-600');
        b.classList.add('bg-white/10');
      });
      if (typeof event !== 'undefined' && event && event.target && event.target.classList.contains('ticket-filter')) {
        event.target.classList.remove('bg-white/10');
        event.target.classList.add('bg-violet-600');
      }

      const url = status ? '/api/support?status=' + status : '/api/support';
      const data = await fetch(url, {
        headers: { 'x-admin-password': adminPass }
      }).then(r => r.json()).catch(() => ({ tickets: [] }));

      const tbody = document.getElementById('tickets-body');
      if (!data.tickets || data.tickets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500">No tickets</td></tr>';
        return;
      }

      tbody.innerHTML = data.tickets.map(t => {
        const statusColor = { open: 'text-yellow-400', replied: 'text-blue-400', closed: 'text-gray-400' }[t.status] || '';
        return `
          <tr class="border-t border-white/5 hover:bg-white/5">
            <td class="p-4 font-mono text-xs">${t.id}</td>
            <td class="p-4 text-xs">${t.email}</td>
            <td class="p-4">${t.subject}</td>
            <td class="p-4 font-mono text-xs">${t.order_id || '—'}</td>
            <td class="p-4 ${statusColor}">${t.status}</td>
            <td class="p-4 text-xs text-gray-400">${t.created_at}</td>
            <td class="p-4">
              <button onclick="openReply('${t.id}')" class="text-xs px-2 py-1 rounded bg-violet-600/20 text-violet-300 hover:bg-violet-600/40">Reply</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    function openReply(id) {
      currentReplyId = id;
      document.getElementById('replyTicketId').textContent = id;
      document.getElementById('replyText').value = '';
      document.getElementById('replyBox').classList.remove('hidden');
    }

    async function sendReply() {
      const reply = document.getElementById('replyText').value.trim();
      if (!reply || !currentReplyId) return;
      await fetch('/api/support/' + currentReplyId + '/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPass
        },
        body: JSON.stringify({ reply })
      });
      document.getElementById('replyBox').classList.add('hidden');
      loadTickets('');
    }

    async function closeTicketAdmin() {
      if (!currentReplyId) return;
      await fetch('/api/support/' + currentReplyId + '/close', {
        method: 'POST',
        headers: { 'x-admin-password': adminPass }
      });
      document.getElementById('replyBox').classList.add('hidden');
      loadTickets('');
    }

    setInterval(() => {
      if (sessionStorage.getItem('kamitopup_admin') === '1') {
        loadData();
        if (!document.getElementById('panel-blacklist').classList.contains('hidden')) {
          loadBlacklist();
        }
      }
    }, 30000);
  </script>
</body>
</html>`);
});


app.listen(PORT, () => {
  console.log('\\n🚀 KamiTopup backend running on http://localhost:' + PORT);
  console.log('   Health : http://localhost:' + PORT + '/api/health');
  console.log('   Admin  : http://localhost:' + PORT + '/admin\\n');
});
