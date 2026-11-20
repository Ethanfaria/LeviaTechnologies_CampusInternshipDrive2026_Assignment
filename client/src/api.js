const BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export const getToken = () => localStorage.getItem('token');

async function request(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {

  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),

  listProjects: () => request('/projects'),
  createProject: (body) => request('/projects', { method: 'POST', body }),
  getProject: (id) => request(`/projects/${id}`),
  updateProject: (id, body) => request(`/projects/${id}`, { method: 'PATCH', body }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  addTasks: (projectId, tasks) => request(`/projects/${projectId}/tasks`, { method: 'POST', body: { tasks } }),
  updateTask: (id, body) => request(`/tasks/${id}`, { method: 'PATCH', body }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),

  aiProposal: (projectId) => request('/ai/proposal', { method: 'POST', body: { projectId } }),
  aiTasks: (projectId) => request('/ai/tasks', { method: 'POST', body: { projectId } }),
};
