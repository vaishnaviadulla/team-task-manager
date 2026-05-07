import { useState, useEffect } from 'react'
import api from '../api/client'

export default function TaskModal({ projectId, task, members, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    assignee_id: task?.assignee_id || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!task

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        due_date: form.due_date || null,
      }
      let res
      if (isEdit) {
        res = await api.put(`/tasks/${task.id}`, payload)
      } else {
        res = await api.post(`/projects/${projectId}/tasks`, payload)
      }
      onSaved(res.data, isEdit)
      onClose()
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Failed to save task')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? '✏️ Edit Task' : '+ New Task'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Task title *</label>
              <input className="form-input" placeholder="What needs to be done?" autoFocus required
                value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Add more details..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="todo">○ Todo</option>
                  <option value="in_progress">◑ In Progress</option>
                  <option value="done">● Done</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="low">↓ Low</option>
                  <option value="medium">→ Medium</option>
                  <option value="high">↑ High</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-select" value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members?.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due date</label>
                <input className="form-input" type="date"
                  value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? '✓ Update Task' : '✓ Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
