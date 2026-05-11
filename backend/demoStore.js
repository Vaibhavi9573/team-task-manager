import crypto from 'crypto';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedPassword) {
  const [salt, storedHash] = storedPassword.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  const hashBuffer = Buffer.from(storedHash, 'hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');
  return hashBuffer.length === derivedBuffer.length && crypto.timingSafeEqual(hashBuffer, derivedBuffer);
}

const adminUser = {
  id: 1,
  email: process.env.ADMIN_EMAIL || 'admin@teamtask.local',
  password: hashPassword(process.env.ADMIN_PASSWORD || 'DemoAdmin@123'),
  name: 'Demo Admin',
  role: 'admin'
};

const memberUser = {
  id: 2,
  email: process.env.MEMBER_EMAIL || 'member@teamtask.local',
  password: hashPassword(process.env.MEMBER_PASSWORD || 'DemoMember@123'),
  name: 'Demo Member',
  role: 'member'
};

const project = {
  id: 1,
  name: 'Q2 Product Launch',
  description: 'Demo project for admin portal metrics and team activity',
  owner_id: adminUser.id,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const tasks = [
  {
    id: 1,
    title: 'Prepare launch timeline',
    description: 'Draft milestone plan and publish to the team',
    project_id: project.id,
    assigned_to: memberUser.id,
    status: 'done',
    priority: 'high',
    due_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: adminUser.id,
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Design campaign assets',
    description: 'Create social and email visuals for launch',
    project_id: project.id,
    assigned_to: memberUser.id,
    status: 'in_progress',
    priority: 'medium',
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: adminUser.id,
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    title: 'Review landing page copy',
    description: 'Check the final website content before launch',
    project_id: project.id,
    assigned_to: memberUser.id,
    status: 'todo',
    priority: 'high',
    due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: adminUser.id,
    updated_at: new Date().toISOString()
  }
];

const sessions = new Map();
const passwordResets = new Map();
const users = [adminUser, memberUser];
const projectMembers = new Map();
projectMembers.set(project.id, new Set([adminUser.id, memberUser.id]));
let nextProjectId = project.id + 1;
let nextTaskId = tasks.reduce((m, t) => Math.max(m, t.id), 0) + 1;

export function isDatabaseUnavailable(error) {
  return error?.code === 'ECONNREFUSED' || String(error?.message || '').includes('ECONNREFUSED');
}

export function findDemoUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === String(email).toLowerCase());
}

export function getDemoUserById(id) {
  return users.find((user) => user.id === Number(id));
}

export function createDemoUser({ email, password, name }) {
  const existing = findDemoUserByEmail(email);
  if (existing) {
    const error = new Error('Email already registered');
    error.status = 409;
    throw error;
  }

  const nextId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;
  const user = {
    id: nextId,
    email,
    password: hashPassword(password),
    name,
    role: 'member'
  };
  users.push(user);
  // by default add new member to demo project
  if (!projectMembers.has(project.id)) projectMembers.set(project.id, new Set());
  projectMembers.get(project.id).add(user.id);
  return user;
}

export function createDemoProject({ name, description, ownerId }) {
  const id = nextProjectId++;
  const newProject = {
    id,
    name,
    description: description || null,
    owner_id: ownerId,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  // set as current project replacement for demo (single project demo supports list)
  // push to simple storage by setting project variable (note: not exported mutable variable, but return created project)
  projectMembers.set(id, new Set([ownerId]));
  return newProject;
}

export function addDemoProjectMember(projectId, userId) {
  projectMembers.set(Number(projectId), projectMembers.get(Number(projectId)) || new Set());
  projectMembers.get(Number(projectId)).add(Number(userId));
}

export function removeDemoProjectMember(projectId, userId) {
  const set = projectMembers.get(Number(projectId));
  if (!set) return;
  set.delete(Number(userId));
}

export function addDemoTask({ title, description, projectId, assignedTo, priority, dueDate, createdBy }) {
  const task = {
    id: nextTaskId++,
    title,
    description: description || null,
    project_id: Number(projectId),
    assigned_to: assignedTo || null,
    status: 'todo',
    priority: priority || 'medium',
    due_date: dueDate || null,
    created_by: createdBy,
    updated_at: new Date().toISOString()
  };
  tasks.push(task);
  return task;
}

export function updateDemoTask(taskId, updates) {
  const idx = tasks.findIndex((t) => t.id === Number(taskId));
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...updates, updated_at: new Date().toISOString() };
  return tasks[idx];
}

export function deleteDemoTask(taskId) {
  const idx = tasks.findIndex((t) => t.id === Number(taskId));
  if (idx === -1) return false;
  tasks.splice(idx, 1);
  return true;
}

export function createDemoSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  sessions.set(token, { userId, expiresAt });
  return { token, expiresAt };
}

export function getDemoSession(token) {
  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) < new Date()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

export function deleteDemoSession(token) {
  sessions.delete(token);
}

export function verifyDemoPassword(email, password) {
  const user = findDemoUserByEmail(email);
  if (!user) {
    return null;
  }

  return verifyPassword(password, user.password) ? user : null;
}

export function createDemoReset(email) {
  const user = findDemoUserByEmail(email);
  if (!user) {
    return null;
  }

  const token = crypto.randomBytes(32).toString('hex');
  passwordResets.set(token, {
    userId: user.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    used: false
  });

  return token;
}

export function consumeDemoReset(token, password) {
  const reset = passwordResets.get(token);
  if (!reset || reset.used || new Date(reset.expiresAt) < new Date()) {
    return null;
  }

  const user = getDemoUserById(reset.userId);
  if (!user) {
    return null;
  }

  user.password = hashPassword(password);
  reset.used = true;
  sessions.forEach((session, sessionToken) => {
    if (session.userId === user.id) {
      sessions.delete(sessionToken);
    }
  });

  return user;
}

export function getDemoOverview() {
  const member = users.filter((user) => user.role === 'member');
  const assignedTasks = tasks.filter((task) => task.assigned_to);

  return {
    summary: {
      users: { total_users: users.length, admin_count: 1, member_count: member.length },
      projects: { total_projects: 1, active_projects: 1 },
      tasks: {
        total_tasks: tasks.length,
        todo_count: tasks.filter((task) => task.status === 'todo').length,
        in_progress_count: tasks.filter((task) => task.status === 'in_progress').length,
        done_count: tasks.filter((task) => task.status === 'done').length,
        overdue_count: tasks.filter((task) => task.status !== 'done' && new Date(task.due_date) < new Date()).length
      }
    },
    team_performance: users.map((user) => {
      const userTasks = assignedTasks.filter((task) => task.assigned_to === user.id);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        total_assigned: userTasks.length,
        completed: userTasks.filter((task) => task.status === 'done').length,
        in_progress: userTasks.filter((task) => task.status === 'in_progress').length,
        overdue: userTasks.filter((task) => task.status !== 'done' && new Date(task.due_date) < new Date()).length
      };
    }),
    recent_activity: tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      updated_at: task.updated_at,
      project_name: project.name,
      assigned_to_name: getDemoUserById(task.assigned_to)?.name || null
    }))
  };
}

export function getDemoProjectsForUser() {
  return [project];
}

export function getDemoProjectById(projectId) {
  if (Number(projectId) !== project.id) {
    return null;
  }

  return project;
}

export function getDemoProjectMembers(projectId) {
  if (Number(projectId) !== project.id) {
    return [];
  }

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  }));
}

export function getDemoTasksForProject(projectId) {
  if (Number(projectId) !== project.id) {
    return [];
  }

  return tasks;
}

export function getDemoMyTasks(userId) {
  return tasks
    .filter((task) => task.assigned_to === Number(userId))
    .map((task) => ({
      ...task,
      project_name: project.name,
      assigned_to_name: getDemoUserById(task.assigned_to)?.name || null
    }));
}

export function getDemoUserSummary(userId) {
  const user = getDemoUserById(userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    created_at: new Date().toISOString()
  };
}

export function getDemoAllUsers() {
  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  }));
}
