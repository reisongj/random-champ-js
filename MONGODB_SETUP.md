# MongoDB Backend Setup Complete! 🎉

Your backend is now configured to use MongoDB for persistent storage.

## Connection Details

- **Username**: `reisongjolaj_db_user`
- **Cluster**: `cluster0.7iqidyk.mongodb.net`
- **Database Name**: `lol-champions`
- **Collection Name**: `teams`

## Render.com Deployment Steps

### 1. Update package.json Dependencies

Make sure your `package.json` includes `mongodb`:
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongodb": "^6.3.0",
    "cors": "^2.8.5"
  }
}
```

### 2. Deploy to Render.com

1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `random-champ-backend` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server-mongodb.cjs`
   - **Root Directory**: Leave empty

5. **Add Environment Variables**:
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://reisongjolaj_db_user:qCfapLuSFatzwOXY@cluster0.7iqidyk.mongodb.net/lol-champions?retryWrites=true&w=majority&appName=Cluster0`
   
   - **Key**: `DB_NAME`
   - **Value**: `lol-champions`
   
   - **Key**: `PORT`
   - **Value**: `10000` (Render will override this automatically, but set it anyway)

6. Click "Create Web Service"

### 3. MongoDB Network Access

**IMPORTANT**: Make sure your MongoDB Atlas cluster allows connections from Render:

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click on your cluster → "Network Access"
3. Click "Add IP Address"
4. Add Render's IP ranges OR click "Allow Access from Anywhere" (for testing):
   - Click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - Or add Render's specific IP ranges if you know them
5. Click "Confirm"

### 4. Test Your Backend

Once deployed, test your endpoints:

1. **Health Check**: 
   ```
   https://your-backend.onrender.com/health
   ```
   Should return: `{"status":"ok","database":"lol-champions",...}`

2. **Get Teams**:
   ```
   https://your-backend.onrender.com/api/teams
   ```
   Should return: `{"teams":[]}` (empty at first)

3. **Post a Team** (test with curl or Postman):
   ```bash
   curl -X POST https://your-backend.onrender.com/api/teams \
     -H "Content-Type: application/json" \
     -d '{"timestamp":"2024-01-01T00:00:00.000Z","team":{"top":"Jax","jungle":"Lee Sin","mid":"Zed","adc":"Jinx","support":"Thresh"}}'
   ```

### 5. Update Frontend

Update `src/config.ts` with your backend URL:
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  'https://your-backend.onrender.com/api'; // Replace with your Render URL
```

## Security Notes

⚠️ **Important**: Your MongoDB password is in the connection string. For production:

1. **Use Environment Variables**: Never commit passwords to git
2. **Rotate Passwords**: Change your MongoDB password regularly
3. **Restrict Network Access**: Only allow specific IPs in MongoDB Atlas
4. **Use MongoDB Atlas IP Whitelist**: Only allow Render's IPs

## Troubleshooting

### "MongoServerError: Authentication failed"
- Check that your MongoDB username and password are correct
- Verify the connection string in Render environment variables

### "MongoServerSelectionError: connection timed out"
- Check MongoDB Atlas Network Access settings
- Make sure you've added `0.0.0.0/0` or Render's IP ranges
- Wait a few minutes after adding IP addresses (can take time to propagate)

### "Cannot connect to MongoDB"
- Verify `MONGODB_URI` is set correctly in Render
- Check that the database name is included in the connection string
- Look at Render logs for specific error messages

### Data Not Persisting
- Check Render logs to see if MongoDB connection is successful
- Verify the `/health` endpoint shows `"status":"ok"`
- Test with the health endpoint to see database connection status

## Local Testing

To test locally before deploying:

1. Create a `.env` file:
   ```
   MONGODB_URI=mongodb+srv://reisongjolaj_db_user:qCfapLuSFatzwOXY@cluster0.7iqidyk.mongodb.net/lol-champions?retryWrites=true&w=majority&appName=Cluster0
   DB_NAME=lol-champions
   PORT=3001
   ```

2. Install dependencies:
   ```bash
   npm install express cors mongodb
   ```

3. Run the server:
   ```bash
   node server-mongodb.cjs
   ```

4. Test endpoints (should work the same as Render)

## Next Steps

1. ✅ Deploy backend to Render with MongoDB connection
2. ✅ Update frontend `src/config.ts` with backend URL
3. ✅ Test that teams are saving and loading
4. ✅ Verify data persists after service restart (should work now!)

Your backend will now persist data permanently in MongoDB! 🚀

