import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import TaskModal from '../components/TaskModal'
import { format, isPast, parseISO } from 'date-fns'

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>
    {status === 'todo' ? '○ Todo' : status === 'in_progress' ? '◑ In Progress' : '● Done'}
  </span>
)

const PriorityBadge = ({ priority }) => (
  <span className={`badge badge-${priority}`}>
    {priority === 'high' ? '↑ High' : priority === 'medium' ? '→ Med' : '↓ Low'}
  </span>
)

function TaskCard({ task, onClick, onDelete, canDelete }) {
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'
  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
        <div className="task-title" style={{ fontSize:'0.85rem' }}>{task.title}</div>
        {canDelete && (
          <button
            className="btn btn-danger btn-sm btn-icon"
            style={{ padding:'2px 6px', fontSize:'0.75rem', flexShrink:0 }}
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
            title="Delete task"
          >✕</button>
        )}
      </div>
      {task.description && (
        <p style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:4,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {task.description}
        </p>
      )}
      <div className="task-meta">
        <PriorityBadge priority={task.priority} />
        {task.assignee_name && (
          <span style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>👤 {task.assignee_name}</span>
        )}
        {task.due_date && (
          <span style={{ fontSize:'0.72rem', color: isOverdue ? 'var(--danger)' : 'var(--text-3)' }}>
            {isOverdue ? '🚨 ' : '📅 '}{format(parseISO(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
    </div>
  )
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await api.post(`/projects/${projectId}/members`, { email, role })
      onAdded(); onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">👥 Add Member</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">User email *</label>
              <input className="form-input" type="email" placeholder="team@example.com" autoFocus required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Project role</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : '+ Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('kanban')
  const [taskModal, setTaskModal] = useState(null) // null | 'new' | task obj
  const [memberModal, setMemberModal] = useState(false)
  const [filter, setFilter] = useState({ priority: '', assignee: '' })

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`)
      setProject(data)
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) navigate('/projects')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchProject() }, [id])

  const handleTaskSaved = (task, isEdit) => {
    setProject(prev => ({
      ...prev,
      tasks: isEdit
        ? prev.tasks.map(t => t.id === task.id ? task : t)
        : [task, ...prev.tasks]
    }))
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      setProject(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== taskId) }))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task')
    }
  }

  const handleDeleteProject = async () => {
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/projects/${id}`)
      navigate('/projects')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project')
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return
    try {
      await api.delete(`/projects/${id}/members/${userId}`)
      setProject(prev => ({ ...prev, members: prev.members.filter(m => m.id !== userId) }))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member')
    }
  }

  if (loading) return <div className="page"><div className="spinner-overlay"><div className="spinner" /></div></div>
  if (!project) return null

  const isProjectAdmin = project.my_role === 'admin' || isAdmin
  const isOwner = project.owner_id === user?.id

  const filteredTasks = project.tasks.filter(t => {
    if (filter.priority && t.priority !== filter.priority) return false
    if (filter.assignee && String(t.assignee_id) !== filter.assignee) return false
    return true
  })

  const byStatus = (status) => filteredTasks.filter(t => t.status === status)
  const totalDone = project.tasks.filter(t => t.status === 'done').length
  const progress = project.tasks.length ? Math.round((totalDone / project.tasks.length) * 100) : 0

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, fontSize:'0.85rem', color:'var(--text-3)' }}>
          <Link to="/projects" style={{ color:'var(--text-3)' }}>Projects</Link>
          <span>/</span>
          <span style={{ color:'var(--text)' }}>{project.name}</span>
        </div>

        <div className="page-header" style={{ alignItems:'flex-start' }}>
          <div style={{ flex:1 }}>
            <h1 className="page-title">{project.name}</h1>
            {project.description && <p className="page-subtitle" style={{ marginTop:4 }}>{project.description}</p>}
            <div style={{ display:'flex', gap:16, marginTop:10, fontSize:'0.8rem', color:'var(--text-3)' }}>
              <span>👤 {project.owner_name}</span>
              <span>👥 {project.members.length} members</span>
              <span>📋 {project.tasks.length} tasks</span>
              <span style={{ color: progress===100 ? 'var(--success)' : 'var(--text-3)' }}>✓ {progress}% done</span>
            </div>
            <div style={{ marginTop:12, maxWidth:300 }}>
              <div className="progress-bar">
                <div className="progress-fill green" style={{ width:`${progress}%` }} />
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            {isProjectAdmin && (
              <button className="btn btn-primary" onClick={() => setTaskModal('new')}>+ Task</button>
            )}
            {(isOwner || isAdmin) && (
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
        <select className="form-select" style={{ width:'auto', fontSize:'0.8rem', padding:'6px 10px' }}
          value={filter.priority} onChange={e => setFilter(p => ({ ...p, priority: e.target.value }))}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select className="form-select" style={{ width:'auto', fontSize:'0.8rem', padding:'6px 10px' }}
          value={filter.assignee} onChange={e => setFilter(p => ({ ...p, assignee: e.target.value }))}>
          <option value="">All assignees</option>
          {project.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {(filter.priority || filter.assignee) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ priority:'', assignee:'' })}>
            ✕ Clear filters
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['kanban','⊞ Kanban'],['list','≡ List'],['members','👥 Members']].map(([key, label]) => (
          <div key={key} className={`tab ${activeTab===key?'active':''}`} onClick={() => setActiveTab(key)}>
            {label}
          </div>
        ))}
      </div>

      {/* Kanban View */}
      {activeTab === 'kanban' && (
        <div className="kanban">
          {[
            { key:'todo', label:'Todo', color:'var(--text-2)' },
            { key:'in_progress', label:'In Progress', color:'var(--warning)' },
            { key:'done', label:'Done', color:'var(--success)' },
          ].map(({ key, label, color }) => (
            <div key={key} className="kanban-col">
              <div className="kanban-header">
                <span style={{ color }}>{label}</span>
                <span className="kanban-count">{byStatus(key).length}</span>
              </div>
              <div className="kanban-tasks">
                {byStatus(key).map(task => (
                  <TaskCard key={task.id} task={task}
                    onClick={t => isProjectAdmin && setTaskModal(t)}
                    onDelete={handleDeleteTask}
                    canDelete={isProjectAdmin || task.creator_id === user?.id}
                  />
                ))}
                {byStatus(key).length === 0 && (
                  <div style={{ textAlign:'center', color:'var(--text-3)', fontSize:'0.8rem', padding:'20px 0' }}>
                    No tasks
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {activeTab === 'list' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-text">No tasks</div>
              {isProjectAdmin && <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setTaskModal('new')}>Create first task</button>}
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assignee</th>
                    <th>Due Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map(task => {
                    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done'
                    return (
                      <tr key={task.id} onClick={() => isProjectAdmin && setTaskModal(task)}
                        style={{ cursor: isProjectAdmin ? 'pointer' : 'default' }}>
                        <td>
                          <div style={{ fontWeight:500 }}>{task.title}</div>
                          {task.description && <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{task.description.slice(0,60)}{task.description.length>60?'...':''}</div>}
                        </td>
                        <td><StatusBadge status={task.status} /></td>
                        <td><PriorityBadge priority={task.priority} /></td>
                        <td style={{ fontSize:'0.85rem', color:'var(--text-2)' }}>{task.assignee_name || '—'}</td>
                        <td style={{ fontSize:'0.82rem', color: isOverdue ? 'var(--danger)' : 'var(--text-2)' }}>
                          {task.due_date ? format(parseISO(task.due_date), 'MMM d, yyyy') : '—'}
                          {isOverdue && ' 🚨'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          {(isProjectAdmin || task.creator_id === user?.id) && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>✕</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3>Team Members ({project.members.length})</h3>
            {isProjectAdmin && (
              <button className="btn btn-primary btn-sm" onClick={() => setMemberModal(true)}>+ Add Member</button>
            )}
          </div>
          {project.members.map(member => (
            <div key={member.id} className="member-item">
              <div className="avatar avatar-sm">
                {member.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'0.875rem' }}>{member.name}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>{member.email}</div>
              </div>
              <span className={`role-badge ${member.project_role}`}>{member.project_role}</span>
              {member.system_role === 'admin' && (
                <span className="role-badge admin" style={{ marginLeft:4 }}>sys admin</span>
              )}
              {isProjectAdmin && member.id !== user?.id && member.id !== project.owner_id && (
                <button className="btn btn-ghost btn-sm" style={{ color:'var(--danger)' }}
                  onClick={() => handleRemoveMember(member.id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      {taskModal && (
        <TaskModal
          projectId={id}
          task={taskModal === 'new' ? null : taskModal}
          members={project.members}
          onClose={() => setTaskModal(null)}
          onSaved={handleTaskSaved}
        />
      )}

      {/* Add Member Modal */}
      {memberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setMemberModal(false)}
          onAdded={fetchProject}
        />
      )}
    </div>
  )
}
