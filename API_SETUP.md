# API Setup Guide

The app now uses a shared API to store teams globally. This means teams created by any user will be visible to all users, and champions in saved teams will be excluded from future randomizations for everyone.

## Quick Setup Options

### Option 1: Simple Express Server (Recommended for Local Testing)

1. Install dependencies:
```bash
npm install express cors
```

2. Create a `server.js` file (see `server-example.js` for reference)

3. Run the server:
```bash
node server.js
```

4. Set the API URL in your `.env` file:
```
VITE_API_URL=http://localhost:3001/api
```

### Option 2: Deploy to a Cloud Service

You can deploy the backend to services like:
- **Heroku**: Free tier available
- **Railway**: Free tier available
- **Render**: Free tier available
- **Vercel**: Serverless functions
- **Netlify**: Serverless functions

### Option 3: Use a Backend-as-a-Service

- **Firebase**: Real-time database
- **Supabase**: Open-source Firebase alternative
- **MongoDB Atlas**: Free tier available

## Environment Variable

Create a `.env` file in the root directory:

```
VITE_API_URL=https://your-api-url.com/api
```

If not set, it defaults to `http://localhost:3001/api`.

## API Endpoints Required

Your backend needs to implement these endpoints:

### GET `/api/teams`
Returns all saved teams.

**Response:**
```json
{
  "teams": [
    {
      "timestamp": "2024-01-01T00:00:00.000Z",
      "team": {
        "top": "Jax",
        "jungle": "Lee Sin",
        "mid": "Zed",
        "adc": "Jinx",
        "support": "Thresh"
      }
    }
  ]
}
```

### POST `/api/teams`
Saves a new team.

**Request Body:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "team": {
    "top": "Jax",
    "jungle": "Lee Sin",
    "mid": "Zed",
    "adc": "Jinx",
    "support": "Thresh"
  }
}
```

**Response:**
```json
{
  "team": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "team": {
      "top": "Jax",
      "jungle": "Lee Sin",
      "mid": "Zed",
      "adc": "Jinx",
      "support": "Thresh"
    }
  }
}
```

## Testing Without a Backend

If you want to test locally without a backend, the app will show errors in the console but will continue to work. You can modify `src/services/api.ts` to use localStorage as a fallback for testing.

