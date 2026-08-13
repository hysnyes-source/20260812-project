export const STORAGE_KEY = 'portfolio-dashboard-projects-v1';

export const SEED_PROJECTS = [
  {
    id: 'seed-sleep-sync',
    title: 'SleepSync AI 베개',
    description: '센서 데이터로 입면 상태를 추정하고 수면 환경을 제어하는 AI 웰니스 서비스 시제품입니다.',
    techStack: ['JavaScript', 'AI UX', 'IoT'],
    status: '진행 중',
    url: '',
    accent: '#315f8a',
    createdAt: '2026-08-12T10:30:00.000Z',
    updatedAt: '2026-08-13T07:45:00.000Z',
  },
  {
    id: 'seed-market-insight',
    title: 'Market Insight Console',
    description: '제품 지표와 고객 반응을 한눈에 분석하는 B2B 데이터 운영 콘솔입니다.',
    techStack: ['React', 'TypeScript', 'Chart.js'],
    status: '완료',
    url: 'https://github.com/',
    accent: '#214b74',
    createdAt: '2026-07-18T09:00:00.000Z',
    updatedAt: '2026-08-06T16:20:00.000Z',
  },
  {
    id: 'seed-campus-link',
    title: 'Campus Link',
    description: '학생과 교내 프로그램을 연결하는 맞춤형 공지·신청 플랫폼입니다.',
    techStack: ['Next.js', 'Supabase', 'Figma'],
    status: '진행 중',
    url: '',
    accent: '#4b617d',
    createdAt: '2026-07-25T08:15:00.000Z',
    updatedAt: '2026-08-11T14:05:00.000Z',
  },
  {
    id: 'seed-archive',
    title: 'Personal Archive',
    description: '읽은 글과 프로젝트 인사이트를 주제별로 모으는 개인 지식 관리 웹앱입니다.',
    techStack: ['HTML', 'CSS', 'LocalStorage'],
    status: '보류',
    url: '',
    accent: '#586b84',
    createdAt: '2026-06-21T11:00:00.000Z',
    updatedAt: '2026-07-28T18:40:00.000Z',
  },
];

function cloneSeedProjects() {
  return structuredClone(SEED_PROJECTS);
}

function normalizeTechStack(value = '') {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function validateProject({ title = '', description = '', url = '' }) {
  const errors = {};
  if (!String(title).trim()) errors.title = '프로젝트 제목을 입력해 주세요.';
  if (!String(description).trim()) errors.description = '프로젝트 설명을 입력해 주세요.';
  if (String(url).trim() && !/^https?:\/\//i.test(String(url).trim())) {
    errors.url = '링크는 http:// 또는 https://로 시작해야 합니다.';
  }
  return errors;
}

export function createProject(input, now = new Date().toISOString()) {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: String(input.title).trim(),
    description: String(input.description).trim(),
    techStack: normalizeTechStack(input.techStack),
    status: ['진행 중', '완료', '보류'].includes(input.status) ? input.status : '진행 중',
    url: String(input.url ?? '').trim(),
    accent: /^#[0-9a-f]{6}$/i.test(input.accent ?? '') ? input.accent : '#315f8a',
    createdAt: now,
    updatedAt: now,
  };
}

export function updateProject(project, input, now = new Date().toISOString()) {
  return {
    ...project,
    title: String(input.title).trim(),
    description: String(input.description).trim(),
    techStack: normalizeTechStack(input.techStack),
    status: ['진행 중', '완료', '보류'].includes(input.status) ? input.status : project.status,
    url: String(input.url ?? '').trim(),
    accent: /^#[0-9a-f]{6}$/i.test(input.accent ?? '') ? input.accent : project.accent,
    updatedAt: now,
  };
}

export function getDashboardStats(projects) {
  const total = projects.length;
  const active = projects.filter((project) => project.status === '진행 중').length;
  const completed = projects.filter((project) => project.status === '완료').length;
  const techCount = new Set(projects.flatMap((project) => project.techStack ?? [])).size;

  return {
    total,
    active,
    completedRate: total ? Math.round((completed / total) * 100) : 0,
    techCount,
  };
}

export function getVisibleProjects(projects, query = '', status = '전체', sort = 'updated') {
  const normalizedQuery = String(query).trim().toLocaleLowerCase('ko-KR');
  const filtered = projects.filter((project) => {
    const searchable = [project.title, project.description, ...(project.techStack ?? [])]
      .join(' ')
      .toLocaleLowerCase('ko-KR');
    return (status === '전체' || project.status === status) && (!normalizedQuery || searchable.includes(normalizedQuery));
  });

  return [...filtered].sort((left, right) => {
    if (sort === 'created') return new Date(right.createdAt) - new Date(left.createdAt);
    if (sort === 'title') return left.title.localeCompare(right.title, 'ko');
    return new Date(right.updatedAt) - new Date(left.updatedAt);
  });
}

export function loadProjects(storage) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved) return cloneSeedProjects();
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : cloneSeedProjects();
  } catch {
    return cloneSeedProjects();
  }
}

export function saveProjects(storage, projects) {
  storage.setItem(STORAGE_KEY, JSON.stringify(projects));
}
