# Railway Backend Deployment Guide

Your Railway deployment is currently running the frontend (Vite). You need to deploy the **backend server** instead.

## Step 1: Configure Railway to Run Backend

In your Railway project:

1. Go to your service settings
2. Under **"Settings"** → **"Start Command"**, change it to:
   ```
   node server-example.js
   ```
   
   OR if Railway uses npm scripts, set:
   ```
   npm run start:server
   ```

3. Under **"Settings"** → **"Root Directory"**, make sure it's set to the root (`.`)

## Step 2: Add Backend Start Script (Optional)

Add this to your `package.json`:
```json
"scripts": {
  "start:server": "node server-example.js"
}
```

Then Railway can use `npm run start:server` as the start command.

## Step 3: Find Your Railway URL

1. In Railway dashboard, click on your service
2. Click the **"Settings"** tab
3. Scroll down to **"Domains"** section
4. You'll see your public URL, something like:
   - `https://your-app-name.up.railway.app`
   - Or you can create a custom domain

4. Your API endpoint will be: `https://your-app-name.up.railway.app/api/teams`

## Step 4: Update Frontend Config

Edit `src/config.ts`:
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  'https://your-app-name.up.railway.app/api'; // Your Railway URL
```

## Step 5: Verify Backend is Running

1. Check Railway logs - you should see:
   ```
   Server Running on http://0.0.0.0:3001
   API endpoint: http://localhost:3001/api/teams
   ```

2. Test the API directly:
   - Open: `https://your-app-name.up.railway.app/api/teams`
   - Should return: `{"teams":[]}`

3. If you see Vite output, the backend isn't running - check the start command

## Troubleshooting

### Still seeing Vite output?
- Railway is using the wrong start command
- Change it to: `node server-example.js`
- Or add `"start": "node server-example.js"` to package.json scripts

### Port issues?
- Railway sets `PORT` environment variable automatically
- Your server already uses `process.env.PORT || 3001`, so it should work

### CORS errors?
- Your server already has `app.use(cors())` which allows all origins
- Should work out of the box

### Need to deploy both frontend and backend?
- Create **two separate services** in Railway:
  1. Backend service: runs `node server-example.js`
  2. Frontend service: runs `npm run build` and serves static files
- Or keep frontend on GitHub Pages and only deploy backend to Railway

## Quick Fix: Two Railway Services

If you want both:

1. **Backend Service**:
   - Start Command: `node server-example.js`
   - Gets URL: `https://backend-name.up.railway.app`
   - API: `https://backend-name.up.railway.app/api/teams`

2. **Frontend Service** (optional):
   - Build Command: `npm install && npm run build`
   - Start Command: `npx serve dist -s`
   - Gets URL: `https://frontend-name.up.railway.app`

For GitHub Pages, you only need the **Backend Service** on Railway!

