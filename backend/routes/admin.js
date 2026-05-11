import express from 'express';
import { isDatabaseOffline, query } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { getDemoOverview, isDatabaseUnavailable } from '../demoStore.js';

const router = express.Router();

router.use(requireRole(['admin']));

router.get('/overview', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      return res.json(getDemoOverview());
    }

    const [userStats, projectStats, taskStats, recentActivity, performance] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int as total_users,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END)::int as admin_count,
          SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END)::int as member_count
        FROM users
      `),
      query(`
        SELECT
          COUNT(*)::int as total_projects,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::int as active_projects
        FROM projects
      `),
      query(`
        SELECT
          COUNT(*)::int as total_tasks,
          SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END)::int as todo_count,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)::int as in_progress_count,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END)::int as done_count,
          SUM(CASE WHEN due_date < CURRENT_DATE AND status <> 'done' THEN 1 ELSE 0 END)::int as overdue_count
        FROM tasks
      `),
      query(`
        SELECT
          t.id,
          t.title,
          t.status,
          t.priority,
          t.updated_at,
          p.name as project_name,
          u.name as assigned_to_name
        FROM tasks t
        JOIN projects p ON p.id = t.project_id
        LEFT JOIN users u ON u.id = t.assigned_to
        ORDER BY t.updated_at DESC
        LIMIT 8
      `),
      query(`
        SELECT
          u.id,
          u.name,
          u.email,
          COUNT(t.id)::int as total_assigned,
          SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)::int as completed,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END)::int as in_progress,
          SUM(CASE WHEN t.due_date < CURRENT_DATE AND t.status <> 'done' THEN 1 ELSE 0 END)::int as overdue
        FROM users u
        LEFT JOIN tasks t ON t.assigned_to = u.id
        GROUP BY u.id, u.name, u.email
        ORDER BY completed DESC, total_assigned DESC
        LIMIT 10
      `)
    ]);

    res.json({
      summary: {
        users: userStats.rows[0],
        projects: projectStats.rows[0],
        tasks: taskStats.rows[0]
      },
      recent_activity: recentActivity.rows,
      team_performance: performance.rows
    });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.json(getDemoOverview());
    }
    next(err);
  }
});

router.get('/members', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      const demoOverview = getDemoOverview();
      return res.json({
        members: demoOverview.team_performance.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.id === 1 ? 'admin' : 'member',
          created_at: new Date().toISOString(),
          projects: member.total_assigned > 0 ? 1 : 0,
          assigned_tasks: member.total_assigned,
          completed_tasks: member.completed
        }))
      });
    }

    const result = await query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.created_at,
        COUNT(DISTINCT pm.project_id)::int as projects,
        COUNT(t.id)::int as assigned_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)::int as completed_tasks
      FROM users u
      LEFT JOIN project_members pm ON pm.user_id = u.id
      LEFT JOIN tasks t ON t.assigned_to = u.id
      GROUP BY u.id, u.name, u.email, u.role, u.created_at
      ORDER BY u.role DESC, u.name ASC
    `);

    res.json({ members: result.rows });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const demoOverview = getDemoOverview();
      return res.json({
        members: demoOverview.team_performance.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.id === 1 ? 'admin' : 'member',
          created_at: new Date().toISOString(),
          projects: member.total_assigned > 0 ? 1 : 0,
          assigned_tasks: member.total_assigned,
          completed_tasks: member.completed
        }))
      });
    }
    next(err);
  }
});

export default router;
