const router = require('express').Router();
const { pool } = require('../db');
const { authenticate } = require('../middleware/auth');

// GET /api/dashboard — overview stats for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { rows: taskStats } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE t.assignee_id = $1) as my_tasks,
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.status = 'todo') as my_todo,
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.status = 'in_progress') as my_in_progress,
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.status = 'done') as my_done,
        COUNT(*) FILTER (WHERE t.assignee_id = $1 AND t.due_date < NOW() AND t.status != 'done') as my_overdue
      FROM tasks t
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
    `, [userId]);

    const { rows: projectStats } = await pool.query(`
      SELECT COUNT(DISTINCT pm.project_id) as total_projects
      FROM project_members pm
      WHERE pm.user_id = $1
    `, [userId]);

    const { rows: recentTasks } = await pool.query(`
      SELECT t.id, t.title, t.status, t.priority, t.due_date, t.updated_at,
        p.name as project_name, p.id as project_id,
        u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
      LEFT JOIN users u ON u.id = t.assignee_id
      ORDER BY t.updated_at DESC
      LIMIT 8
    `, [userId]);

    const { rows: overdueTasks } = await pool.query(`
      SELECT t.id, t.title, t.status, t.priority, t.due_date,
        p.name as project_name, p.id as project_id,
        u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = $1
      LEFT JOIN users u ON u.id = t.assignee_id
      WHERE t.due_date < NOW() AND t.status != 'done'
      ORDER BY t.due_date ASC
      LIMIT 5
    `, [userId]);

    const { rows: myProjects } = await pool.query(`
      SELECT p.id, p.name,
        COUNT(DISTINCT t.id) as task_count,
        COUNT(DISTINCT CASE WHEN t.status='done' THEN t.id END) as done_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      stats: {
        ...taskStats[0],
        ...projectStats[0],
      },
      recentTasks,
      overdueTasks,
      myProjects,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
