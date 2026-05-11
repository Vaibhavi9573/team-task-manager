# Quick Setup & Testing Guide

## ⚡ Quick Local Setup (5 minutes)

### 1. Prerequisites Check
```bash
# Check Node.js version (must be 16+)
node --version

# Check npm
npm --version
```

### 2. Install All Dependencies
```bash
cd "Team Task Manager"
npm run install-all
```

### 3. Setup PostgreSQL

#### On Windows with PostgreSQL installed:
```bash
# Open PostgreSQL CLI
psql -U postgres

# Create database
CREATE DATABASE team_task_manager;
CREATE USER taskuser WITH PASSWORD 'taskpass123';
ALTER ROLE taskuser SET client_encoding TO 'utf8';
ALTER ROLE taskuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE taskuser SET default_transaction_deferrable TO on;
ALTER ROLE taskuser SET default_transaction_read_committed TO on;
GRANT ALL PRIVILEGES ON DATABASE team_task_manager TO taskuser;
\c team_task_manager
GRANT USAGE ON SCHEMA public TO taskuser;
GRANT CREATE ON SCHEMA public TO taskuser;
\q
```

#### Update backend/.env:
```
DATABASE_URL=postgresql://taskuser:taskpass123@localhost:5432/team_task_manager
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Should show: ✓ Server running on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Should show: ✓ Local: http://localhost:5173
```

## 🧪 Testing Checklist

Visit http://localhost:5173 and test these features:

### ✅ Authentication
- [ ] Sign up with new email
- [ ] Login with created credentials
- [ ] Logout functionality
- [ ] Protected routes (redirect to login if not authenticated)

### ✅ Dashboard
- [ ] Display user name
- [ ] Show stats (My Tasks, Completed, Overdue)
- [ ] Display projects list
- [ ] Display assigned tasks
- [ ] Filter tasks by status

### ✅ Project Management
- [ ] Create new project
- [ ] View project details
- [ ] Add team member by email
- [ ] View project statistics
- [ ] See project members

### ✅ Task Management
- [ ] Create task in project
- [ ] Assign task to team member
- [ ] Set task priority (Low, Medium, High)
- [ ] Set due date
- [ ] Update task status (To Do → In Progress → Done)
- [ ] Delete task (admin only)
- [ ] Filter tasks by status

### ✅ Dashboard Features
- [ ] View my tasks
- [ ] See overdue tasks count
- [ ] See task completion count
- [ ] Task details in table

## 🐛 Testing Edge Cases

### Test Data Signup Credentials:
```
Email: admin@test.com
Password: Admin@123

Email: user@test.com
Password: User@123

Email: member@test.com
Password: Member@123
```

### Test Scenarios:
1. **Permission Testing**:
   - Create project as admin
   - Add member with member role
   - Try deleting task as member (should fail)
   - Switch to admin account and delete (should work)

2. **Overdue Task Testing**:
   - Create task with due date in past
   - Check if it shows as overdue on dashboard
   - Change status to "Done" (should no longer show as overdue)

3. **Task Assignment Testing**:
   - Create project with 2 members
   - Create task assigned to member1
   - Login as member2, verify they can't see assigned tasks
   - Logout and login as member1, verify task appears

4. **Real-time Testing** (if using multiple browsers):
   - Create project in Browser 1
   - Refresh Browser 2, project should appear
   - Create task in Browser 1
   - View project in Browser 2, task should appear

## 🚀 Performance Tips

- Keep browser DevTools open (F12) to monitor Network tab
- Check Console for any errors
- Monitor Terminal output for backend logs

## 📋 Common Issues & Solutions

### "Can't connect to database"
```bash
# Check PostgreSQL is running
psql -U postgres -d team_task_manager

# Check if database exists
psql -U postgres -l
```

### "Port 5000 already in use"
```bash
# Find and kill process on port 5000
# Windows (PowerShell as admin):
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Or change PORT in backend/.env to 5001
```

### "CORS error" when calling API
- Check FRONTEND_URL in backend/.env
- Ensure frontend is on http://localhost:5173
- Restart backend server

### Frontend shows "Loading..." indefinitely
- Check browser console for errors (F12)
- Verify backend is running (http://localhost:5000/health)
- Check network tab for failed API calls

## 📊 Backend API Testing

Test backend directly with curl:

```bash
# Health check
curl http://localhost:5000/health

# Signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123"}'

# Create project (replace TOKEN with session token from login)
curl -X POST http://localhost:5000/api/projects \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Project","description":"Test Description"}'
```

## ✨ Ready to Deploy?

When everything works locally:
1. Commit to GitHub
2. Follow DEPLOYMENT_GUIDE.md
3. Deploy to Railway + Vercel/Netlify
4. Test on live URL
5. Record demo video

---

**Need help?** Check backend logs in Terminal 1 and frontend console (DevTools F12)
