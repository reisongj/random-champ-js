# Network Setup Guide for Multi-User Access

To allow multiple users on different IPs to access the shared teams, you need to configure the backend server and frontend to use the same API endpoint.

## Step 1: Find Your Server's IP Address

### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x or 10.x.x.x)

### Mac/Linux:
```bash
ifconfig
```
or
```bash
ip addr show
```
Look for your network interface (usually `eth0` or `wlan0`) and find the `inet` address.

## Step 2: Update Server Configuration

The server is already configured to listen on `0.0.0.0` which allows access from other devices on your network.

When you run the server, it will display:
```
Server Running on http://0.0.0.0:3001
```

## Step 3: Configure Frontend for Each User

Each user (on different devices/IPs) needs to set the `VITE_API_URL` environment variable to point to your server's IP address.

### Option A: Create a `.env` file (Recommended)

In the `Random Champion JS` directory, create a `.env` file`:

```
VITE_API_URL=http://YOUR_SERVER_IP:3001/api
```

Replace `YOUR_SERVER_IP` with the actual IP address from Step 1.

For example, if your server IP is `192.168.1.100`:
```
VITE_API_URL=http://192.168.1.100:3001/api
```

### Option B: Modify the API URL directly

Edit `src/services/api.ts` and change:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
```

To:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://YOUR_SERVER_IP:3001/api';
```

## Step 4: Restart Everything

1. **Stop the server** (Ctrl+C)
2. **Restart the server**: `node server-example.js`
3. **Rebuild the frontend**: `npm run build` (or restart dev server)

## Step 5: Test Connection

1. Open browser console (F12)
2. Look for API connection messages
3. You should see: "Loaded X teams from API"

If you see errors like "Failed to fetch" or "Network error", check:
- Firewall settings (allow port 3001)
- Both devices are on the same network
- Server IP address is correct
- Server is actually running

## Troubleshooting

### "Failed to fetch" or CORS errors
- Make sure the server is running
- Check that CORS is enabled (already in server-example.js)
- Verify the IP address is correct

### Teams not syncing
- Check browser console for API errors
- Verify both users have the same `VITE_API_URL`
- Make sure the server is accessible from both devices
- Check server logs for incoming requests

### Firewall Issues
You may need to allow port 3001 through your firewall:
- **Windows**: Windows Defender Firewall → Advanced Settings → Inbound Rules → New Rule → Port → TCP → 3001
- **Mac**: System Preferences → Security & Privacy → Firewall → Firewall Options → Add port 3001
- **Linux**: `sudo ufw allow 3001`

## For Production (Internet Access)

If you want users from anywhere on the internet to access it:

1. **Deploy to a cloud service** (Railway, Render, Heroku, etc.)
2. **Use a public URL** instead of local IP
3. **Set VITE_API_URL** to the deployed URL

Example:
```
VITE_API_URL=https://your-app.railway.app/api
```

