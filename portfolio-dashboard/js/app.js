import {
  createProject,
  getDashboardStats,
  getVisibleProjects,
  loadProjects,
  saveProjects,
  updateProject,
  validateProject,
} from './project-store.js';

const elements = {
  statTotal: document.querySelector('#stat-total'),
  statTotalContext: document.querySelector('#stat-total-context'),
  statActive: document.querySelector('#stat-active'),
  statCompleted: document.querySelector('#stat-completed'),
  statTech: document.querySelector('#stat-tech'),
  focusProject: document.querySelector('#focus-project'),
  skillsList: document.querySelector('#skills-list'),
  projectCount: document.querySelector('#project-count'),
  projectGrid: document.querySelector('#project-grid'),
  recentProjects: document.querySelector('#recent-projects'),
  searchInput: document.querySelector('#search-input'),
  statusFilter: document.querySelector('#status-filter'),
  sortSelect: document.querySelector('#sort-select'),
  modal: document.querySelector('#project-modal'),
  form: document.querySelector('#project-form'),
  modalTitle: document.querySelector('#modal-title'),
  id: document.querySelector('#project-id'),
  title: document.querySelector('#project-title'),
  description: document.querySelector('#project-description'),
  techStack: document.querySelector('#project-tech'),
  status: document.querySelector('#project-status'),
  url: document.querySelector('#project-url'),
  accent: document.querySelector('#project-accent'),
  accentValue: document.querySelector('#accent-value'),
  toastRegion: document.querySelector('#toast-region'),
};

let projects = loadProjects(localStorage);
let lastFocusedElement = null;

function formatDate(iso) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(new Date(iso));
}

function getStatusClass(status) {
  return status === '완료' ? 'status-complete' : status === '보류' ? 'status-paused' : 'status-active';
}

function getStatusIcon(status) {
  return status === '완료' ? '✓' : status === '보류' ? 'Ⅱ' : '↗';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderStats() {
  const stats = getDashboardStats(projects);
  elements.statTotal.textContent = stats.total;
  elements.statTotalContext.textContent = `최근 30일 ${projects.filter((project) => Date.now() - new Date(project.createdAt).getTime() < 2_592_000_000).length}개 등록`;
  elements.statActive.textContent = stats.active;
  elements.statCompleted.textContent = `${stats.completedRate}%`;
  elements.statTech.textContent = stats.techCount;
}

function renderFocusProject() {
  const focus = getVisibleProjects(projects.filter((project) => project.status === '진행 중'), '', '전체', 'updated')[0] ?? projects[0];
  if (!focus) {
    elements.focusProject.innerHTML = '<div class="empty-state"><span class="empty-icon">◇</span><strong>첫 프로젝트를 등록해 보세요.</strong></div>';
    return;
  }

  const progress = focus.status === '완료' ? 100 : focus.status === '보류' ? 35 : 68;
  elements.focusProject.innerHTML = `
    <div class="focus-project-inner">
      <span class="focus-stripe" style="background:${escapeHtml(focus.accent)}"></span>
      <div>
        <span class="status-badge ${getStatusClass(focus.status)}">${escapeHtml(focus.status)}</span>
        <h3>${escapeHtml(focus.title)}</h3>
        <p>${escapeHtml(focus.description)}</p>
        <div class="focus-meta">${focus.techStack.slice(0, 4).map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join('')}</div>
      </div>
      <div class="progress-wrap"><div class="progress-label">자체 진행도</div><div class="progress-value">${progress}%</div><div class="progress-track"><div class="progress-bar" style="width:${progress}%; background:${escapeHtml(focus.accent)}"></div></div></div>
    </div>`;
}

function renderSkills() {
  const counts = new Map();
  projects.flatMap((project) => project.techStack ?? []).forEach((tech) => counts.set(tech, (counts.get(tech) ?? 0) + 1));
  const skills = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const max = Math.max(...skills.map(([, count]) => count), 1);

  elements.skillsList.innerHTML = skills.length
    ? skills.map(([name, count]) => `<div class="skill-row"><span class="skill-name">${escapeHtml(name)}</span><span class="skill-meter"><i style="width:${Math.round((count / max) * 100)}%"></i></span><span class="skill-value">${count}</span></div>`).join('')
    : '<p class="section-description">등록된 기술 스택이 없습니다.</p>';
}

function createProjectCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.style.setProperty('--accent', project.accent);
  const safeLink = project.url && /^https?:\/\//i.test(project.url);
  const demoLink = project.id === 'seed-sleep-sync'
    ? '<a class="card-action" href="../sleepsync-demo/index.html" aria-label="SleepSync 기술 데모 열기">▶</a>'
    : '';
  card.innerHTML = `
    <div class="project-card-top"><span class="project-mark">${getStatusIcon(project.status)}</span><span class="status-badge ${getStatusClass(project.status)}">${escapeHtml(project.status)}</span></div>
    <h3>${escapeHtml(project.title)}</h3>
    <p>${escapeHtml(project.description)}</p>
    <div class="tag-list">${project.techStack.slice(0, 3).map((tech) => `<span class="tag">${escapeHtml(tech)}</span>`).join('') || '<span class="tag">Stack 미입력</span>'}</div>
    <div class="project-card-footer"><span class="update-date">수정 ${formatDate(project.updatedAt)}</span><div class="card-actions">
      ${demoLink}
      ${safeLink ? `<a class="card-action" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(project.title)} 링크 열기">↗</a>` : ''}
      <button class="card-action" type="button" data-action="edit" data-id="${escapeHtml(project.id)}" aria-label="${escapeHtml(project.title)} 수정">✎</button>
      <button class="card-action delete" type="button" data-action="delete" data-id="${escapeHtml(project.id)}" aria-label="${escapeHtml(project.title)} 삭제">×</button>
    </div></div>`;
  return card;
}

function renderProjects() {
  const visibleProjects = getVisibleProjects(projects, elements.searchInput.value, elements.statusFilter.value, elements.sortSelect.value);
  elements.projectCount.textContent = `${visibleProjects.length}개의 프로젝트`;
  elements.projectGrid.replaceChildren();

  if (!visibleProjects.length) {
    elements.projectGrid.innerHTML = '<div class="empty-state"><span class="empty-icon">⌕</span><strong>조건에 맞는 프로젝트가 없습니다.</strong><p>검색어 또는 필터를 변경하거나 새 프로젝트를 등록해 보세요.</p><button class="button button-primary" type="button" data-action="create">새 프로젝트 등록</button></div>';
    return;
  }
  visibleProjects.forEach((project) => elements.projectGrid.append(createProjectCard(project)));
}

function renderRecentProjects() {
  const recent = getVisibleProjects(projects, '', '전체', 'updated').slice(0, 3);
  elements.recentProjects.innerHTML = recent.length
    ? recent.map((project) => `<article class="activity-item"><span class="activity-type">${escapeHtml(project.status === '완료' ? 'COMPLETED' : 'UPDATED')}</span><strong>${escapeHtml(project.title)}</strong><small>${formatDate(project.updatedAt)} · 프로젝트 정보 저장됨</small></article>`).join('')
    : '<p class="section-description">아직 기록된 활동이 없습니다.</p>';
}

function renderDashboard() {
  renderStats();
  renderFocusProject();
  renderSkills();
  renderProjects();
  renderRecentProjects();
}

function clearErrors() {
  document.querySelectorAll('.form-error').forEach((element) => { element.textContent = ''; });
}

function renderFormErrors(errors) {
  clearErrors();
  Object.entries(errors).forEach(([name, message]) => {
    const target = document.querySelector(`[data-error="${name}"]`);
    if (target) target.textContent = message;
  });
  const firstInvalid = Object.keys(errors)[0];
  document.querySelector(`#project-${firstInvalid}`)?.focus();
}

function openProjectModal(projectId = null) {
  lastFocusedElement = document.activeElement;
  clearErrors();
  const project = projects.find((item) => item.id === projectId);
  elements.form.reset();
  elements.id.value = project?.id ?? '';
  elements.modalTitle.textContent = project ? '프로젝트 수정' : '새 프로젝트 등록';
  elements.title.value = project?.title ?? '';
  elements.description.value = project?.description ?? '';
  elements.techStack.value = project?.techStack.join(', ') ?? '';
  elements.status.value = project?.status ?? '진행 중';
  elements.url.value = project?.url ?? '';
  elements.accent.value = project?.accent ?? '#315f8a';
  elements.accentValue.textContent = elements.accent.value.toUpperCase();
  elements.modal.hidden = false;
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => elements.title.focus(), 0);
}

function closeProjectModal() {
  elements.modal.hidden = true;
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  lastFocusedElement?.focus?.();
}

function showToast(message, variant = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${variant}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  window.setTimeout(() => toast.remove(), 3400);
}

function deleteProject(id) {
  const project = projects.find((item) => item.id === id);
  if (!project) return;
  if (!window.confirm(`“${project.title}” 프로젝트를 삭제할까요?\n이 작업은 현재 브라우저에서 되돌릴 수 없습니다.`)) return;
  projects = projects.filter((item) => item.id !== id);
  saveProjects(localStorage, projects);
  renderDashboard();
  showToast('프로젝트를 삭제했습니다.', 'warning');
}

function handleProjectAction(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const { action, id } = actionElement.dataset;
  if (action === 'create') openProjectModal();
  if (action === 'edit') openProjectModal(id);
  if (action === 'delete') deleteProject(id);
}

document.querySelector('#open-project-modal').addEventListener('click', () => openProjectModal());
document.querySelector('#secondary-open-project-modal').addEventListener('click', () => openProjectModal());
document.querySelector('#close-project-modal').addEventListener('click', closeProjectModal);
document.querySelector('#cancel-project-modal').addEventListener('click', closeProjectModal);
elements.modal.addEventListener('click', (event) => { if (event.target.closest('[data-close-modal]')) closeProjectModal(); });
elements.accent.addEventListener('input', () => { elements.accentValue.textContent = elements.accent.value.toUpperCase(); });
elements.searchInput.addEventListener('input', renderProjects);
elements.statusFilter.addEventListener('change', renderProjects);
elements.sortSelect.addEventListener('change', renderProjects);
elements.projectGrid.addEventListener('click', handleProjectAction);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.modal.hidden) closeProjectModal();
});

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(elements.form));
  const errors = validateProject(input);
  if (Object.keys(errors).length) {
    renderFormErrors(errors);
    return;
  }

  const editingId = input.id;
  if (editingId) {
    projects = projects.map((project) => project.id === editingId ? updateProject(project, input) : project);
  } else {
    projects = [createProject(input), ...projects];
  }
  saveProjects(localStorage, projects);
  closeProjectModal();
  renderDashboard();
  showToast(editingId ? '프로젝트를 수정했습니다.' : '새 프로젝트를 등록했습니다.');
});

renderDashboard();
