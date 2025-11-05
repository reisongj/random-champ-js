// Simple Express.js backend example for shared team storage with persistence
// Install dependencies: npm install express cors
// Run: node server-example.js

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// File to persist teams data
const DATA_FILE = path.join(__dirname, 'teams-data.json');

// Load teams from file on startup
let teams = [];
function loadTeams() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      teams = JSON.parse(data);
      console.log(`Loaded ${teams.length} teams from ${DATA_FILE}`);
    } else {
      teams = [];
      console.log('No existing data file, starting with empty teams array');
    }
  } catch (error) {
    console.error('Error loading teams from file:', error);
    teams = [];
  }
}

// Save teams to file
function saveTeams() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(teams, null, 2), 'utf8');
    console.log(`Saved ${teams.length} teams to ${DATA_FILE}`);
  } catch (error) {
    console.error('Error saving teams to file:', error);
  }
}

// Load teams on startup
loadTeams();

// Auto-save every 30 seconds (in case of crashes)
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/teams`);
  console.log(`Data will be persisted to: ${DATA_FILE}`);
});
