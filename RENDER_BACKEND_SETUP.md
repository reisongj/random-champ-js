# Render.com Backend Setup Guide

## Important: Render Free Tier Limitation

**Render.com's free tier uses an ephemeral filesystem.** This means:
- Files written to disk are **wiped when the service restarts or redeploys**
- Your `teams-data.json` file will be lost on each restart
- Data only persists while the service is running (in memory)

## Solution Options

### Option 1: Use In-Memory Storage (Works but Data Lost on Restart)

The current `server-example.js` will work on Render, but data is only stored in memory. This means:
- ✅ Data persists while the service is running
- ✅ Multiple users can share data during that time
- ❌ Data is lost when Render restarts your service (free tier services sleep after inactivity)

### Option 2: Use a Free Database Service (Recommended)

For persistent storage, use a free database service:

#### Option A: MongoDB Atlas (Free Tier)
1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `server-example.js` to use MongoDB instead of file storage

#### Option B: Supabase (Free Tier)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Use their PostgreSQL database
4. Update backend to use PostgreSQL

#### Option C: Railway with Persistent Disk
1. Deploy backend to Railway (they have persistent storage)
2. Use the same `server-example.js` file
3. Data will persist across restarts

### Option 3: Upgrade Render Plan (Paid)
- Render's paid plans support persistent disk storage
- Your current file-based storage will work perfectly

## Current Setup Instructions

1. **Create a separate backend service on Render**:
   - Go to [render.com](https://render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Settings:
     - **Name**: `random-champ-backend` (or any name)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server-example.js`
     - **Root Directory**: Leave empty (or set to repo root)
   - Add Environment Variable:
     - **Key**: `PORT`
     - **Value**: `10000` (Render will override this, but set it anyway)

2. **Get your backend URL**:
   - After deployment, Render gives you: `https://your-backend.onrender.com`
   - Your API will be at: `https://your-backend.onrender.com/api/teams`

3. **Update your frontend config**:
   - Edit `src/config.ts`:
     ```typescript
     export const API_BASE_URL = 'https://your-backend.onrender.com/api';
     ```

4. **Test the backend**:
   - Visit: `https://your-backend.onrender.com/api/teams`
   - Should return: `{"teams":[]}`
   - Try POSTing a team and see if it persists (until restart)

## Troubleshooting

### Data Not Persisting
- **Expected on free tier**: Data is stored in memory and lost on restart
- **Solution**: Use a database service (MongoDB Atlas, Supabase) or upgrade Render plan

### Service Sleeping
- Render free tier services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- **Solution**: Use a service like [UptimeRobot](https://uptimerobot.com) to ping your service every 5 minutes

### CORS Errors
- The backend already has `app.use(cors())` which allows all origins
- If you still get CORS errors, check that your frontend URL is correct

### Port Issues
- Render automatically sets the `PORT` environment variable
- Your server listens on `process.env.PORT || 3001`
- Don't hardcode ports

## Recommended: MongoDB Atlas Setup

For persistent storage, here's a quick MongoDB setup:

1. **Install MongoDB driver**:
   ```bash
   npm install mongodb
   ```

2. **Create `server-mongodb.js`** (example):
   ```javascript
   const { MongoClient } = require('mongodb');
   const express = require('express');
   const cors = require('cors');
   
   const app = express();
   const PORT = process.env.PORT || 3001;
   const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
   
   let db;
   let teamsCollection;
   
   MongoClient.connect(MONGODB_URI)
     .then(client => {
       db = client.db('lol-champions');
       teamsCollection = db.collection('teams');
       console.log('Connected to MongoDB');
     })
     .catch(err => console.error('MongoDB connection error:', err));
   
   app.use(cors());
   app.use(express.json());
   
   app.get('/api/teams', async (req, res) => {
     const teams = await teamsCollection.find({}).toArray();
     res.json({ teams });
   });
   
   app.post('/api/teams', async (req, res) => {
     const team = req.body;
     await teamsCollection.insertOne(team);
     res.json({ team });
   });
   
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

3. **Add MongoDB URI to Render environment variables**:
   - Key: `MONGODB_URI`
   - Value: Your MongoDB Atlas connection string

