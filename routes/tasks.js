const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

const checkProjectAccess = async (projectId, userId, userRole) => {
  const { rows } = await pool.query(
    'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
    [projectId, userId]
  );
  return rows.length > 0 || userRole === 'admin';
};

// GET /api/projects/:projectId/tasks
router.get('/projects/:projectId/tasks', authenticate, async (req, res) => {
  const hasAccess = await checkProjectAccess(req.params.projectId, req.user.id, req.user.role);
  if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

  const { status, priority, assignee } = req.query;
  let query = `
    SELECT t.*, u.name as assignee_name, u.email as assignee_email, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.creator_id
    WHERE t.project_id = $1
  `;
  const params = [req.params.projectId];
  let i = 2;
  if (status) { query += ` AND t.status = $${i++}`; params.push(status); }
  if (priority) { query += ` AND t.priority = $${i++}`; params.push(priority); }
  if (assignee) { query += ` AND t.assignee_id = $${i++}`; params.push(assignee); }
  query += ' ORDER BY t.created_at DESC';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:projectId/tasks
router.post('/projects/:projectId/tasks', authenticate, [
  body('title').trim().notEmpty().withMessage('Task title required'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional().isISO8601().toDate(),
  body('assignee_id').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const hasAccess = await checkProjectAccess(req.params.projectId, req.user.id, req.user.role);
  if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

  const { title, description, status = 'todo', priority = 'medium', due_date, assignee_id } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, status, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [title, description || null, req.params.projectId, assignee_id || null, req.user.id, status, priority, due_date || null]
    );

    const { rows: [task] } = await pool.query(`
      SELECT t.*, u.name as assignee_name, c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.creator_id
      WHERE t.id = $1
    `, [rows[0].id]);

    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/tasks/:id
router.get('/tasks/:id', authenticate, async (req, res) => {
  try {
    const { rows: [task] } = await pool.query(`
      SELECT t.*, u.name as assignee_name, c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.creator_id
      WHERE t.id = $1
    `, [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await checkProjectAccess(task.project_id, req.user.id, req.user.role);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', authenticate, [
  body('title').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in_progress', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high']),
  body('due_date').optional({ nullable: true }).isISO8601(),
  body('assignee_id').optional({ nullable: true }).isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { rows: [task] } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await checkProjectAccess(task.project_id, req.user.id, req.user.role);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    const title = req.body.title ?? task.title;
    const description = req.body.description !== undefined ? req.body.description : task.description;
    const status = req.body.status ?? task.status;
    const priority = req.body.priority ?? task.priority;
    const due_date = req.body.due_date !== undefined ? req.body.due_date : task.due_date;
    const assignee_id = req.body.assignee_id !== undefined ? req.body.assignee_id : task.assignee_id;

    const { rows } = await pool.query(
      `UPDATE tasks SET title=$1, description=$2, status=$3, priority=$4, due_date=$5, assignee_id=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [title, description, status, priority, due_date, assignee_id, req.params.id]
    );

    const { rows: [updated] } = await pool.query(`
      SELECT t.*, u.name as assignee_name, c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.creator_id
      WHERE t.id = $1
    `, [rows[0].id]);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', authenticate, async (req, res) => {
  try {
    const { rows: [task] } = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const hasAccess = await checkProjectAccess(task.project_id, req.user.id, req.user.role);
    if (!hasAccess) return res.status(403).json({ message: 'Access denied' });

    // Only creator, project admin, or global admin can delete
    if (task.creator_id !== req.user.id && req.user.role !== 'admin') {
      const { rows: mem } = await pool.query(
        'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
        [task.project_id, req.user.id]
      );
      if (!mem.length || mem[0].role !== 'admin') {
        return res.status(403).json({ message: 'Only the task creator or project admin can delete this task' });
      }
    }

    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
