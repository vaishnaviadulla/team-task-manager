const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!rows.length) return res.status(401).json({ message: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

const requireProjectAdmin = async (req, res, next) => {
  const { pool } = require('../db');
  const projectId = req.params.projectId || req.params.id;

  const { rows } = await pool.query(
    `SELECT pm.role, p.owner_id FROM project_members pm
     JOIN projects p ON p.id = pm.project_id
     WHERE pm.project_id = $1 AND pm.user_id = $2`,
    [projectId, req.user.id]
  );

  const isOwner = rows[0]?.owner_id === req.user.id;
  const isProjectAdmin = rows[0]?.role === 'admin';
  const isGlobalAdmin = req.user.role === 'admin';

  if (!isOwner && !isProjectAdmin && !isGlobalAdmin) {
    return res.status(403).json({ message: 'Project admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin, requireProjectAdmin };
