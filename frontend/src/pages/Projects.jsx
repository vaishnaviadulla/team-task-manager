import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'

function ProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { data } = await api.post('/projects', form)
      onCreated(data); onClose()
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to create project')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📁 New Project</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Project name *</label>
              <input className="form-input" placeholder="e.g. Mobile App Redesign" autoFocus required
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="What is this project about?"
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '✓ Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectCard({ project }) {
  const pct = project.task_count > 0 ? Math.round((project.done_count / project.task_count) * 100) : 0

  return (
    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
      <div className="card" style={{ height: '100%', cursor:'pointer' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
            <h3 style={{ fontSize:'1rem', fontWeight:700, color:'var(--text)', lineHeight:1.3 }}>{project.name}</h3>
            <span style={{ fontSize:'1.2rem', flexShrink:0 }}>📁</span>
          </div>
          {project.description && (
            <p style={{ fontSize:'0.82rem', color:'var(--text-3)', marginTop:6, lineHeight:1.5,
              display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
              {project.description}
            </p>
          )}
        </div>

        <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:'0.8rem', color:'var(--text-3)' }}>
          <span>👥 {project.member_count} members</span>
          <span>📋 {project.task_count} tasks</span>
        </div>

        <div style={{ marginBottom:8 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'var(--text-3)', marginBottom:4 }}>
            <span>Progress</span>
            <span style={{ fontFamily:'var(--font-mono)', color: pct === 100 ? 'var(--success)' : 'var(--text-2)' }}>{pct}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill green" style={{ width:`${pct}%` }} />
          </div>
        </div>

        <div style={{ fontSize:'0.75rem', color:'var(--text-3)', display:'flex', justifyContent:'space-between', marginTop:8 }}>
          <span>By {project.owner_name}</span>
          <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </Link>
  )
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api.get('/projects')
      .then(({ data }) => setProjects(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="spinner-overlay"><div className="spinner" /></div></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're a member of</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <div className="empty-text">No projects yet</div>
          <div className="empty-sub">Create your first project to get started</div>
          <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {showModal && (
        <ProjectModal
          onClose={() => setShowModal(false)}
          onCreated={project => setProjects(prev => [project, ...prev])}
        />
      )}
    </div>
  )
}
