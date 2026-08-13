import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProject,
  getDashboardStats,
  getVisibleProjects,
  loadProjects,
  saveProjects,
  validateProject,
} from '../js/project-store.js';

test('validateProject requires title and description and rejects malformed links', () => {
  assert.deepEqual(validateProject({ title: '', description: '', url: 'example.com' }), {
    title: '프로젝트 제목을 입력해 주세요.',
    description: '프로젝트 설명을 입력해 주세요.',
    url: '링크는 http:// 또는 https://로 시작해야 합니다.',
  });
});

test('createProject normalizes a new project and records timestamps', () => {
  const project = createProject(
    {
      title: '대시보드',
      description: '관리 도구',
      techStack: 'HTML, CSS',
      status: '진행 중',
      url: '',
      accent: '#245d92',
    },
    '2026-08-13T12:00:00.000Z',
  );

  assert.equal(project.title, '대시보드');
  assert.deepEqual(project.techStack, ['HTML', 'CSS']);
  assert.equal(project.createdAt, '2026-08-13T12:00:00.000Z');
});

test('statistics and visible projects honor status, query, and sort', () => {
  const projects = [
    {
      id: '1',
      title: 'Alpha',
      description: 'React portfolio',
      techStack: ['React'],
      status: '완료',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: '2',
      title: 'Beta',
      description: 'Node service',
      techStack: ['Node.js'],
      status: '진행 중',
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-12T00:00:00.000Z',
    },
  ];

  assert.deepEqual(getDashboardStats(projects), {
    total: 2,
    active: 1,
    completedRate: 50,
    techCount: 2,
  });
  assert.equal(getVisibleProjects(projects, 'node', '진행 중', 'updated')[0].id, '2');
});

test('saveProjects and loadProjects round-trip the project list', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const projects = [
    {
      id: 'p1',
      title: '저장 테스트',
      description: '설명',
      techStack: [],
      status: '진행 중',
      url: '',
      accent: '#245d92',
      createdAt: '2026-08-13T00:00:00.000Z',
      updatedAt: '2026-08-13T00:00:00.000Z',
    },
  ];

  saveProjects(storage, projects);
  assert.deepEqual(loadProjects(storage), projects);
});
