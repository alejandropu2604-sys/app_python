/* ═══════════════════════════════════════════════
   Estado global
═══════════════════════════════════════════════ */
const state = {
  filters: { status: 'all', priority: 'all', user: 'all' },
  searchTimer: null,
  users: [],       // caché de usuarios para los selects
};

const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6',
];

/* ═══════════════════════════════════════════════
   API helper
═══════════════════════════════════════════════ */
async function api(path, options = {}) {
  const defaults = { headers: { 'Content-Type': 'application/json' } };
  const res = await fetch(path, { ...defaults, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}

/* ═══════════════════════════════════════════════
   Tabs
═══════════════════════════════════════════════ */
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
    });
  });
}

/* ═══════════════════════════════════════════════
   Usuarios — render
═══════════════════════════════════════════════ */
async function loadUsers() {
  const users = await api('/api/users');
  state.users = users;
  renderUsers(users);
  refreshUserSelects();
  refreshUserFilterButtons();
}

function renderUsers(users) {
  const list   = document.getElementById('user-list');
  const empty  = document.getElementById('empty-users');

  if (users.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = users.map(userCard).join('');

  list.querySelectorAll('.btn-edit-user').forEach(btn =>
    btn.addEventListener('click', () => openEditUserModal(+btn.dataset.id)));
  list.querySelectorAll('.btn-delete-user').forEach(btn =>
    btn.addEventListener('click', () => deleteUser(+btn.dataset.id)));
  list.querySelectorAll('.btn-view-tasks').forEach(btn =>
    btn.addEventListener('click', () => viewUserTasks(+btn.dataset.id, btn.dataset.name)));
}

function userCard(u) {
  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `
    <div class="user-card" id="user-card-${u.id}">
      <div class="user-avatar" style="background:${u.color}">${initials}</div>
      <div class="user-info">
        <div class="user-name">${escHtml(u.name)}</div>
        <div class="user-email">${escHtml(u.email)}</div>
        <div class="user-task-stats">
          <span class="badge badge-total">${u.task_count} tarea${u.task_count !== 1 ? 's' : ''}</span>
          <span class="badge badge-pending">${u.pending_count} pendiente${u.pending_count !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="btn btn-sm btn-outline btn-view-tasks" data-id="${u.id}" data-name="${escHtml(u.name)}">Ver tareas</button>
        <button class="btn-icon btn-edit-user" data-id="${u.id}" title="Editar">✏️</button>
        <button class="btn-icon btn-delete-user" data-id="${u.id}" title="Eliminar">🗑️</button>
      </div>
    </div>
  `;
}

function viewUserTasks(userId, userName) {
  // Cambiar a la pestaña Tareas y filtrar por ese usuario
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
  document.querySelector('.tab-btn[data-tab="tasks"]').classList.add('active');
  document.getElementById('tab-tasks').classList.remove('hidden');

  state.filters.user = String(userId);
  refreshUserFilterButtons();
  loadTasks();
}

/* ═══════════════════════════════════════════════
   Usuarios — CRUD
═══════════════════════════════════════════════ */
async function createUser(e) {
  e.preventDefault();
  const name  = document.getElementById('input-user-name').value.trim();
  const email = document.getElementById('input-user-email').value.trim();
  const color = document.getElementById('input-user-color').value;

  try {
    await api('/api/users', { method: 'POST', body: JSON.stringify({ name, email, color }) });
    document.getElementById('user-form').reset();
    document.getElementById('input-user-color').value = '#6366f1';
    syncColorPresets('color-presets', 'input-user-color');
    await loadUsers();
    showToast('Usuario creado', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario? Sus tareas quedarán sin asignar.')) return;
  try {
    await api(`/api/users/${id}`, { method: 'DELETE' });
    await loadUsers();
    await loadTasks();
    showToast('Usuario eliminado', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveEditUser(e) {
  e.preventDefault();
  const id    = document.getElementById('edit-user-id').value;
  const name  = document.getElementById('edit-user-name').value.trim();
  const email = document.getElementById('edit-user-email').value.trim();
  const color = document.getElementById('edit-user-color').value;

  try {
    await api(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify({ name, email, color }) });
    closeEditUserModal();
    await loadUsers();
    await loadTasks();
    showToast('Usuario actualizado', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ═══════════════════════════════════════════════
   Modal editar usuario
═══════════════════════════════════════════════ */
function openEditUserModal(id) {
  const user = state.users.find(u => u.id === id);
  if (!user) return;

  document.getElementById('edit-user-id').value    = user.id;
  document.getElementById('edit-user-name').value  = user.name;
  document.getElementById('edit-user-email').value = user.email;
  document.getElementById('edit-user-color').value = user.color;
  syncColorPresets('edit-color-presets', 'edit-user-color', user.color);

  document.getElementById('edit-user-modal').classList.remove('hidden');
  document.getElementById('edit-user-name').focus();
}

function closeEditUserModal() {
  document.getElementById('edit-user-modal').classList.add('hidden');
}

/* ═══════════════════════════════════════════════
   Selects de usuario (crear / editar tarea)
═══════════════════════════════════════════════ */
function refreshUserSelects() {
  const opts = `<option value="">👤 Sin asignar</option>` +
    state.users.map(u => `<option value="${u.id}">${escHtml(u.name)}</option>`).join('');

  document.getElementById('input-user').innerHTML = opts;
  document.getElementById('edit-user').innerHTML  = opts;
}

function refreshUserFilterButtons() {
  const group = document.getElementById('user-filter-group');
  const buttons = [
    `<button class="filter-btn ${state.filters.user === 'all' ? 'active' : ''}" data-filter="user" data-value="all">👤 Todos</button>`,
    `<button class="filter-btn ${state.filters.user === 'unassigned' ? 'active' : ''}" data-filter="user" data-value="unassigned">Sin asignar</button>`,
    ...state.users.map(u => {
      const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const active   = state.filters.user === String(u.id) ? 'active' : '';
      return `<button class="filter-btn filter-btn--user ${active}" data-filter="user" data-value="${u.id}" style="--user-color:${u.color}">
        <span class="filter-avatar" style="background:${u.color}">${initials}</span>${escHtml(u.name)}
      </button>`;
    }),
  ];
  group.innerHTML = buttons.join('');

  group.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter="user"]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.user = btn.dataset.value;
      loadTasks();
    });
  });
}

/* ═══════════════════════════════════════════════
   Tareas — render
═══════════════════════════════════════════════ */
async function loadTasks() {
  const search = document.getElementById('search-input').value.trim();
  const params = new URLSearchParams({
    status:   state.filters.status,
    priority: state.filters.priority,
    user:     state.filters.user,
    search,
  });
  const tasks = await api(`/api/tasks?${params}`);
  renderTasks(tasks);
  updateStats(tasks);
}

function renderTasks(tasks) {
  const list  = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  if (tasks.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  list.innerHTML = tasks.map(taskCard).join('');

  list.querySelectorAll('.task-checkbox').forEach(cb =>
    cb.addEventListener('change', () => toggleComplete(+cb.dataset.id, cb.checked)));
  list.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(+btn.dataset.id)));
  list.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => deleteTask(+btn.dataset.id)));
}

function taskCard(t) {
  const priorityLabel = { low: '🟢 Baja', medium: '🟡 Media', high: '🔴 Alta' }[t.priority];
  let assigneeHtml = '';
  if (t.user_name) {
    const initials = t.user_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    assigneeHtml = `<span class="task-assignee">
      <span class="avatar-xs" style="background:${t.user_color}">${initials}</span>
      ${escHtml(t.user_name)}
    </span>`;
  } else {
    assigneeHtml = `<span class="task-assignee task-assignee--none">Sin asignar</span>`;
  }

  return `
    <div class="task-item priority-${t.priority} ${t.completed ? 'completed' : ''}" id="task-${t.id}">
      <input type="checkbox" class="task-checkbox" data-id="${t.id}"
        ${t.completed ? 'checked' : ''}
        title="Marcar como ${t.completed ? 'pendiente' : 'completada'}" />
      <div class="task-body">
        <div class="task-title">${escHtml(t.title)}</div>
        ${t.description ? `<div class="task-desc">${escHtml(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="priority-badge ${t.priority}">${priorityLabel}</span>
          ${assigneeHtml}
          <span class="task-date">📅 ${t.created_at}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon btn-edit"   data-id="${t.id}" title="Editar">✏️</button>
        <button class="btn-icon btn-delete" data-id="${t.id}" title="Eliminar">🗑️</button>
      </div>
    </div>
  `;
}

function updateStats(tasks) {
  const pending = tasks.filter(t => !t.completed).length;
  document.getElementById('stats-text').textContent =
    pending === 1 ? '1 tarea pendiente' : `${pending} tareas pendientes`;
}

/* ═══════════════════════════════════════════════
   Tareas — CRUD
═══════════════════════════════════════════════ */
async function createTask(e) {
  e.preventDefault();
  const title       = document.getElementById('input-title').value.trim();
  const description = document.getElementById('input-description').value.trim();
  const priority    = document.getElementById('input-priority').value;
  const user_id     = document.getElementById('input-user').value || null;

  try {
    await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, description, priority, user_id }) });
    document.getElementById('task-form').reset();
    document.getElementById('input-priority').value = 'medium';
    await loadTasks();
    showToast('Tarea creada', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleComplete(id, completed) {
  try {
    await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ completed }) });
    await loadTasks();
    await loadUsers(); // actualiza contadores
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
    await loadUsers();
    showToast('Tarea eliminada', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveEdit(e) {
  e.preventDefault();
  const id          = document.getElementById('edit-id').value;
  const title       = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-description').value.trim();
  const priority    = document.getElementById('edit-priority').value;
  const user_id     = document.getElementById('edit-user').value || null;

  try {
    await api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ title, description, priority, user_id }) });
    closeEditModal();
    await loadTasks();
    await loadUsers();
    showToast('Tarea actualizada', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function clearCompleted() {
  if (!confirm('¿Eliminar todas las tareas completadas?')) return;
  try {
    await api('/api/tasks/clear-completed', { method: 'DELETE' });
    await loadTasks();
    await loadUsers();
    showToast('Completadas eliminadas', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ═══════════════════════════════════════════════
   Modal editar tarea
═══════════════════════════════════════════════ */
async function openEditModal(id) {
  const tasks = await api('/api/tasks?status=all&priority=all&user=all');
  const task  = tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('edit-id').value          = task.id;
  document.getElementById('edit-title').value       = task.title;
  document.getElementById('edit-description').value = task.description;
  document.getElementById('edit-priority').value    = task.priority;
  document.getElementById('edit-user').value        = task.user_id ?? '';

  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-title').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

/* ═══════════════════════════════════════════════
   Filtros de tareas
═══════════════════════════════════════════════ */
function setupFilters() {
  document.querySelectorAll('.filter-btn[data-filter="status"], .filter-btn[data-filter="priority"]')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.filter;
        document.querySelectorAll(`.filter-btn[data-filter="${group}"]`).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters[group] = btn.dataset.value;
        loadTasks();
      });
    });

  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadTasks, 300);
  });
}

/* ═══════════════════════════════════════════════
   Color presets
═══════════════════════════════════════════════ */
function syncColorPresets(containerId, inputId, activeColor = null) {
  const container  = document.getElementById(containerId);
  const colorInput = document.getElementById(inputId);
  const current    = activeColor || colorInput.value;

  container.innerHTML = COLOR_PRESETS.map(c =>
    `<button type="button" class="color-dot ${c === current ? 'active' : ''}"
      data-color="${c}" style="background:${c}" title="${c}"></button>`
  ).join('');

  container.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      colorInput.value = dot.dataset.color;
      container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
    });
  });
}

/* ═══════════════════════════════════════════════
   Toast
═══════════════════════════════════════════════ */
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

/* ═══════════════════════════════════════════════
   Utilidades
═══════════════════════════════════════════════ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════
   Init
═══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
  // Tabs
  setupTabs();

  // Formularios
  document.getElementById('task-form').addEventListener('submit', createTask);
  document.getElementById('user-form').addEventListener('submit', createUser);
  document.getElementById('edit-form').addEventListener('submit', saveEdit);
  document.getElementById('edit-user-form').addEventListener('submit', saveEditUser);

  // Modales tarea
  document.getElementById('modal-close').addEventListener('click', closeEditModal);
  document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });

  // Modales usuario
  document.getElementById('edit-user-modal-close').addEventListener('click', closeEditUserModal);
  document.getElementById('edit-user-modal-cancel').addEventListener('click', closeEditUserModal);
  document.getElementById('edit-user-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditUserModal();
  });

  // Acciones globales
  document.getElementById('btn-clear-completed').addEventListener('click', clearCompleted);

  // Color presets iniciales
  syncColorPresets('color-presets', 'input-user-color');

  // Filtros estáticos
  setupFilters();

  // Cargar datos
  await loadUsers();   // también llama refreshUserSelects y refreshUserFilterButtons
  await loadTasks();
});
