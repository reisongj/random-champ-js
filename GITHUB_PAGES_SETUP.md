# GitHub Pages Setup - Quick Guide

Since you're using GitHub Pages, you need to deploy the backend separately and configure the frontend to use it.

## Step 1: Deploy Backend (Choose One)

### Option A: Railway (Easiest - 5 minutes)

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js - click "Deploy"
5. Once deployed, Railway gives you a URL like: `https://your-app.railway.app`
6. Your API will be at: `https://your-app.railway.app/api/teams`

### Option B: Render

1. Go to [render.com](https://render.com) → Sign up
2. Click "New" → "Web Service"
3. Connect GitHub repo
4. Settings:
   - Build Command: `npm install`
   - Start Command: `node server-example.js`
   - Environment: `Node`
5. Click "Create Web Service"
6. Render gives you: `https://your-app.onrender.com`

### Option C: Fly.io

```bash
npm install -g flyctl
flyctl launch
# Follow prompts
flyctl deploy
```

## Step 2: Configure Frontend

1. **Edit `src/config.ts`**:
   ```typescript
   export const API_BASE_URL = import.meta.env.VITE_API_URL || 
     'https://YOUR-RAILWAY-URL.railway.app/api'; // Replace with your backend URL
   ```

2. **Rebuild and deploy**:
   ```bash
   npm run build
   npm run deploy  # or push to GitHub if using GitHub Actions
   ```

## Step 3: Verify

1. Open your GitHub Pages site
2. Open browser console (F12)
3. You should see: `🔗 API Base URL: https://your-backend-url.com/api`
4. Create a team - it should save!
5. Have a friend test - they should see your teams!

## Troubleshooting

### "Failed to fetch" errors
- Check that backend is deployed and running
- Verify the URL in `src/config.ts` is correct
- Check backend logs for errors

### CORS errors
- Your backend already has CORS enabled
- If issues persist, verify backend allows your GitHub Pages domain

### Teams not syncing
- Both users must use the same GitHub Pages site (same build)
- Check browser console for API connection status
- Verify backend is accessible: try opening `https://your-backend-url.com/api/teams` in browser

## Important Notes

- **The API URL is hardcoded in the build** - all users will use the same backend
- **You must rebuild and redeploy** after changing the API URL
- **Backend must stay running** - if it goes to sleep, teams won't sync (free tiers may sleep after inactivity)

