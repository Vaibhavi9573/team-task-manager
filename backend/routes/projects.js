import express from 'express';
import crypto from 'crypto';
import { isDatabaseOffline, query } from '../db.js';
import {
  getDemoProjectById,
  getDemoProjectMembers,
  getDemoProjectsForUser,
  getDemoTasksForProject,
  isDatabaseUnavailable,
  createDemoUser,
  findDemoUserByEmail,
  addDemoProjectMember,
  removeDemoProjectMember,
  createDemoProject
} from '../demoStore.js';

const router = express.Router();

// Create project
router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (isDatabaseOffline()) {
      const project = createDemoProject({ name, description, ownerId: userId });
      return res.status(201).json({ message: 'Project created in demo mode', project });
    }

    const result = await query(
      'INSERT INTO projects (name, description, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, userId]
    );

    const project = result.rows[0];

    // Add owner as member
    await query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [project.id, userId, 'admin']
    );

    res.status(201).json({ message: 'Project created', project });
  } catch (err) {
    next(err);
  }
});

// Get user's projects
router.get('/', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      return res.json({ projects: getDemoProjectsForUser() });
    }

    const userId = req.user.id;

    const result = await query(`
      SELECT DISTINCT p.* FROM projects p
      JOIN project_members pm ON p.id = pm.project_id
      WHERE pm.user_id = $1
      ORDER BY p.created_at DESC
    `, [userId]);

    res.json({ projects: result.rows });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.json({ projects: getDemoProjectsForUser() });
    }
    next(err);
  }
});

// Get project details
router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (isDatabaseOffline()) {
      const project = getDemoProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({ project, members: getDemoProjectMembers(projectId) });
    }

    const userId = req.user.id;

    // Check if user has access
    const accessCheck = await query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = result.rows[0];

    // Get team members
    const membersResult = await query(`
      SELECT u.id, u.name, u.email, pm.role FROM users u
      JOIN project_members pm ON u.id = pm.user_id
      WHERE pm.project_id = $1
    `, [projectId]);

    res.json({ project, members: membersResult.rows });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const project = getDemoProjectById(req.params.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      return res.json({ project, members: getDemoProjectMembers(req.params.projectId) });
    }
    next(err);
  }
});

// Update project
router.put('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, status } = req.body;
    if (isDatabaseOffline()) {
      return res.status(200).json({
        message: 'Project updated in demo mode',
        project: {
          ...getDemoProjectById(projectId),
          name: name || getDemoProjectById(projectId)?.name,
          description: description || getDemoProjectById(projectId)?.description,
          status: status || getDemoProjectById(projectId)?.status
        }
      });
    }

    const userId = req.user.id;

    // Check if user is admin
    const roleCheck = await query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can update project' });
    }

    const result = await query(
      'UPDATE projects SET name = COALESCE($1, name), description = COALESCE($2, description), status = COALESCE($3, status), updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, description, status, projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project updated', project: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// Add member to project
router.post('/:projectId/members', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { email, role } = req.body;
    const userId = req.user.id;

    if (isDatabaseOffline()) {
      // ensure demo user exists
      let existing = findDemoUserByEmail(email);
      let newMember = existing;
      if (!existing) {
        newMember = createDemoUser({ email, password: crypto.randomBytes(6).toString('hex'), name: email.split('@')[0] });
      }
      addDemoProjectMember(projectId, newMember.id);
      return res.status(201).json({ message: 'Member added to project (demo mode)', member: { id: newMember.id, email: newMember.email, name: newMember.name, role: role || 'member' } });
    }

    // Check if user is admin
    const roleCheck = await query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can add members' });
    }

    // Find user by email
    const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newMemberId = userResult.rows[0].id;

    // Add member
    const result = await query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING *',
      [projectId, newMemberId, role || 'member']
    );

    res.status(201).json({ message: 'Member added to project', member: result.rows[0] });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      // Fall back to demo mode
      let existing = findDemoUserByEmail(req.body.email);
      let newMember = existing;
      if (!existing) {
        newMember = createDemoUser({ email: req.body.email, password: crypto.randomBytes(6).toString('hex'), name: req.body.email.split('@')[0] });
      }
      addDemoProjectMember(req.params.projectId, newMember.id);
      return res.status(201).json({ message: 'Member added to project (demo mode)', member: { id: newMember.id, email: newMember.email, name: newMember.name, role: req.body.role || 'member' } });
    }
    next(err);
  }
});

// Get project statistics
router.get('/:projectId/stats', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (isDatabaseOffline()) {
      const tasks = getDemoTasksForProject(projectId);
      return res.json({
        stats: {
          total_tasks: tasks.length,
          todo_count: tasks.filter((t) => t.status === 'todo').length,
          in_progress_count: tasks.filter((t) => t.status === 'in_progress').length,
          done_count: tasks.filter((t) => t.status === 'done').length,
          overdue_count: tasks.filter((t) => t.status !== 'done' && new Date(t.due_date) < new Date()).length
        }
      });
    }

    const userId = req.user.id;

    // Check access
    const accessCheck = await query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count,
        SUM(CASE WHEN status = 'todo' AND due_date < CURRENT_DATE THEN 1 ELSE 0 END) as overdue_count
      FROM tasks WHERE project_id = $1
    `, [projectId]);

    res.json({ stats: statsResult.rows[0] });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const tasks = getDemoTasksForProject(req.params.projectId);
      return res.json({
        stats: {
          total_tasks: tasks.length,
          todo_count: tasks.filter((t) => t.status === 'todo').length,
          in_progress_count: tasks.filter((t) => t.status === 'in_progress').length,
          done_count: tasks.filter((t) => t.status === 'done').length,
          overdue_count: tasks.filter((t) => t.status !== 'done' && new Date(t.due_date) < new Date()).length
        }
      });
    }
    next(err);
  }
});

// Remove member from project
router.delete('/:projectId/members/:memberId', async (req, res, next) => {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.user.id;

    if (isDatabaseOffline()) {
      removeDemoProjectMember(projectId, memberId);
      return res.json({ message: 'Member removed (demo mode)' });
    }

    // Check if user is admin
    const roleCheck = await query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can remove members' });
    }

    await query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, memberId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      removeDemoProjectMember(req.params.projectId, req.params.memberId);
      return res.json({ message: 'Member removed (demo mode)' });
    }
    next(err);
  }
});

export default router;
