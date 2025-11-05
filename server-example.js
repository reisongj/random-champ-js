// Simple Express.js backend example for shared team storage
// Install dependencies: npm install express cors
// Run: node server-example.js

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// In-memory storage (use a database in production)
let teams = [];

app.use(cors());
app.use(express.json());

// Get all saved teams
app.get('/api/teams', (req, res) => {
  res.json({ teams });
});

// Save a new team
app.post('/api/teams', (req, res) => {
  const team = req.body;
  teams.push(team);
  res.json({ team });
});

// Optional: Clear all teams (for testing)
app.delete('/api/teams', (req, res) => {
  teams = [];
  res.json({ message: 'All teams cleared' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/teams`);
});

