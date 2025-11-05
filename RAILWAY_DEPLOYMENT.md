# Railway Deployment Guide

This guide will help you deploy your React app to Railway.

## Quick Setup

1. **Install Railway CLI** (optional, but recommended):
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. **Deploy via Railway Dashboard**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect the Node.js app

3. **Configure Build Settings**:
   - Railway should automatically detect:
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
   - If not, set them manually in Railway dashboard → Settings → Build & Deploy

4. **Environment Variables** (if needed):
   - If you need to set a custom base path: `VITE_BASE_PATH=/`
   - If you need to configure the API URL: `VITE_API_URL=https://your-backend-url.com/api`
   - Note: These must be set BEFORE building, so add them in Railway dashboard

5. **Deploy**:
   - Railway will automatically build and deploy when you push to your connected branch
   - Or click "Deploy" in the Railway dashboard

## Important Notes

- The app will be served at the root path (`/`) by default
- Make sure your backend API is configured in `src/config.ts` with the correct URL
- The server will automatically serve static files from the `dist` folder after building

## Troubleshooting

### "Application failed to respond"
- Make sure `express` is in your `dependencies` (not `devDependencies`)
- Check that the build completed successfully in Railway logs
- Verify that `npm start` command runs `node server.cjs`
- Ensure the `dist` folder exists after build

### Assets not loading
- Check that `vite.config.ts` has `base: '/'` for Railway
- Verify all static assets are in the `public` folder

### CORS errors with backend
- Make sure your backend (if deployed separately) allows requests from your Railway domain
- Update CORS settings in your backend to include your Railway URL

