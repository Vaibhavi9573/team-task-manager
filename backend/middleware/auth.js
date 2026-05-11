import { isDatabaseOffline, query } from '../db.js';
import { getDemoSession, getDemoUserById, isDatabaseUnavailable } from '../demoStore.js';

// Verify session token from `sessions` table
export async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No token provided' });

  if (isDatabaseOffline()) {
    const session = getDemoSession(token);
    if (!session) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const demoUser = getDemoUserById(session.userId);
    if (!demoUser) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: demoUser.id, role: demoUser.role };
    return next();
  }

  try {
    // Look up token in sessions table
    const result = await query('SELECT user_id, expires_at FROM sessions WHERE token = $1', [token]);
    if (result.rows.length === 0) return res.status(403).json({ error: 'Invalid or expired token' });

    const session = result.rows[0];
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      // Session expired - remove it
      await query('DELETE FROM sessions WHERE token = $1', [token]);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Attach minimal user info (user_id); route handlers can fetch more if needed
    req.user = { id: session.user_id };
    next();
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const session = getDemoSession(token);
      if (!session) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      const demoUser = getDemoUserById(session.userId);
      if (!demoUser) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }

      req.user = { id: demoUser.id, role: demoUser.role };
      return next();
    }
    console.error('verifyToken error', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export function requireRole(roles) {
  return async (req, res, next) => {
    // In demo mode, role should already be in req.user from verifyToken
    if (isDatabaseOffline()) {
      if (req.user?.role && roles.includes(req.user.role)) {
        return next();
      }
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    try {
      // Fetch user role from DB
      const result = await query('SELECT role FROM users WHERE id = $1', [req.user.id]);
      if (result.rows.length === 0) return res.status(403).json({ error: 'User not found' });
      const role = result.rows[0].role;
      if (!roles.includes(role)) return res.status(403).json({ error: 'Insufficient permissions' });
      req.user.role = role;
      next();
    } catch (err) {
      if (isDatabaseUnavailable(err)) {
        if (req.user?.role && roles.includes(req.user.role)) {
          return next();
        }
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      console.error('requireRole error', err);
      return res.status(500).json({ error: 'Server error' });
    }
  };
}

export function requireProjectAccess(req, res, next) {
  req.requireProjectAccess = true;
  next();
}
