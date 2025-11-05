// Simple Express.js backend example for shared team storage with persistence
// Install dependencies: npm install express cors
// Run: node server-example.cjs
//
// This is the CommonJS version - use this if your package.json has "type": "module"

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// File to persist teams data
// NOTE: On Render.com free tier, filesystem is ephemeral (wiped on restart)
// For persistent storage, consider using a database service or Render's persistent disk (paid)
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'teams-data.json');

// Load teams from file on startup
let teams = [];
function loadTeams() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      teams = JSON.parse(data);
      console.log(`✓ Loaded ${teams.length} teams from ${DATA_FILE}`);
    } else {
      teams = [];
      console.log(`⚠ No existing data file found at ${DATA_FILE}, starting with empty teams array`);
      console.log(`⚠ NOTE: On Render free tier, data is stored in memory and will be lost on restart`);
    }
  } catch (error) {
    console.error('✗ Error loading teams from file:', error);
    teams = [];
  }
}

// Save teams to file
function saveTeams() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(teams, null, 2), 'utf8');
    console.log(`✓ Saved ${teams.length} teams to ${DATA_FILE}`);
  } catch (error) {
    console.error('✗ Error saving teams to file:', error);
    console.error('  This may be expected on Render free tier (ephemeral filesystem)');
    // Data is still in memory, so the API will work until restart
  }
}

// Load teams on startup
loadTeams();

// Auto-save every 30 seconds (in case of crashes)
// Note: On Render free tier, this will fail silently but data remains in memory
setInterval(() => {
  saveTeams();
}, 30000);

app.use(cors());
app.use(express.json());

// Get all saved teams
app.get('/api/teams', (req, res) => {
  console.log(`GET /api/teams - Returning ${teams.length} teams`);
  res.json({ teams });
});

// Save a new team
app.post('/api/teams', (req, res) => {
  const team = req.body;
  
  // Validate team structure
  if (!team || !team.team || !team.timestamp) {
    return res.status(400).json({ error: 'Invalid team data' });
  }
  
  // Add the team
  teams.push(team);
  
  // Save to file immediately
  saveTeams();
  
  console.log(`POST /api/teams - Saved new team, total teams: ${teams.length}`);
  res.json({ team });
});

// Optional: Clear all teams (for testing)
app.delete('/api/teams', (req, res) => {
  teams = [];
  saveTeams();
  console.log('DELETE /api/teams - Cleared all teams');
  res.json({ message: 'All teams cleared' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    teams: teams.length,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Graceful shutdown - save on exit
process.on('SIGINT', () => {
  console.log('\nSaving teams before shutdown...');
  saveTeams();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nSaving teams before shutdown...');
  saveTeams();
  process.exit(0);
});

// Listen on all network interfaces (0.0.0.0) to allow access from other devices
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Server Running ===`);
  console.log(`Local:    http://localhost:${PORT}`);
  console.log(`Network:  http://0.0.0.0:${PORT}`);
  console.log(`API:      http://localhost:${PORT}/api/teams`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(`Data:     ${DATA_FILE}`);
  console.log(`\n⚠ IMPORTANT: On Render free tier:`);
  console.log(`  - Data is stored in memory (will be lost on restart)`);
  console.log(`  - Service sleeps after 15 min inactivity`);
  console.log(`  - First request after sleep takes ~30 seconds\n`);
});

