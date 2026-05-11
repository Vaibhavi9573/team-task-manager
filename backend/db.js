import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

let databaseOffline = false;

export function setDatabaseOffline(value) {
  databaseOffline = value;
}

export function isDatabaseOffline() {
  return databaseOffline;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function initializeDatabase() {
  try {
    // Test connection
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0].now);

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'member',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'todo',
        priority VARCHAR(50) DEFAULT 'medium',
        due_date DATE,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS task_comments (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        token VARCHAR(255) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
      CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
    `);

    if (process.env.SEED_DEMO_DATA === 'true') {
      const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
        const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
        return `${salt}:${derivedKey}`;
      };

      const adminHash = hashPassword('DemoAdmin@123');
      const memberHash = hashPassword('DemoMember@123');

      await pool.query(`
        INSERT INTO users (email, password, name, role)
        VALUES
          ('admin@teamtask.local', $1, 'Demo Admin', 'admin'),
          ('member@teamtask.local', $2, 'Demo Member', 'member')
        ON CONFLICT (email) DO NOTHING
      `, [adminHash, memberHash]);

      const adminUser = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@teamtask.local']);
      const memberUser = await pool.query('SELECT id FROM users WHERE email = $1', ['member@teamtask.local']);

      if (adminUser.rows[0] && memberUser.rows[0]) {
        const adminId = adminUser.rows[0].id;
        const memberId = memberUser.rows[0].id;

        const existingProject = await pool.query('SELECT id FROM projects WHERE name = $1 LIMIT 1', ['Q2 Product Launch']);
        let projectId = existingProject.rows[0]?.id;

        if (!projectId) {
          const projectResult = await pool.query(`
            INSERT INTO projects (name, description, owner_id, status)
            VALUES ('Q2 Product Launch', 'Demo project for admin portal metrics and team activity', $1, 'active')
            RETURNING id
          `, [adminId]);
          projectId = projectResult.rows[0]?.id;
        }

        if (projectId) {
          await pool.query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [projectId, adminId, 'admin']
          );
          await pool.query(
            'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [projectId, memberId, 'member']
          );

          const existingTasks = await pool.query('SELECT id FROM tasks WHERE project_id = $1 LIMIT 1', [projectId]);
          if (existingTasks.rows.length === 0) {
            await pool.query(`
              INSERT INTO tasks (title, description, project_id, assigned_to, status, priority, due_date, created_by)
              VALUES
                ('Prepare launch timeline', 'Draft milestone plan and publish to the team', $1, $2, 'done', 'high', CURRENT_DATE - INTERVAL '4 days', $3),
                ('Design campaign assets', 'Create social and email visuals for launch', $1, $2, 'in_progress', 'medium', CURRENT_DATE + INTERVAL '3 days', $3),
                ('Review landing page copy', 'Check the final website content before launch', $1, $2, 'todo', 'high', CURRENT_DATE + INTERVAL '1 day', $3)
            `, [projectId, memberId, adminId]);
          }
        }
      }
    }

    console.log('✓ Database tables initialized');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

export async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}
