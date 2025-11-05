# Deployment Guide for GitHub Pages

Since GitHub Pages only hosts static files (your frontend), you need to deploy the backend separately to a free hosting service.

## Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app) and sign up (free tier available)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect it's a Node.js app
5. Add environment variable: `PORT=3001` (or Railway will auto-assign)
6. Railway will give you a URL like: `https://your-app.railway.app`
7. Your API will be at: `https://your-app.railway.app/api/teams`

**Update your frontend:**
- In `vite.config.ts` or build script, set `VITE_API_URL=https://your-app.railway.app/api`
- Or set it in Railway as an environment variable for the build

### Option 2: Render

1. Go to [render.com](https://render.com) and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Build command: `npm install`
5. Start command: `node server-example.js`
6. Environment: `Node`
7. Add environment variable: `PORT=3001`
8. Render will give you a URL like: `https://your-app.onrender.com`

### Option 3: Fly.io

1. Install Fly CLI: `npm install -g flyctl`
2. Run `flyctl launch` in your project directory
3. Follow the prompts
4. Deploy: `flyctl deploy`

### Option 4: Glitch (Very Simple)

1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Import from GitHub"
3. Select your repo
4. Glitch will auto-deploy and give you a URL

## Configuration Steps

### Step 1: Deploy Backend

Choose one of the options above and deploy your `server-example.js` file.

### Step 2: Update Frontend API URL

Since GitHub Pages builds are static, you need to set the API URL at **build time**.

**Option A: Update vite.config.ts** (Recommended)
```typescript
export default defineConfig({
  plugins: [react()],
  base: '/random-champ-js/',
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('https://your-backend-url.com/api'),
  },
})
```

**Option B: Create a config file** (Better for flexibility)
Create `src/config.ts`:
```typescript
export const API_BASE_URL = 'https://your-backend-url.com/api';
```

Then update `src/services/api.ts` to use it:
```typescript
import { API_BASE_URL } from '../config';
```

**Option C: Use GitHub Actions with environment variables**
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Then set `VITE_API_URL` in GitHub repo → Settings → Secrets → Actions

### Step 3: Update Backend CORS

Make sure your deployed backend allows requests from your GitHub Pages URL.

In `server-example.js`, update CORS:
```javascript
app.use(cors({
  origin: [
    'https://your-username.github.io',
    'http://localhost:5173', // for local dev
  ],
  credentials: true
}));
```

Or allow all origins (less secure but simpler):
```javascript
app.use(cors()); // Already does this
```

### Step 4: Rebuild and Deploy Frontend

1. Update the API URL in your code
2. Run `npm run build`
3. Commit and push to GitHub
4. GitHub Pages will auto-deploy

## Testing

1. Open your GitHub Pages site
2. Open browser console (F12)
3. Look for: `🔗 API Base URL: https://your-backend-url.com/api`
4. Create a team and check if it saves
5. Have a friend test from their device - they should see your teams!

## Troubleshooting

### CORS Errors
- Make sure your backend CORS allows your GitHub Pages domain
- Check browser console for specific CORS errors

### API Not Working
- Verify backend is deployed and running
- Check backend logs for errors
- Test backend URL directly: `https://your-backend-url.com/api/teams`

### Teams Not Syncing
- Both users must use the same backend URL
- Check browser console for API connection status
- Verify backend is accessible from both users' networks

