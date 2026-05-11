import express from 'express';
import { isDatabaseOffline, query } from '../db.js';
import { getDemoMyTasks, getDemoProjectById, getDemoTasksForProject, isDatabaseUnavailable, addDemoTask, updateDemoTask, deleteDemoTask } from '../demoStore.js';

const router = express.Router();

// Create task
router.post('/', async (req, res, next) => {
  try {
    const { title, description, projectId, assignedTo, priority, dueDate } = req.body;
    if (isDatabaseOffline()) {
      const task = addDemoTask({ title, description, projectId, assignedTo, priority, dueDate, createdBy: req.user.id });
      return res.status(201).json({ message: 'Task created in demo mode', task });
    }

    const userId = req.user.id;

    if (!title || !projectId) {
      return res.status(400).json({ error: 'Title and projectId are required' });
    }

    // Check if user has access to project
    const accessCheck = await query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `INSERT INTO tasks (title, description, project_id, assigned_to, priority, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description || null, projectId, assignedTo || null, priority || 'medium', dueDate || null, userId]
    );

    res.status(201).json({ message: 'Task created', task: result.rows[0] });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.status(201).json({
        message: 'Task created in demo mode',
        task: {
          id: Date.now(),
          title: req.body.title,
          description: req.body.description || null,
          project_id: Number(req.body.projectId),
          assigned_to: req.body.assignedTo || null,
          status: 'todo',
          priority: req.body.priority || 'medium',
          due_date: req.body.dueDate || null,
          created_by: req.user.id
        }
      });
    }
    next(err);
  }
});

// Get project tasks
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    if (isDatabaseOffline()) {
      const project = getDemoProjectById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Access denied' });
      }

      return res.json({ tasks: getDemoTasksForProject(projectId) });
    }

    const { status, assignedTo } = req.query;
    const userId = req.user.id;

    // Check access
    const accessCheck = await query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let sql = 'SELECT * FROM tasks WHERE project_id = $1';
    const params = [projectId];

    if (status) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (assignedTo) {
      sql += ` AND assigned_to = $${params.length + 1}`;
      params.push(assignedTo);
    }

    sql += ' ORDER BY due_date ASC, priority DESC';

    const result = await query(sql, params);
    res.json({ tasks: result.rows });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const tasks = getDemoTasksForProject(req.params.projectId);
      return res.json({ tasks });
    }
    next(err);
  }
});

// Update task
router.put('/:taskId', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      const updated = updateDemoTask(req.params.taskId, req.body);
      if (!updated) return res.status(404).json({ error: 'Task not found' });
      return res.json({ message: 'Task updated in demo mode', task: updated });
    }

    const { taskId } = req.params;
    const { title, description, status, priority, assignedTo, dueDate } = req.body;
    const userId = req.user.id;

    // Get task
    const taskResult = await query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskResult.rows[0].project_id;

    // Check access
    const accessCheck = await query(
      'SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      `UPDATE tasks 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           status = COALESCE($3, status),
           priority = COALESCE($4, priority),
           assigned_to = COALESCE($5, assigned_to),
           due_date = COALESCE($6, due_date),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [title, description, status, priority, assignedTo, dueDate, taskId]
    );

    res.json({ message: 'Task updated', task: result.rows[0] });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.json({
        message: 'Task updated in demo mode',
        task: {
          id: Number(req.params.taskId),
          ...req.body
        }
      });
    }
    next(err);
  }
});

// Delete task
router.delete('/:taskId', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      const ok = deleteDemoTask(req.params.taskId);
      if (!ok) return res.status(404).json({ error: 'Task not found' });
      return res.json({ message: 'Task deleted in demo mode' });
    }

    const { taskId } = req.params;
    const userId = req.user.id;

    const taskResult = await query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const projectId = taskResult.rows[0].project_id;

    // Check if user is admin
    const roleCheck = await query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );

    if (roleCheck.rows.length === 0 || roleCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete tasks' });
    }

    await query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.json({ message: 'Task deleted in demo mode' });
    }
    next(err);
  }
});

// Get all tasks (for admin/member access)
router.get('/', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      // Return all demo tasks
      const tasks = [];
      for (const project of [getDemoProjectById(1)]) {
        if (project) {
          tasks.push(...getDemoTasksForProject(1));
        }
      }
      return res.json({ tasks });
    }

    const userId = req.user.id;

    // Get all tasks from projects where user is a member
    const tasksResult = await query(`
      SELECT t.*, p.name as project_name, u.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE p.id IN (
        SELECT project_id FROM project_members WHERE user_id = $1
      )
      ORDER BY t.due_date ASC, t.priority DESC
    `, [userId]);

    res.json({ tasks: tasksResult.rows });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      const tasks = [];
      for (const project of [getDemoProjectById(1)]) {
        if (project) {
          tasks.push(...getDemoTasksForProject(1));
        }
      }
      return res.json({ tasks });
    }
    next(err);
  }
});

// Get user's dashboard
router.get('/dashboard/my-tasks', async (req, res, next) => {
  try {
    if (isDatabaseOffline()) {
      return res.json({
        tasks: getDemoMyTasks(req.user.id),
        overdue_count: 1
      });
    }

    const userId = req.user.id;

    // Get assigned tasks
    const tasksResult = await query(`
      SELECT t.*, p.name as project_name, u.name as assigned_to_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.assigned_to = $1
      ORDER BY t.due_date ASC, t.priority DESC
    `, [userId]);

    // Get overdue tasks
    const overdueResult = await query(`
      SELECT COUNT(*) as count FROM tasks
      WHERE assigned_to = $1 AND status != 'done' AND due_date < CURRENT_DATE
    `, [userId]);

    res.json({
      tasks: tasksResult.rows,
      overdue_count: overdueResult.rows[0].count
    });
  } catch (err) {
    if (isDatabaseUnavailable(err)) {
      return res.json({
        tasks: getDemoMyTasks(req.user.id),
        overdue_count: 1
      });
    }
    next(err);
  }
});

export default router;
