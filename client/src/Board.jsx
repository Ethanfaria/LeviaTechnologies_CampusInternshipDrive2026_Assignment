import { useEffect, useState } from 'react';
import { api } from './api';
import ProjectPanel from './ProjectPanel.jsx';

const COLUMNS = [
  { key: 'lead', label: 'Leads' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const EMPTY_FORM = { title: '', client_name: '', brief: '' };

export default function Board({ onLogout }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const userName = localStorage.getItem('userName') || 'User';

  async function load() {
    try {
      const { projects } = await api.listProjects();
      setProjects(projects);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function createProject(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createProject(form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function move(project, direction) {
    const index = COLUMNS.findIndex((c) => c.key === project.status);
    const next = COLUMNS[index + direction];
    if (!next) return;
    try {
      await api.updateProject(project.id, { status: next.key });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const totalTasks = projects.reduce((sum, p) => sum + p.task_count, 0);
  const doneTasks = projects.reduce((sum, p) => sum + p.done_count, 0);

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand"><span className="logo">F</span>FreelanceFlow</div>
          <div className="user">
            <span className="avatar">{userName.charAt(0).toUpperCase()}</span>
            <span className="muted small">{userName}</span>
            <button className="btn btn-sm" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="page-head">
          <h2>Your pipeline</h2>
          {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)}>New project</button>}
        </div>


        <div className="stats">
          <div className="card stat"><span className="label">Projects</span><span className="value">{projects.length}</span></div>
          <div className="card stat"><span className="label">Active</span><span className="value">{projects.filter((p) => p.status === 'active').length}</span></div>
          <div className="card stat"><span className="label">Tasks done</span><span className="value">{doneTasks}/{totalTasks}</span></div>
        </div>

        {showForm && (
          <form className="card new-project" onSubmit={createProject}>
            <h3>New project</h3>
            <div className="row">
              <input placeholder="Project title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input placeholder="Client name" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} />
            </div>
            <textarea rows="4" placeholder="Paste the client's brief here. The AI uses this to draft proposals and tasks." value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} />
            <div className="form-actions">
              <button className="btn btn-primary">Add project</button>
              <button type="button" className="btn" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>Cancel</button>
            </div>
          </form>
        )}

        {error && <p className="error">{error}</p>}

        <div className="board">
          {COLUMNS.map((col) => {
            const items = projects.filter((p) => p.status === col.key);
            return (
              <div key={col.key} className="column">
                <div className="column-head">
                  <span className={`dot dot-${col.key}`} />
                  <h3>{col.label}</h3>
                  <span className="count">{items.length}</span>
                </div>

                {items.length === 0 && <div className="empty">No projects here yet</div>}

                {items.map((p) => {
                  const pct = p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
                  return (
                    <div key={p.id} className="card project" onClick={() => setSelectedId(p.id)}>
                      <span className="project-title">{p.title}</span>
                      <span className="muted small">{p.client_name || 'No client'}</span>
                      <div className="progress"><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
                      <div className="card-foot">
                        <span className="muted small">{p.done_count}/{p.task_count} tasks</span>
                        <div className="move" onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-sm" disabled={col.key === 'lead'} onClick={() => move(p, -1)}>Back</button>
                          <button className="btn btn-sm" disabled={col.key === 'completed'} onClick={() => move(p, 1)}>Next</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </main>

      {selectedId && (
        <ProjectPanel
          projectId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
