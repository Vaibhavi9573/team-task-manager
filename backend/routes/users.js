import express from 'express';
import { isDatabaseOffline, query } from '../db.js';
import { getDemoUserById, getDemoUserSummary, isDatabaseUnavailable, getDemoAllUsers } from '../demoStore.js';

const router = express.Router();

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      const user = getDemoUserSummary(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user });
    }

    const result = await query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const user = getDemoUserSummary(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user });
    }
    next(err);
  }
});

// Get all users (for project assignment)
router.get('/', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      return res.json({ users: getDemoAllUsers() });
    }

    const result = await query(
      'SELECT id, email, name, role FROM users ORDER BY name ASC'
    );

    res.json({ users: result.rows });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.json({ users: getDemoAllUsers() });
    }
    next(err);
  }
});

export default router;
