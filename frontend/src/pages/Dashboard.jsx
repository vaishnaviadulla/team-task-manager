import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
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

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard')
      .then(({ data }) => setData(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><div className="spinner-overlay"><div className="spinner" /></div></div>

  const { stats, recentTasks, overdueTasks, myProjects } = data || {}

  const greeting = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your projects today</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card purple">
          <div className="stat-icon">📁</div>
          <div className="stat-value">{stats?.total_projects || 0}</div>
          <div className="stat-label">Projects</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">📋</div>
          <div className="stat-value">{stats?.my_tasks || 0}</div>
          <div className="stat-label">My Tasks</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-icon">⚡</div>
          <div className="stat-value">{stats?.my_in_progress || 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats?.my_done || 0}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card red">
          <div className="stat-icon">🚨</div>
          <div className="stat-value">{stats?.my_overdue || 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      <div className="two-col" style={{ gap: 24 }}>
        {/* Recent Tasks */}
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:'1rem', fontWeight:700 }}>Recent Activity</h2>
            <Link to="/projects" style={{ fontSize:'0.8rem' }}>View projects →</Link>
          </div>
          <div className="card" style={{ padding: 0, overflow:'hidden' }}>
            {recentTasks?.length ? (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Task</th>
                      <th>Status</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map(task => (
                      <tr key={task.id}>
                        <td>
                          <div style={{ fontWeight:500, fontSize:'0.85rem' }}>{task.title}</div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-3)' }}>
                            <Link to={`/projects/${task.project_id}`} style={{ color:'var(--text-3)' }}>
                              {task.project_name}
                            </Link>
                          </div>
                        </td>
                        <td><StatusBadge status={task.status} /></td>
                        <td><PriorityBadge priority={task.priority} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-icon">📋</div>
                <div className="empty-text">No tasks yet</div>
                <div className="empty-sub">Create a project to get started</div>
              </div>
            )}
          </div>
        </div>

        <div>
          {/* Overdue Tasks */}
          {overdueTasks?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize:'1rem', fontWeight:700, marginBottom:16, color:'var(--danger)' }}>
                🚨 Overdue Tasks ({overdueTasks.length})
              </h2>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {overdueTasks.map(task => (
                  <Link key={task.id} to={`/projects/${task.project_id}`} style={{ textDecoration:'none' }}>
                    <div className="task-card" style={{ borderColor:'rgba(239,68,68,0.3)' }}>
                      <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                        <span style={{ color:'var(--danger)', fontSize:'0.8rem', marginTop:2 }}>!</span>
                        <div>
                          <div className="task-title" style={{ fontSize:'0.85rem' }}>{task.title}</div>
                          <div style={{ fontSize:'0.75rem', color:'var(--danger)', marginTop:2 }}>
                            Due {format(parseISO(task.due_date), 'MMM d, yyyy')} · {task.project_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* My Projects Summary */}
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 style={{ fontSize:'1rem', fontWeight:700 }}>My Projects</h2>
              <Link to="/projects" style={{ fontSize:'0.8rem' }}>All projects →</Link>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {myProjects?.length ? myProjects.map(project => {
                const pct = project.task_count > 0 ? Math.round((project.done_count / project.task_count) * 100) : 0
                return (
                  <Link key={project.id} to={`/projects/${project.id}`} style={{ textDecoration:'none' }}>
                    <div className="card" style={{ padding:'14px 16px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                        <span style={{ fontWeight:600, fontSize:'0.875rem' }}>{project.name}</span>
                        <span style={{ fontSize:'0.75rem', color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>
                          {project.done_count}/{project.task_count}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill green" style={{ width:`${pct}%` }} />
                      </div>
                    </div>
                  </Link>
                )
              }) : (
                <div className="card">
                  <div className="empty-state" style={{ padding:'30px 0' }}>
                    <div className="empty-icon">📁</div>
                    <div className="empty-text">No projects yet</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
