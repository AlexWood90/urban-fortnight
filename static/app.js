// ── API helpers ───────────────────────────────────────────────────────────────

const api = {
  async get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async put(url, body) {
    const r = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async del(url) {
    const r = await fetch(url, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
  },
};

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 2800);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(s) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(s + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

function cdLabel(days) {
  if (days === 0)  return 'Today!';
  if (days === 1)  return '1 day to go';
  if (days > 1)   return `${days} days to go`;
  if (days === -1) return '1 day ago';
  return `${Math.abs(days)} days ago`;
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return d.toISOString().split('T')[0];
}

function pbarClass(pct) {
  if (pct > 90) return 'pbar-danger';
  if (pct > 70) return 'pbar-warning';
  return 'pbar-blue';
}

// ── Tab routing ───────────────────────────────────────────────────────────────

const TAB_LOADERS = {
  dashboard: loadDashboard,
  roster:    loadRoster,
  money:     loadMoney,
  fitness:   loadFitness,
  packing:   loadPacking,
};

function showTab(name) {
  if (!TAB_LOADERS[name]) name = 'dashboard';
  document.querySelectorAll('.tab-panel').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('[data-tab]').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  TAB_LOADERS[name]();
  history.replaceState(null, '', `#${name}`);
}

document.querySelectorAll('[data-tab]').forEach(btn =>
  btn.addEventListener('click', () => showTab(btn.dataset.tab))
);

showTab(location.hash.slice(1) || 'dashboard');


// ── Dashboard ─────────────────────────────────────────────────────────────────

async function loadDashboard() {
  const el = document.getElementById('tab-dashboard');
  try {
    const d = await api.get('/api/dashboard');

    const moneyPct = d.money.budget > 0
      ? Math.min(d.money.spent / d.money.budget * 100, 100) : 0;
    const packPct = d.packing.total > 0
      ? Math.round(d.packing.packed / d.packing.total * 100) : 0;

    let nextHtml;
    if (d.next_event) {
      const days = daysUntil(d.next_event.event_date);
      nextHtml = `
        <div class="countdown-big">${days >= 0 ? days : '—'}</div>
        <div class="countdown-label">${cdLabel(days)}</div>
        <div style="margin-top:10px;font-weight:600">${esc(d.next_event.name)}</div>
        <div style="font-size:13px;color:var(--muted)">${fmtDate(d.next_event.event_date)}</div>`;
    } else {
      nextHtml = `<div class="empty-state" style="padding:8px 0">No upcoming events</div>`;
    }

    el.innerHTML = `
      <div class="section-header"><h2>Dashboard</h2></div>
      <div class="dash-grid">

        <div class="card">
          <div class="card-title">Next Event</div>
          ${nextHtml}
        </div>

        <div class="card">
          <div class="card-title">Budget</div>
          <div class="stat-value" style="color:${moneyPct > 90 ? 'var(--danger)' : 'inherit'}">
            £${d.money.spent.toFixed(2)}
          </div>
          <div class="stat-sub">of £${d.money.budget.toFixed(2)} budgeted</div>
          <div style="margin-top:14px">
            <div class="progress-bar">
              <div class="pbar-fill ${pbarClass(moneyPct)}" style="width:${moneyPct}%"></div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Fitness</div>
          <div class="stat-value">${d.fitness.this_week}</div>
          <div class="stat-sub">sessions this week · ${d.fitness.total} total</div>
        </div>

        <div class="card">
          <div class="card-title">Packing</div>
          <div class="stat-value">
            ${d.packing.packed}
            <span style="font-size:20px;color:var(--muted)"> / ${d.packing.total}</span>
          </div>
          <div class="stat-sub">items packed (${packPct}%)</div>
          <div style="margin-top:14px">
            <div class="progress-bar">
              <div class="pbar-fill pbar-green" style="width:${packPct}%"></div>
            </div>
          </div>
        </div>

      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load — ${esc(err.message)}</div>`;
  }
}


// ── Roster Countdown ──────────────────────────────────────────────────────────

async function loadRoster() {
  const el = document.getElementById('tab-roster');
  try {
    const events = await api.get('/api/events');

    const nextId = events.find(ev => daysUntil(ev.event_date) >= 0)?.id;

    const evHtml = events.length
      ? events.map(ev => {
          const days = daysUntil(ev.event_date);
          return `
            <div class="event-card${ev.id === nextId ? ' is-next' : ''}" id="ev-${ev.id}">
              <div class="event-card-top">
                <div>
                  <div class="event-name">${esc(ev.name)}</div>
                  <div class="event-date-sub">${fmtDate(ev.event_date)}</div>
                  ${ev.description ? `<div class="event-desc">${esc(ev.description)}</div>` : ''}
                </div>
                <div class="event-right">
                  <div>
                    <div class="event-cd-num">${days >= 0 ? days : '—'}</div>
                    <div class="event-cd-label">${cdLabel(days)}</div>
                  </div>
                  <button class="btn btn-ghost btn-sm" onclick="toggleRoster(${ev.id})">
                    Roster&nbsp;(${ev.roster_confirmed}/${ev.roster_total})
                  </button>
                  <button class="btn btn-danger btn-xs" onclick="deleteEvent(${ev.id})">✕</button>
                </div>
              </div>
              <div id="roster-body-${ev.id}" style="display:none"></div>
            </div>`;
        }).join('')
      : `<div class="empty-state">No events yet — add one below.</div>`;

    el.innerHTML = `
      <div class="section-header"><h2>Roster Countdown</h2></div>
      <div class="event-list">${evHtml}</div>
      <hr class="divider">
      <div class="card" style="max-width:540px">
        <div class="card-title" style="margin-bottom:12px">Add Event</div>
        <div class="form-row">
          <input id="ev-name" placeholder="Event name" style="flex:1;min-width:160px">
          <input id="ev-date" type="date" style="width:160px">
        </div>
        <div class="form-row">
          <input id="ev-desc" placeholder="Description (optional)" style="flex:1">
          <button class="btn btn-primary" onclick="addEvent()">Add Event</button>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load — ${esc(err.message)}</div>`;
  }
}

async function toggleRoster(eventId) {
  const body = document.getElementById(`roster-body-${eventId}`);
  if (body.style.display !== 'none') {
    body.style.display = 'none';
    return;
  }
  body.style.display = 'block';
  await renderRosterBody(eventId);
}

async function renderRosterBody(eventId) {
  const body = document.getElementById(`roster-body-${eventId}`);
  const members = await api.get(`/api/events/${eventId}/roster`);

  const listHtml = members.length
    ? members.map(m => `
        <div class="roster-member">
          <input type="checkbox" ${m.confirmed ? 'checked' : ''}
            onchange="toggleConfirmed(${m.id}, this.checked)">
          <span class="roster-name">${esc(m.name)}</span>
          ${m.role ? `<span class="badge badge-blue">${esc(m.role)}</span>` : ''}
          <button class="btn btn-danger btn-xs" onclick="deleteRosterMember(${m.id},${eventId})">✕</button>
        </div>`).join('')
    : `<p style="font-size:13px;color:var(--muted);padding:8px 0">No members yet.</p>`;

  body.innerHTML = `
    <div class="roster-body">
      ${listHtml}
      <div class="form-row" style="margin-top:10px">
        <input id="rm-name-${eventId}" placeholder="Name" style="flex:1">
        <input id="rm-role-${eventId}" placeholder="Role" style="width:130px">
        <button class="btn btn-primary btn-sm" onclick="addRosterMember(${eventId})">Add</button>
      </div>
    </div>`;
}

async function addEvent() {
  const name = document.getElementById('ev-name').value.trim();
  const date = document.getElementById('ev-date').value;
  const desc = document.getElementById('ev-desc').value.trim();
  if (!name || !date) { toast('Name and date required', 'err'); return; }
  try {
    await api.post('/api/events', { name, event_date: date, description: desc });
    toast('Event added', 'ok');
    loadRoster();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function deleteEvent(id) {
  if (!confirm('Delete this event and its entire roster?')) return;
  try {
    await api.del(`/api/events/${id}`);
    toast('Event deleted');
    loadRoster();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function addRosterMember(eventId) {
  const name = document.getElementById(`rm-name-${eventId}`).value.trim();
  const role = document.getElementById(`rm-role-${eventId}`).value.trim();
  if (!name) { toast('Name required', 'err'); return; }
  try {
    await api.post(`/api/events/${eventId}/roster`, { name, role });
    await renderRosterBody(eventId);
    // Refresh count badge on button
    const events = await api.get('/api/events');
    const ev = events.find(e => e.id === eventId);
    if (ev) {
      const btn = document.querySelector(`#ev-${eventId} .btn-ghost`);
      if (btn) btn.textContent = `Roster (${ev.roster_confirmed}/${ev.roster_total})`;
    }
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function toggleConfirmed(memberId, confirmed) {
  try {
    await api.put(`/api/roster/${memberId}`, { confirmed: confirmed ? 1 : 0 });
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function deleteRosterMember(memberId, eventId) {
  try {
    await api.del(`/api/roster/${memberId}`);
    await renderRosterBody(eventId);
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}


// ── Money Tracker ─────────────────────────────────────────────────────────────

async function loadMoney() {
  const el = document.getElementById('tab-money');
  try {
    const [categories, expenses] = await Promise.all([
      api.get('/api/categories'),
      api.get('/api/expenses'),
    ]);

    const catSpend = categories.reduce((s, c) => s + c.spent, 0);
    const uncatSpend = expenses
      .filter(e => !e.category_id)
      .reduce((s, e) => s + e.amount, 0);
    const grandSpent  = catSpend + uncatSpend;
    const totalBudget = categories.reduce((s, c) => s + c.budget, 0);
    const overallPct  = totalBudget > 0 ? Math.min(grandSpent / totalBudget * 100, 100) : 0;

    const catOpts = categories.map(c =>
      `<option value="${c.id}">${esc(c.name)}</option>`).join('');

    el.innerHTML = `
      <div class="section-header"><h2>Money Tracker</h2></div>

      <div class="card" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <span class="card-title">Overall Budget</span>
          <span style="font-weight:700">£${grandSpent.toFixed(2)} / £${totalBudget.toFixed(2)}</span>
        </div>
        <div class="progress-bar" style="height:12px">
          <div class="pbar-fill ${pbarClass(overallPct)}" style="width:${overallPct}%"></div>
        </div>
      </div>

      <div class="cat-grid">
        ${categories.map(c => {
          const pct = c.budget > 0 ? Math.min(c.spent / c.budget * 100, 100) : 0;
          return `
            <div class="cat-card">
              <div class="cat-card-header">
                <span class="cat-name">${esc(c.name)}</span>
                <button class="btn btn-danger btn-xs" onclick="deleteCategory(${c.id})">✕</button>
              </div>
              <div class="cat-amount">£${c.spent.toFixed(2)} of £${c.budget.toFixed(2)}</div>
              <div class="progress-bar">
                <div class="pbar-fill ${pbarClass(pct)}" style="width:${pct}%"></div>
              </div>
            </div>`;
        }).join('') || `<p style="color:var(--muted);font-size:14px">No categories yet.</p>`}
      </div>

      <div class="form-grid-2">
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Add Category</div>
          <div class="form-row">
            <input id="cat-name" placeholder="Category name" style="flex:1">
            <input id="cat-budget" type="number" step="0.01" min="0" placeholder="Budget £" style="width:120px">
            <button class="btn btn-primary" onclick="addCategory()">Add</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Log Expense</div>
          <div class="form-row">
            <input id="exp-desc" placeholder="Description" style="flex:1">
            <input id="exp-amount" type="number" step="0.01" min="0" placeholder="£" style="width:90px">
          </div>
          <div class="form-row">
            <select id="exp-cat" style="flex:1">
              <option value="">No category</option>
              ${catOpts}
            </select>
            <input id="exp-date" type="date" style="width:155px">
            <button class="btn btn-primary" onclick="addExpense()">Add</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:12px">Expenses</div>
        ${expenses.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr>
                <th>Date</th><th>Description</th><th>Category</th><th>Amount</th><th></th>
              </tr></thead>
              <tbody>
                ${expenses.map(e => `
                  <tr>
                    <td>${fmtDate(e.date)}</td>
                    <td>${esc(e.description)}</td>
                    <td><span class="badge badge-gray">${esc(e.category_name)}</span></td>
                    <td>£${e.amount.toFixed(2)}</td>
                    <td><button class="btn btn-danger btn-xs" onclick="deleteExpense(${e.id})">✕</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="empty-state">No expenses logged yet.</div>`}
      </div>`;

    document.getElementById('exp-date').value = todayStr();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load — ${esc(err.message)}</div>`;
  }
}

async function addCategory() {
  const name   = document.getElementById('cat-name').value.trim();
  const budget = parseFloat(document.getElementById('cat-budget').value) || 0;
  if (!name) { toast('Category name required', 'err'); return; }
  try {
    await api.post('/api/categories', { name, budget });
    toast('Category added', 'ok');
    loadMoney();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function deleteCategory(id) {
  if (!confirm('Delete this category? Expenses will become uncategorized.')) return;
  try {
    await api.del(`/api/categories/${id}`);
    toast('Category deleted');
    loadMoney();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function addExpense() {
  const desc   = document.getElementById('exp-desc').value.trim();
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const catId  = document.getElementById('exp-cat').value;
  const date   = document.getElementById('exp-date').value;
  if (!desc || !amount || !date) { toast('Description, amount and date required', 'err'); return; }
  try {
    await api.post('/api/expenses', {
      description: desc,
      amount,
      category_id: catId ? parseInt(catId) : null,
      date,
    });
    toast('Expense logged', 'ok');
    loadMoney();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function deleteExpense(id) {
  try {
    await api.del(`/api/expenses/${id}`);
    toast('Expense deleted');
    loadMoney();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}


// ── Fitness Tracker ───────────────────────────────────────────────────────────

async function loadFitness() {
  const el = document.getElementById('tab-fitness');
  try {
    const workouts = await api.get('/api/workouts');

    const ws     = weekStart();
    const thisWk = workouts.filter(w => w.date >= ws).length;
    const totMin = workouts.reduce((s, w) => s + w.duration_min, 0);
    const types  = new Set(workouts.map(w => w.type)).size;

    el.innerHTML = `
      <div class="section-header"><h2>Fitness Tracker</h2></div>

      <div class="stats-row">
        <div class="stat-mini"><div class="stat-mini-val">${workouts.length}</div><div class="stat-mini-label">Total Sessions</div></div>
        <div class="stat-mini"><div class="stat-mini-val">${thisWk}</div><div class="stat-mini-label">This Week</div></div>
        <div class="stat-mini"><div class="stat-mini-val">${totMin}</div><div class="stat-mini-label">Total Minutes</div></div>
        <div class="stat-mini"><div class="stat-mini-val">${types}</div><div class="stat-mini-label">Activity Types</div></div>
      </div>

      <div class="card" style="max-width:600px;margin-bottom:20px">
        <div class="card-title" style="margin-bottom:12px">Log Workout</div>
        <div class="form-row">
          <input id="wo-date" type="date" style="width:155px">
          <select id="wo-type" style="flex:1">
            <option>Run</option><option>Lift</option><option>Swim</option>
            <option>Cycle</option><option>HIIT</option><option>Walk</option>
            <option>Yoga</option><option>Sport</option><option>Other</option>
          </select>
          <input id="wo-dur" type="number" min="0" placeholder="Duration (min)" style="width:150px">
        </div>
        <div class="form-row">
          <input id="wo-notes" placeholder="Notes (optional)" style="flex:1">
          <button class="btn btn-primary" onclick="addWorkout()">Log</button>
        </div>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:12px">Workout Log</div>
        ${workouts.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Type</th><th>Duration</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                ${workouts.map(w => `
                  <tr>
                    <td>${fmtDate(w.date)}</td>
                    <td><span class="badge badge-blue">${esc(w.type)}</span></td>
                    <td>${w.duration_min} min</td>
                    <td style="color:var(--muted)">${esc(w.notes) || '—'}</td>
                    <td><button class="btn btn-danger btn-xs" onclick="deleteWorkout(${w.id})">✕</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div class="empty-state">No workouts logged yet.</div>`}
      </div>`;

    document.getElementById('wo-date').value = todayStr();
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load — ${esc(err.message)}</div>`;
  }
}

async function addWorkout() {
  const date  = document.getElementById('wo-date').value;
  const type  = document.getElementById('wo-type').value;
  const dur   = parseInt(document.getElementById('wo-dur').value) || 0;
  const notes = document.getElementById('wo-notes').value.trim();
  if (!date) { toast('Date required', 'err'); return; }
  try {
    await api.post('/api/workouts', { date, type, duration_min: dur, notes });
    toast('Workout logged', 'ok');
    loadFitness();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function deleteWorkout(id) {
  try {
    await api.del(`/api/workouts/${id}`);
    toast('Workout deleted');
    loadFitness();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}


// ── Packing Checklist ─────────────────────────────────────────────────────────

async function loadPacking() {
  const el = document.getElementById('tab-packing');
  try {
    const items = await api.get('/api/checklist');

    const total  = items.length;
    const packed = items.filter(i => i.packed).length;
    const pct    = total > 0 ? Math.round(packed / total * 100) : 0;

    // Group by category
    const groups = {};
    items.forEach(item => {
      (groups[item.category] ??= []).push(item);
    });

    const groupHtml = Object.entries(groups).map(([cat, catItems]) => `
      <div class="checklist-section">
        <div class="checklist-cat-title">${esc(cat)}</div>
        ${catItems.map(item => `
          <div class="checklist-item">
            <input type="checkbox" ${item.packed ? 'checked' : ''}
              onchange="toggleItem(${item.id})">
            <span class="item-name${item.packed ? ' done' : ''}">${esc(item.name)}</span>
            <button class="btn btn-xs" style="background:transparent;color:var(--muted)"
              onclick="deleteItem(${item.id})">✕</button>
          </div>`).join('')}
      </div>`).join('');

    const existingCats = [...new Set(items.map(i => i.category))];
    const suggestions  = [...new Set([...existingCats,
      'Clothing','Toiletries','Electronics','Documents','Gear','Food','Other'])];

    el.innerHTML = `
      <div class="section-header">
        <h2>Packing Checklist</h2>
        ${total > 0 ? `<button class="btn btn-ghost btn-sm" onclick="clearChecklist()">Clear all</button>` : ''}
      </div>

      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
          <span class="card-title">Progress</span>
          <span style="font-weight:700">${packed} / ${total} packed &nbsp;(${pct}%)</span>
        </div>
        <div class="progress-bar" style="height:12px">
          <div class="pbar-fill pbar-green" style="width:${pct}%"></div>
        </div>
      </div>

      <div class="card" style="max-width:540px;margin-bottom:24px">
        <div class="card-title" style="margin-bottom:12px">Add Item</div>
        <div class="form-row">
          <input id="item-name" placeholder="Item name" style="flex:1">
          <input id="item-cat" placeholder="Category" style="width:150px" list="cat-list">
          <datalist id="cat-list">
            ${suggestions.map(c => `<option value="${esc(c)}">`).join('')}
          </datalist>
          <button class="btn btn-primary" onclick="addItem()">Add</button>
        </div>
      </div>

      ${total > 0 ? `<div class="card">${groupHtml}</div>`
                  : `<div class="empty-state">No items yet — add some above.</div>`}`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state">Failed to load — ${esc(err.message)}</div>`;
  }
}

async function toggleItem(id) {
  try {
    await api.put(`/api/checklist/${id}`, {});
    loadPacking();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function deleteItem(id) {
  try {
    await api.del(`/api/checklist/${id}`);
    loadPacking();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function addItem() {
  const name = document.getElementById('item-name').value.trim();
  const cat  = document.getElementById('item-cat').value.trim() || 'General';
  if (!name) { toast('Item name required', 'err'); return; }
  try {
    await api.post('/api/checklist', { name, category: cat });
    toast('Item added', 'ok');
    loadPacking();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}

async function clearChecklist() {
  if (!confirm('Remove all checklist items?')) return;
  try {
    await api.del('/api/checklist');
    toast('Checklist cleared');
    loadPacking();
  } catch (e) { toast(`Error: ${e.message}`, 'err'); }
}
