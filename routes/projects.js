const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { authenticate, requireProjectAdmin } = require('../middleware/auth');

// GET /api/projects — list all projects user is a member of
router.get('/', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, u.name as owner_name,
        COUNT(DISTINCT pm2.user_id) as member_count,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) as done_count
      FROM projects p
      JOIN users u ON u.id = p.owner_id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN project_members pm2 ON pm2.project_id = p.id
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id, u.name
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects — create a project
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );
    const project = rows[0];
    // Owner is automatically an admin member
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, req.user.id, 'admin']
    );
    await client.query('COMMIT');
    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

// GET /api/projects/:id — project detail with members and tasks
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows: [project] } = await pool.query(`
      SELECT p.*, u.name as owner_name
      FROM projects p JOIN users u ON u.id = p.owner_id
      WHERE p.id = $1
    `, [req.params.id]);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Check membership
    const { rows: membership } = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!membership.length && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { rows: members } = await pool.query(`
      SELECT u.id, u.name, u.email, u.role as system_role, pm.role as project_role, pm.joined_at
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1 ORDER BY pm.joined_at ASC
    `, [req.params.id]);

    const { rows: tasks } = await pool.query(`
      SELECT t.*, u.name as assignee_name, c.name as creator_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_id
      LEFT JOIN users c ON c.id = t.creator_id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [req.params.id]);

    res.json({ ...project, members, tasks, my_role: membership[0]?.role || 'admin' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/projects/:id — update project
router.put('/:id', authenticate, [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { rows: [project] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only project owner can update' });
    }

    const name = req.body.name || project.name;
    const description = req.body.description !== undefined ? req.body.description : project.description;
    const { rows } = await pool.query(
      'UPDATE projects SET name=$1, description=$2, updated_at=NOW() WHERE id=$3 RETURNING *',
      [name, description, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { rows: [project] } = await pool.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only project owner can delete' });
    }
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/projects/:id/members — add a member
router.post('/:id/members', authenticate, async (req, res) => {
  const { email, role = 'member' } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  try {
    // Must be project admin or owner
    const { rows: own } = await pool.query(
      'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!own.length || (own[0].role !== 'admin' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { rows: [user] } = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const existing = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id=$1 AND user_id=$2',
      [req.params.id, user.id]
    );
    if (existing.rows.length) return res.status(409).json({ message: 'User already a member' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [req.params.id, user.id, role]
    );
    res.status(201).json({ message: 'Member added', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/projects/:id/members/:userId — remove a member
router.delete('/:id/members/:userId', authenticate, async (req, res) => {
  try {
    const { rows: own } = await pool.query(
      'SELECT role FROM project_members WHERE project_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!own.length || (own[0].role !== 'admin' && req.user.role !== 'admin')) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    await pool.query(
      'DELETE FROM project_members WHERE project_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/projects/:id/users — list all users (for assigning tasks)
router.get('/:id/users', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, pm.role as project_role
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
    `, [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
