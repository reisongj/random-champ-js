// Express.js backend with MongoDB storage for persistent team storage
// Install dependencies: npm install express cors mongodb
// Run: node server-mongodb.cjs
//
// Environment variables required:
// - MONGODB_URI: MongoDB connection string
// - PORT: Server port (defaults to 3001)

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB connection string - should include database name
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'lol-champions';
const COLLECTION_NAME = 'teams';

let client;
let db;
let teamsCollection;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    teamsCollection = db.collection(COLLECTION_NAME);
    
    // Create index on timestamp for faster queries
    await teamsCollection.createIndex({ timestamp: -1 });
    
    // Count existing teams
    const count = await teamsCollection.countDocuments();
    console.log(`✓ Connected to MongoDB database: ${DB_NAME}`);
    console.log(`✓ Found ${count} existing teams in collection: ${COLLECTION_NAME}`);
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    console.error('  Make sure MONGODB_URI is set correctly in environment variables');
    process.exit(1);
  }
}

// Initialize database connection
connectToDatabase();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const count = await teamsCollection.countDocuments();
    res.json({ 
      status: 'ok',
      database: DB_NAME,
      collection: COLLECTION_NAME,
      teams: count,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Get all saved teams
app.get('/api/teams', async (req, res) => {
  try {
    const teams = await teamsCollection.find({})
      .sort({ timestamp: -1 }) // Sort by newest first
      .toArray();
    
    console.log(`GET /api/teams - Returning ${teams.length} teams`);
    res.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams', message: error.message });
  }
});

// Save a new team
app.post('/api/teams', async (req, res) => {
  try {
    const team = req.body;
    
    // Validate team structure
    if (!team || !team.team || !team.timestamp) {
      return res.status(400).json({ error: 'Invalid team data' });
    }
    
    // Insert the team into MongoDB
    const result = await teamsCollection.insertOne(team);
    
    console.log(`POST /api/teams - Saved new team with ID: ${result.insertedId}`);
    
    // Get total count
    const count = await teamsCollection.countDocuments();
    console.log(`  Total teams in database: ${count}`);
    
    res.json({ team });
  } catch (error) {
    console.error('Error saving team:', error);
    res.status(500).json({ error: 'Failed to save team', message: error.message });
  }
});

// Optional: Clear all teams (for testing)
app.delete('/api/teams', async (req, res) => {
  try {
    const result = await teamsCollection.deleteMany({});
    console.log(`DELETE /api/teams - Deleted ${result.deletedCount} teams`);
    res.json({ 
      message: 'All teams cleared',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing teams:', error);
    res.status(500).json({ error: 'Failed to clear teams', message: error.message });
  }
});

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down gracefully...');
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Listen on all network interfaces (0.0.0.0) to allow access from other devices
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=== Server Running ===`);
  console.log(`Local:    http://localhost:${PORT}`);
  console.log(`Network:  http://0.0.0.0:${PORT}`);
  console.log(`API:      http://localhost:${PORT}/api/teams`);
  console.log(`Health:   http://localhost:${PORT}/health`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`Collection: ${COLLECTION_NAME}`);
  console.log(`\n✓ Using MongoDB for persistent storage`);
  console.log(`✓ Data will persist across restarts\n`);
});

