/**
 * FinanceOS — script.js
 * Gestion complète des finances mensuelles
 * localStorage + Chart.js + UI dynamique
 */

/* ══════════════════════════════════════════════════
   CONSTANTES & ÉTAT
══════════════════════════════════════════════════ */
const STORAGE_KEY = 'financeOS_data';

const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
];

let data = loadData();      // tableau de mois sauvegardés
let chartInstance = null;   // référence Chart.js
let editMode = 'new';       // 'new' | 'edit' | 'merge'
let editKey  = null;        // clé du mois en cours d'édition

/* ══════════════════════════════════════════════════
   INITIALISATION
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initSelectors();
  initForm();
  renderAll();
});

/** Affiche la date dans le header */
function initHeader() {
  const now = new Date();
  const options = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  document.getElementById('headerDate').textContent =
    now.toLocaleDateString('fr-FR', options).toUpperCase();
}

/** Peuple les <select> mois et année */
function initSelectors() {
  const selM = document.getElementById('selectMonth');
  const selY = document.getElementById('selectYear');

  MONTHS_FR.forEach((m, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = m;
    selM.appendChild(opt);
  });

  const now = new Date();
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === now.getFullYear()) opt.selected = true;
    selY.appendChild(opt);
  }

  // Sélectionne le mois courant par défaut
  selM.value = now.getMonth() + 1;
}

/** Branche tous les événements du formulaire */
function initForm() {
  document.getElementById('addIncomeBtn').addEventListener('click', () => addField('income'));
  document.getElementById('addExpenseBtn').addEventListener('click', () => addField('expense'));
  document.getElementById('saveMonthBtn').addEventListener('click', saveMonth);

  // Lignes initiales
  addField('income');
  addField('expense');

  // Modal
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
}

/* ══════════════════════════════════════════════════
   CHAMPS DYNAMIQUES
══════════════════════════════════════════════════ */

/**
 * Ajoute une ligne (libellé + montant) dans le formulaire
 * @param {'income'|'expense'} type
 */
function addField(type, prefillLabel = '', prefillAmount = '') {
  const container = document.getElementById(`${type}Fields`);
  const row = document.createElement('div');
  row.className = 'field-row';

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'form-control';
  labelInput.placeholder = type === 'income' ? 'ex : Salaire, Freelance…' : 'ex : Loyer, Courses…';

  const amountInput = document.createElement('input');
  amountInput.type = 'number';
  amountInput.className = 'form-control';
  amountInput.placeholder = '0.00';
  amountInput.min = '0';
  amountInput.step = '0.01';

  labelInput.value  = prefillLabel;
  amountInput.value = prefillAmount !== '' ? prefillAmount : '';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'btn-remove';
  removeBtn.innerHTML = '✕';
  removeBtn.title = 'Supprimer cette ligne';
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateRunning();
  });

  amountInput.addEventListener('input', updateRunning);

  row.appendChild(labelInput);
  row.appendChild(amountInput);
  row.appendChild(removeBtn);
  container.appendChild(row);

  labelInput.focus();
  updateRunning();
}

/** Affiche une ligne existante en lecture seule (mode merge) */
function addReadonlyField(containerId, label, amount) {
  const container = document.getElementById(containerId);
  const row = document.createElement('div');
  row.className = 'field-row field-row--readonly';
  row.innerHTML = `
    <input type="text"   class="form-control" value="${escapeHTML(label)}"  readonly tabindex="-1">
    <input type="number" class="form-control" value="${escapeHTML(String(amount))}" readonly tabindex="-1">
    <div class="readonly-badge" title="Entrée existante">🔒</div>
  `;
  container.appendChild(row);
}

/** Ajoute un séparateur visuel entre entrées existantes et nouvelles */
function addSeparator(containerId) {
  const container = document.getElementById(containerId);
  const sep = document.createElement('div');
  sep.className = 'fields-separator';
  sep.innerHTML = '<span>── nouvelles entrées ──</span>';
  container.appendChild(sep);
}

/** Recalcule et affiche les totaux en temps réel dans le formulaire */
function updateRunning() {
  const incomeTotal  = sumFields('incomeFields');
  const expenseTotal = sumFields('expenseFields');
  const balance      = incomeTotal - expenseTotal;

  document.getElementById('runningIncome').textContent  = formatEur(incomeTotal);
  document.getElementById('runningExpense').textContent = formatEur(expenseTotal);

  const balEl = document.getElementById('formBalance');
  balEl.textContent = formatEur(balance);
  balEl.classList.toggle('negative', balance < 0);
}

/** Somme les montants dans un conteneur de champs */
function sumFields(containerId) {
  // Ne sommer que les champs éditables (pas les readonly du mode merge)
  const rows = document.querySelectorAll(`#${containerId} .field-row:not(.field-row--readonly)`);
  let total = 0;
  rows.forEach(row => {
    const numInput = row.querySelector('input[type="number"]');
    if (numInput) total += parseFloat(numInput.value) || 0;
  });
  return total;
}

/* ══════════════════════════════════════════════════
   SAUVEGARDE D'UN MOIS
══════════════════════════════════════════════════ */
function saveMonth() {
  // En mode edit/merge, on utilise editKey pour garantir le bon mois
  let monthKey, monthIdx, year;
  if ((editMode === 'edit' || editMode === 'merge') && editKey) {
    monthKey = editKey;
    year     = parseInt(monthKey.split('-')[0]);
    monthIdx = parseInt(monthKey.split('-')[1]);
  } else {
    monthIdx = parseInt(document.getElementById('selectMonth').value);
    year     = parseInt(document.getElementById('selectYear').value);
    monthKey = `${year}-${String(monthIdx).padStart(2,'0')}`;
  }
  const existing = data.find(d => d.key === monthKey);

  // Si le mois existe et qu'on est en mode "new", on propose les options
  if (existing && editMode === 'new') {
    showModeChoice(monthKey);
    return;
  }

  const newIncomes  = collectFields('incomeFields');
  const newExpenses = collectFields('expenseFields');

  // En mode merge, on peut sauvegarder même sans nouvelles lignes
  // (les données existantes sont conservées)
  if (newIncomes.length === 0 && newExpenses.length === 0 && editMode !== 'merge') {
    showMsg('Ajoutez au moins un revenu ou une dépense.', 'error');
    return;
  }
  // En mode merge sans rien de nouveau, on prévient mais on continue
  if (newIncomes.length === 0 && newExpenses.length === 0 && editMode === 'merge') {
    showMsg('Aucune nouvelle entrée détectée — données inchangées.', 'error');
    return;
  }

  let finalIncomes, finalExpenses;

  if (editMode === 'merge' && existing) {
    // Mode COMPLÉTER : on additionne les nouvelles lignes aux anciennes
    finalIncomes  = [...existing.incomes,  ...newIncomes];
    finalExpenses = [...existing.expenses, ...newExpenses];
  } else {
    // Mode NOUVEAU ou MODIFIER : on remplace tout
    finalIncomes  = newIncomes;
    finalExpenses = newExpenses;
  }

  const totalIncome  = finalIncomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = finalExpenses.reduce((s, i) => s + i.amount, 0);

  const entry = {
    key:          monthKey,
    monthIdx,
    year,
    label:        `${MONTHS_FR[monthIdx - 1]} ${year}`,
    incomes:      finalIncomes,
    expenses:     finalExpenses,
    totalIncome,
    totalExpense,
    balance:      totalIncome - totalExpense,
    createdAt:    existing ? existing.createdAt : Date.now(),
    updatedAt:    Date.now()
  };

  // Remplace ou ajoute
  const idx = data.findIndex(d => d.key === monthKey);
  if (idx >= 0) data[idx] = entry;
  else data.push(entry);
  data.sort((a, b) => a.key.localeCompare(b.key));
  saveData();

  const action = editMode === 'merge' ? 'complété' : (editMode === 'edit' ? 'modifié' : 'enregistré');
  showMsg(`✓ ${entry.label} ${action} avec succès !`, 'success');
  resetForm();
  renderAll();
}

/**
 * Affiche une bannière dans le formulaire pour choisir le mode
 * quand le mois existe déjà
 */
function showModeChoice(key) {
  const entry = data.find(d => d.key === key);
  if (!entry) return;

  // Supprime une bannière existante
  document.getElementById('modeChoiceBanner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'modeChoiceBanner';
  banner.className = 'mode-banner';
  banner.innerHTML = `
    <p class="mode-banner__title">⚠ <strong>${entry.label}</strong> existe déjà. Que veux-tu faire ?</p>
    <div class="mode-banner__btns">
      <button class="mode-btn mode-btn--merge"  data-key="${key}">➕ Compléter <span>Ajouter ce qui manque</span></button>
      <button class="mode-btn mode-btn--edit"   data-key="${key}">✏ Modifier   <span>Réécrire entièrement</span></button>
      <button class="mode-btn mode-btn--cancel">✕ Annuler</button>
    </div>
  `;

  const saveBtn = document.getElementById('saveMonthBtn');
  saveBtn.parentNode.insertBefore(banner, saveBtn);

  banner.querySelector('.mode-btn--merge').addEventListener('click', () => {
    loadMonthIntoForm(key, 'merge');
    banner.remove();
  });
  banner.querySelector('.mode-btn--edit').addEventListener('click', () => {
    loadMonthIntoForm(key, 'edit');
    banner.remove();
  });
  banner.querySelector('.mode-btn--cancel').addEventListener('click', () => {
    banner.remove();
  });
}

/**
 * Charge un mois existant dans le formulaire pour édition ou complétion
 * @param {string} key  - clé du mois (ex: "2025-03")
 * @param {'edit'|'merge'} mode
 */
function loadMonthIntoForm(key, mode) {
  const entry = data.find(d => d.key === key);
  if (!entry) return;

  editMode = mode;
  editKey  = key;

  // Synchro des selects
  document.getElementById('selectMonth').value = entry.monthIdx;
  document.getElementById('selectYear').value  = entry.year;

  if (mode === 'edit') {
    // Recharge toutes les lignes existantes pour modification
    document.getElementById('incomeFields').innerHTML  = '';
    document.getElementById('expenseFields').innerHTML = '';
    entry.incomes.forEach(i  => addField('income',  i.label, i.amount));
    entry.expenses.forEach(e => addField('expense', e.label, e.amount));
  } else {
    // Mode merge : afficher les entrées existantes en lecture seule + champs vides pour ajout
    document.getElementById('incomeFields').innerHTML  = '';
    document.getElementById('expenseFields').innerHTML = '';

    // Entrées existantes (readonly)
    entry.incomes.forEach(i  => addReadonlyField('incomeFields',  i.label, i.amount));
    entry.expenses.forEach(e => addReadonlyField('expenseFields', e.label, e.amount));

    // Séparateur visuel si des entrées existent déjà
    if (entry.incomes.length > 0)  addSeparator('incomeFields');
    if (entry.expenses.length > 0) addSeparator('expenseFields');

    // Champs vides pour les nouvelles entrées
    addField('income');
    addField('expense');
  }

  updateRunning();
  updateFormHeader();

  // Scroll vers le formulaire
  document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Met à jour le titre + bouton du formulaire selon le mode */
function updateFormHeader() {
  const btn   = document.getElementById('saveMonthBtn');
  const title = document.querySelector('.form-section .card-title');

  if (editMode === 'edit') {
    btn.querySelector('span').textContent = 'Enregistrer les modifications';
    title.innerHTML = `<span class="accent-dot accent-dot--amber"></span>Modifier un mois`;
    btn.style.borderColor = 'rgba(255,184,48,0.5)';
    btn.style.color = 'var(--neon-amber)';
  } else if (editMode === 'merge') {
    btn.querySelector('span').textContent = 'Ajouter les entrées manquantes';
    title.innerHTML = `<span class="accent-dot accent-dot--purple"></span>Compléter un mois`;
    btn.style.borderColor = 'rgba(124,58,237,0.5)';
    btn.style.color = 'var(--neon-purple)';
  } else {
    btn.querySelector('span').textContent = 'Enregistrer le mois';
    title.innerHTML = `<span class="accent-dot"></span>Ajouter un mois`;
    btn.style.borderColor = '';
    btn.style.color = '';
  }
}

/** Extrait les paires {label, amount} d'un conteneur de champs */
function collectFields(containerId) {
  const rows    = document.querySelectorAll(`#${containerId} .field-row`);
  const results = [];
  rows.forEach(row => {
    // Ignorer les lignes readonly (entrées existantes en mode merge)
    if (row.classList.contains('field-row--readonly')) return;
    const inputs = row.querySelectorAll('input');
    const label  = inputs[0].value.trim() || '—';
    const amount = parseFloat(inputs[1].value) || 0;
    if (amount > 0 || inputs[0].value.trim() !== '') {
      results.push({ label, amount });
    }
  });
  return results;
}

/** Réinitialise le formulaire après sauvegarde */
function resetForm() {
  editMode = 'new';
  editKey  = null;
  document.getElementById('incomeFields').innerHTML  = '';
  document.getElementById('expenseFields').innerHTML = '';
  document.getElementById('modeChoiceBanner')?.remove();
  addField('income');
  addField('expense');
  updateRunning();
  updateFormHeader();
}

/* ══════════════════════════════════════════════════
   RENDU GLOBAL
══════════════════════════════════════════════════ */
function renderAll() {
  renderKPI();
  renderHistory();
  renderChart();
}

/** Met à jour les 4 KPI cards */
function renderKPI() {
  if (data.length === 0) {
    document.getElementById('kpiIncome').textContent  = '0 €';
    document.getElementById('kpiExpense').textContent = '0 €';
    document.getElementById('kpiBalance').textContent = '0 €';
    document.getElementById('kpiMonths').textContent  = '0';
    return;
  }
  const last = data[data.length - 1];
  document.getElementById('kpiIncome').textContent  = formatEur(last.totalIncome);
  document.getElementById('kpiExpense').textContent = formatEur(last.totalExpense);
  document.getElementById('kpiBalance').textContent = formatEur(last.balance);
  document.getElementById('kpiMonths').textContent  = data.length;
}

/** Génère la liste historique */
function renderHistory() {
  const list  = document.getElementById('historyList');
  const badge = document.getElementById('historyCount');
  badge.textContent = `${data.length} mois`;

  if (data.length === 0) {
    list.innerHTML = '<p class="empty-state">Aucun mois enregistré pour l\'instant.</p>';
    return;
  }

  list.innerHTML = '';
  [...data].reverse().forEach((entry, idx) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.style.animationDelay = `${idx * 0.05}s`;

    const balClass = entry.balance >= 0 ? 'positive' : 'negative';

    item.innerHTML = `
      <span class="history-item__name">${entry.label}</span>
      <span class="history-item__income">↑ ${formatEur(entry.totalIncome)}</span>
      <span class="history-item__expense">↓ ${formatEur(entry.totalExpense)}</span>
      <span class="history-item__balance ${balClass}">${formatEur(entry.balance)}</span>
      <div style="display:flex;gap:.4rem">
        <button class="btn-icon btn-icon--view"   title="Voir le détail"  data-key="${entry.key}">👁</button>
        <button class="btn-icon btn-icon--edit"   title="Modifier"        data-key="${entry.key}">✏</button>
        <button class="btn-icon btn-icon--merge"  title="Compléter"       data-key="${entry.key}">➕</button>
        <button class="btn-icon btn-icon--delete" title="Supprimer"       data-key="${entry.key}">✕</button>
      </div>
    `;

    list.appendChild(item);
  });

  list.querySelectorAll('.btn-icon--view').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.key));
  });
  list.querySelectorAll('.btn-icon--edit').forEach(btn => {
    btn.addEventListener('click', () => loadMonthIntoForm(btn.dataset.key, 'edit'));
  });
  list.querySelectorAll('.btn-icon--merge').forEach(btn => {
    btn.addEventListener('click', () => loadMonthIntoForm(btn.dataset.key, 'merge'));
  });
  list.querySelectorAll('.btn-icon--delete').forEach(btn => {
    btn.addEventListener('click', () => deleteMonth(btn.dataset.key));
  });
}

/* ══════════════════════════════════════════════════
   GRAPHIQUE CHART.JS
══════════════════════════════════════════════════ */
function renderChart() {
  const emptyMsg = document.getElementById('chartEmpty');
  const canvas   = document.getElementById('financeChart');

  if (data.length === 0) {
    emptyMsg.style.display = 'block';
    canvas.style.display   = 'none';
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    return;
  }

  emptyMsg.style.display = 'none';
  canvas.style.display   = 'block';

  const labels   = data.map(d => d.label);
  const incomes  = data.map(d => d.totalIncome);
  const expenses = data.map(d => d.totalExpense);
  const balances = data.map(d => d.balance);

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Revenus',
          data: incomes,
          backgroundColor: 'rgba(0,255,163,0.25)',
          borderColor: 'rgba(0,255,163,0.9)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Dépenses',
          data: expenses,
          backgroundColor: 'rgba(255,69,113,0.25)',
          borderColor: 'rgba(255,69,113,0.9)',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Solde',
          data: balances,
          type: 'line',
          borderColor: 'rgba(0,212,255,0.9)',
          backgroundColor: 'rgba(0,212,255,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: 'rgba(0,212,255,1)',
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#6b7fa3',
            font: { family: "'DM Sans'", size: 12 },
            boxWidth: 14, boxHeight: 14,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(6,11,20,0.92)',
          borderColor: 'rgba(0,212,255,0.3)',
          borderWidth: 1,
          titleColor: '#00d4ff',
          bodyColor: '#e2eaf6',
          padding: 12,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label} : ${formatEur(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: {
          grid:  { color: 'rgba(0,212,255,0.06)' },
          ticks: { color: '#6b7fa3', font: { family: "'DM Sans'", size: 11 } }
        },
        y: {
          grid:  { color: 'rgba(0,212,255,0.06)' },
          ticks: {
            color: '#6b7fa3',
            font: { family: "'DM Sans'", size: 11 },
            callback: v => formatEur(v)
          }
        }
      }
    }
  });
}

/* ══════════════════════════════════════════════════
   MODAL DÉTAIL
══════════════════════════════════════════════════ */
function openModal(key) {
  const entry = data.find(d => d.key === key);
  if (!entry) return;

  document.getElementById('modalTitle').textContent = entry.label;

  let html = '';

  html += `<div class="modal-section"><h3>↑ Revenus</h3>`;
  if (entry.incomes.length === 0) {
    html += `<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Aucun revenu.</p>`;
  } else {
    entry.incomes.forEach(i => {
      html += `<div class="modal-line">
        <span>${escapeHTML(i.label)}</span>
        <span style="color:var(--neon-teal)">${formatEur(i.amount)}</span>
      </div>`;
    });
  }
  html += `</div>`;

  html += `<div class="modal-section"><h3>↓ Dépenses</h3>`;
  if (entry.expenses.length === 0) {
    html += `<p style="color:var(--text-muted);font-size:.85rem;padding:.5rem 0">Aucune dépense.</p>`;
  } else {
    entry.expenses.forEach(e => {
      html += `<div class="modal-line">
        <span>${escapeHTML(e.label)}</span>
        <span style="color:var(--neon-red)">${formatEur(e.amount)}</span>
      </div>`;
    });
  }
  html += `</div>`;

  const balColor = entry.balance >= 0 ? 'var(--neon-blue)' : 'var(--neon-red)';
  html += `
    <div class="modal-total">
      <span>Total revenus</span>
      <strong style="color:var(--neon-teal)">${formatEur(entry.totalIncome)}</strong>
    </div>
    <div class="modal-total" style="margin-top:.6rem">
      <span>Total dépenses</span>
      <strong style="color:var(--neon-red)">${formatEur(entry.totalExpense)}</strong>
    </div>
    <div class="modal-total" style="margin-top:.6rem">
      <span>Solde restant</span>
      <strong style="color:${balColor}">${formatEur(entry.balance)}</strong>
    </div>
  `;

  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════
   SUPPRESSION D'UN MOIS
══════════════════════════════════════════════════ */
function deleteMonth(key) {
  const entry = data.find(d => d.key === key);
  if (!entry) return;
  if (!confirm(`Supprimer ${entry.label} ? Cette action est irréversible.`)) return;

  data = data.filter(d => d.key !== key);
  saveData();
  renderAll();
}

/* ══════════════════════════════════════════════════
   LOCALSTORAGE
══════════════════════════════════════════════════ */
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ══════════════════════════════════════════════════
   UTILITAIRES
══════════════════════════════════════════════════ */

/** Échappe les caractères HTML pour éviter les injections XSS */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Formate un nombre en euros */
function formatEur(val) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2
  }).format(val);
}

/** Affiche un message temporaire sous le formulaire */
function showMsg(msg, type = 'success') {
  const el = document.getElementById('formMsg');
  el.textContent = msg;
  el.className   = `form-msg ${type}`;
  setTimeout(() => { el.textContent = ''; el.className = 'form-msg'; }, 4000);
}
