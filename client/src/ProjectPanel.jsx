import { useEffect, useState } from 'react';
import { api } from './api';

const STATUS_LABELS = { lead: 'Lead', active: 'Active', completed: 'Completed' };

export default function ProjectPanel({ projectId, onClose, onChanged }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [preview, setPreview] = useState(null); 
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await api.getProject(projectId);
      setProject(data.project);
      setTasks(data.tasks);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, [projectId]);

  async function addTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await api.addTasks(projectId, [{ title: newTask }]);
      setNewTask('');
      await load();
      onChanged();
    } catch (err) { setError(err.message); }
  }

  async function toggleTask(task) {
    try {
      await api.updateTask(task.id, { done: !task.done });
      await load();
      onChanged();
    } catch (err) { setError(err.message); }
  }

  async function removeTask(task) {
    try {
      await api.deleteTask(task.id);
      await load();
      onChanged();
    } catch (err) { setError(err.message); }
  }
  async function runAi(type) {
    setError('');
    setPreview(null);
    setAiBusy(true);
    try {
      const { result } = type === 'proposal' ? await api.aiProposal(projectId) : await api.aiTasks(projectId);
      setPreview({ type, data: result });
    } catch (err) {
      setError(err.message);
    } finally {
      setAiBusy(false);
    }
  }

  async function acceptPreview() {
    try {
      if (preview.type === 'proposal') {
        await api.updateProject(projectId, { proposal: preview.data });
      } else {
        await api.addTasks(projectId, preview.data.tasks.map((t) => ({ ...t, source: 'ai' })));
      }
      setPreview(null);
      await load();
      onChanged();
    } catch (err) { setError(err.message); }
  }

  async function deleteProject() {
    if (!window.confirm('Delete this project and its tasks?')) return;
    try {
      await api.deleteProject(projectId);
      onChanged();
      onClose();
    } catch (err) { setError(err.message); }
  }

  if (!project) return <div className="overlay"><div className="panel">Loading…</div></div>;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <div>
            <h2>{project.title}</h2>
            <div className="panel-meta">
              <span className={`pill pill-${project.status}`}>{STATUS_LABELS[project.status]}</span>
              <span className="muted small">{project.client_name || 'No client'}</span>
            </div>
          </div>
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className="section-title" style={{ marginTop: 0 }}>Client brief</div>
        <div className="card"><p className="brief">{project.brief || 'No brief yet.'}</p></div>

        <div className="ai-actions">
          <button className="btn btn-primary" disabled={aiBusy} onClick={() => runAi('proposal')}>Draft proposal</button>
          <button className="btn btn-primary" disabled={aiBusy} onClick={() => runAi('tasks')}>Suggest tasks</button>
          {aiBusy && <span className="muted small">Generating…</span>}
        </div>

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

        {preview && (
          <div className="card preview">
            <div className="preview-head">AI suggestion (preview)</div>
            {preview.type === 'proposal' ? (
              <ProposalView proposal={preview.data} />
            ) : (
              <ul className="proposal">
                {preview.data.tasks.map((t, i) => (
                  <li key={i}>{t.title} <span className="muted small">{t.estimate_hrs ? `~${t.estimate_hrs}h` : ''}</span></li>
                ))}
              </ul>
            )}
            <div className="preview-actions">
              <button className="btn btn-primary" onClick={acceptPreview}>Accept and save</button>
              <button className="btn" onClick={() => setPreview(null)}>Discard</button>
            </div>
          </div>
        )}

        {project.proposal && (
          <>
            <div className="section-title">Saved proposal</div>
            <div className="card"><ProposalView proposal={project.proposal} /></div>
          </>
        )}

        <div className="section-title">Tasks</div>
        <ul className="tasks">
          {tasks.map((t) => (
            <li key={t.id}>
              <label className={`task-label ${t.done ? 'done' : ''}`}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} />
                <span className="task-title">{t.title}</span>
                {t.source === 'ai' && <span className="badge">AI</span>}
                {t.estimate_hrs && <span className="muted small">~{t.estimate_hrs}h</span>}
              </label>
              <button className="btn btn-sm btn-danger" onClick={() => removeTask(t)}>Remove</button>
            </li>
          ))}
          {tasks.length === 0 && <li className="task-empty">No tasks yet.</li>}
        </ul>
        <form className="row" onSubmit={addTask}>
          <input placeholder="Add a task" value={newTask} onChange={(e) => setNewTask(e.target.value)} />
          <button className="btn">Add</button>
        </form>

        <div className="panel-footer">
          <button className="btn btn-danger" onClick={deleteProject}>Delete project</button>
        </div>
      </div>
    </div>
  );
}

function ProposalView({ proposal }) {
  return (
    <div className="proposal">
      <p>{proposal.summary}</p>
      <b>Deliverables</b>
      <ul>{proposal.deliverables.map((d, i) => <li key={i}>{d}</li>)}</ul>
      <p><b>Timeline:</b> {proposal.timeline}</p>
      <p style={{ marginBottom: 0 }}><b>Estimate:</b> {proposal.price_estimate}</p>
    </div>
  );
}
