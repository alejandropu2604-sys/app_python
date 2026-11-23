/* ===== Estado global ===== */
const state = {
  filters: { status: 'all', priority: 'all' },
  searchTimer: null,
};

/* ===== API helpers ===== */
async function api(path, options = {}) {
  const defaults = { headers: { 'Content-Type': 'application/json' } };
  const res = await fetch(path, { ...defaults, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error inesperado');
  return data;
}

/* ===== Render ===== */
async function loadTasks() {
  const search = document.getElementById('search-input').value.trim();
  const params = new URLSearchParams({
    status: state.filters.status,
    priority: state.filters.priority,
    search,
  });

  const tasks = await api(`/api/tasks?${params}`);
  renderTasks(tasks);
  updateStats(tasks);
}

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  if (tasks.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = tasks.map(taskCard).join('');

  // Attach events
  list.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('change', () => toggleComplete(+cb.dataset.id, cb.checked));
  });
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(+btn.dataset.id));
  });
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(+btn.dataset.id));
  });
}

function taskCard(t) {
  const priorityLabel = { low: '🟢 Baja', medium: '🟡 Media', high: '🔴 Alta' }[t.priority];
  return `
    <div class="task-item priority-${t.priority} ${t.completed ? 'completed' : ''}" id="task-${t.id}">
      <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${t.completed ? 'checked' : ''} title="Marcar como ${t.completed ? 'pendiente' : 'completada'}" />
      <div class="task-body">
        <div class="task-title">${escHtml(t.title)}</div>
        ${t.description ? `<div class="task-desc">${escHtml(t.description)}</div>` : ''}
        <div class="task-meta">
          <span class="priority-badge ${t.priority}">${priorityLabel}</span>
          <span class="task-date">📅 ${t.created_at}</span>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon btn-edit" data-id="${t.id}" title="Editar">✏️</button>
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

/* ===== CRUD ===== */
async function createTask(e) {
  e.preventDefault();
  const title = document.getElementById('input-title').value.trim();
  const description = document.getElementById('input-description').value.trim();
  const priority = document.getElementById('input-priority').value;

  try {
    await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, priority }),
    });
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
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function deleteTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  try {
    await api(`/api/tasks/${id}`, { method: 'DELETE' });
    await loadTasks();
    showToast('Tarea eliminada', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveEdit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-description').value.trim();
  const priority = document.getElementById('edit-priority').value;

  try {
    await api(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description, priority }),
    });
    closeEditModal();
    await loadTasks();
    showToast('Tarea actualizada', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function clearCompleted() {
  const confirmed = confirm('¿Eliminar todas las tareas completadas?');
  if (!confirmed) return;
  try {
    await api('/api/tasks/clear-completed', { method: 'DELETE' });
    await loadTasks();
    showToast('Completadas eliminadas', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ===== Modal ===== */
async function openEditModal(id) {
  // Fetch fresh data for this task
  const tasks = await api('/api/tasks?status=all&priority=all');
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('edit-id').value = task.id;
  document.getElementById('edit-title').value = task.title;
  document.getElementById('edit-description').value = task.description;
  document.getElementById('edit-priority').value = task.priority;

  document.getElementById('edit-modal').classList.remove('hidden');
  document.getElementById('edit-title').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.add('hidden');
}

/* ===== Filters ===== */
function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.filter; // status | priority
      const value = btn.dataset.value;

      // Update active class within group
      document.querySelectorAll(`.filter-btn[data-filter="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.filters[group] = value;
      loadTasks();
    });
  });

  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadTasks, 300);
  });
}

/* ===== Toast ===== */
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2500);
}

/* ===== Utils ===== */
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('task-form').addEventListener('submit', createTask);
  document.getElementById('edit-form').addEventListener('submit', saveEdit);
  document.getElementById('modal-close').addEventListener('click', closeEditModal);
  document.getElementById('modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('btn-clear-completed').addEventListener('click', clearCompleted);

  document.getElementById('edit-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeEditModal();
  });

  setupFilters();
  loadTasks();
});
