DEPLOYMENT_GUIDE.md

# Railway Deployment Guide

## Step 1: Prepare Your Project

### Local Testing (Important!)
Before deploying, test everything locally:

```bash
# Install dependencies
npm install-all

# Terminal 1 - Start Backend
cd backend
npm run dev

# Terminal 2 - Start Frontend
cd frontend
npm run dev
```

Visit http://localhost:5173 and test:
- User signup/login
- Create a project
- Add team members
- Create tasks
- Update task status
- View dashboard

### Database Setup (Local)
```bash
# Create PostgreSQL database
createdb team_task_manager

# Update backend/.env with correct credentials
DATABASE_URL=postgresql://localhost/team_task_manager
```

## Step 2: GitHub Setup

### Initialize Git Repository
```bash
cd "Team Task Manager"

git init
git add .
git commit -m "Initial commit: Team Task Manager application"

# Create new repository on GitHub (https://github.com/new)
# Then:
git remote add origin https://github.com/YOUR_USERNAME/team-task-manager.git
git branch -M main
git push -u origin main
```

## Step 3: Railway Deployment

### Create Railway Project
1. Go to https://railway.app
2. Sign in or create account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account
6. Select the "team-task-manager" repository

### Deploy Backend Service

1. In Railway dashboard, click "New Service"
2. Select "GitHub Repo"
3. Choose your team-task-manager repository
4. Set the following:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Port: `3000` (or leave default)

### Add PostgreSQL Database

1. In Railway dashboard, click "New"
2. Select "Database"
3. Choose "PostgreSQL"
4. Railway will automatically set `DATABASE_URL` environment variable

### Configure Backend Environment Variables

1. Click on your backend service
2. Go to "Variables" tab
3. Add these variables:
   ```
   # DATABASE_URL will be set by Railway when you add the PostgreSQL addon
   FRONTEND_URL=https://your-frontend-railway-url.up.railway.app
   NODE_ENV=production
   ```

4. Click "Deploy" to redeploy with new variables

### Deploy Frontend Service

1. In Railway dashboard, create a new service
2. Select "GitHub Repo"
3. Choose your team-task-manager repository
4. Set the following:
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start` (or use static hosting)
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-railway-url.up.railway.app/api
   ```

### Alternative: Deploy Frontend to Vercel/Netlify (Recommended)

For better performance, deploy frontend separately:

**Vercel:**
1. Go to https://vercel.com
2. Click "New Project"
3. Import GitHub repository
4. Set framework as "Vite"
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-railway-url.up.railway.app/api
   ```
6. Deploy

**Netlify:**
1. Go to https://app.netlify.com
2. Click "Add new site"
3. Connect GitHub repository
4. Set build command: `npm install && npm run build`
5. Set publish directory: `dist`
6. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-railway-url.up.railway.app/api
   ```
7. Deploy

## Step 4: Verify Deployment

1. Get your backend Railway URL from the deployment
2. Get your frontend Railway/Vercel/Netlify URL
3. Visit the frontend URL
4. Test signup/login functionality
5. Verify API calls work (check browser DevTools Network tab)

### Troubleshooting

### Backend Not Starting
- Check logs in Railway dashboard
- Verify DATABASE_URL is set
- Check Node.js version compatibility

### Database Connection Errors
- Verify PostgreSQL add-on is active
- Check DATABASE_URL format
- Ensure database migrations ran

### CORS Errors
- Update FRONTEND_URL in backend environment variables
- Ensure backend has correct CORS configuration

### Frontend Can't Connect to API
- Verify VITE_API_URL is correct
- Check backend is deployed and running
- Verify CORS headers in backend

## Getting Your URLs

After deployment:
- Backend URL: Check Railway dashboard under your backend service
- Frontend URL: Check Vercel/Netlify/Railway dashboard

## Important Security Notes

1. **Secure session storage**: Ensure your database and environment variables are secured (sessions stored in DB)
2. **Enable HTTPS**: Both Railway and Vercel/Netlify provide HTTPS
3. **Environment Variables**: Never commit .env files
4. **Database**: Use Railway's managed PostgreSQL

## Performance Optimization

- Frontend: Deployed on Vercel/Netlify for faster CDN distribution
- Backend: Deployed on Railway for API
- Database: Railway's PostgreSQL with automatic backups

---

Your app should now be live! Share the frontend URL with team members.
