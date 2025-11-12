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
const CHAMPION_ROLES_COLLECTION = 'champion-roles';

let client;
let db;
let teamsCollection;
let championRolesCollection;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    teamsCollection = db.collection(COLLECTION_NAME);
    championRolesCollection = db.collection(CHAMPION_ROLES_COLLECTION);
    
    // Create index on timestamp for faster queries
    await teamsCollection.createIndex({ timestamp: -1 });
    
    // Create index on champion name for champion roles
    await championRolesCollection.createIndex({ champion: 1 }, { unique: true });
    
    // Count existing teams
    const count = await teamsCollection.countDocuments();
    const rolesCount = await championRolesCollection.countDocuments();
    console.log(`✓ Connected to MongoDB database: ${DB_NAME}`);
    console.log(`✓ Found ${count} existing teams in collection: ${COLLECTION_NAME}`);
    console.log(`✓ Found ${rolesCount} champion role configurations in collection: ${CHAMPION_ROLES_COLLECTION}`);
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

// Delete a specific team by timestamp
app.delete('/api/teams/:timestamp', async (req, res) => {
  try {
    const { timestamp } = req.params;
    
    const result = await teamsCollection.deleteOne({ timestamp });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    console.log(`DELETE /api/teams/${timestamp} - Deleted team`);
    res.json({ 
      message: 'Team deleted successfully',
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team', message: error.message });
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

// Get champion roles
app.get('/api/champion-roles', async (req, res) => {
  try {
    const roles = await championRolesCollection.find({}).toArray();
    
    // Convert array to object format { champion: [lanes] }
    const rolesObject = {};
    roles.forEach(role => {
      rolesObject[role.champion] = role.lanes || [];
    });
    
    console.log(`GET /api/champion-roles - Returning ${roles.length} champion role configurations`);
    res.json({ roles: rolesObject });
  } catch (error) {
    console.error('Error fetching champion roles:', error);
    res.status(500).json({ error: 'Failed to fetch champion roles', message: error.message });
  }
});

// Get champion pools (structured by lane)
app.get('/api/champion-pools', async (req, res) => {
  try {
    const roles = await championRolesCollection.find({}).toArray();
    
    // Build champion pools by lane
    const championPools = {
      top: [],
      jungle: [],
      mid: [],
      adc: [],
      support: []
    };
    
    roles.forEach(role => {
      if (role.lanes && Array.isArray(role.lanes)) {
        role.lanes.forEach(lane => {
          if (championPools[lane]) {
            championPools[lane].push(role.champion);
          }
        });
      }
    });
    
    // Sort champions in each lane
    Object.keys(championPools).forEach(lane => {
      championPools[lane].sort();
    });
    
    console.log(`GET /api/champion-pools - Returning champion pools for ${roles.length} champions`);
    res.json({ championPools });
  } catch (error) {
    console.error('Error fetching champion pools:', error);
    res.status(500).json({ error: 'Failed to fetch champion pools', message: error.message });
  }
});

// Save champion roles
app.post('/api/champion-roles', async (req, res) => {
  try {
    const { roles } = req.body;
    
    if (!roles || typeof roles !== 'object') {
      return res.status(400).json({ error: 'Invalid roles data' });
    }
    
    // Convert object to array of documents
    const operations = Object.entries(roles).map(([champion, lanes]) => ({
      updateOne: {
        filter: { champion },
        update: { $set: { champion, lanes } },
        upsert: true
      }
    }));
    
    if (operations.length > 0) {
      await championRolesCollection.bulkWrite(operations);
    }
    
    console.log(`POST /api/champion-roles - Saved ${Object.keys(roles).length} champion role configurations`);
    res.json({ message: 'Champion roles saved successfully' });
  } catch (error) {
    console.error('Error saving champion roles:', error);
    res.status(500).json({ error: 'Failed to save champion roles', message: error.message });
  }
});

// Generate champions.ts file from database
app.get('/api/champion-roles/generate', async (req, res) => {
  try {
    const roles = await championRolesCollection.find({}).toArray();
    
    // Build champion pools by lane
    const championPools = {
      top: [],
      jungle: [],
      mid: [],
      adc: [],
      support: []
    };
    
    roles.forEach(role => {
      if (role.lanes && Array.isArray(role.lanes)) {
        role.lanes.forEach(lane => {
          if (championPools[lane]) {
            championPools[lane].push(role.champion);
          }
        });
      }
    });
    
    // Sort champions in each lane
    Object.keys(championPools).forEach(lane => {
      championPools[lane].sort();
    });
    
    // Helper function to format array as TypeScript array with single quotes
    const formatArray = (arr) => {
      return '[' + arr.map(champ => `'${champ.replace(/'/g, "\\'")}'`).join(', ') + ']';
    };
    
    // Generate the file content
    const fileContent = `// Champion pools for each lane
// This file is auto-generated from the database
// To modify champion roles, use the Admin Panel > Champion Roles

export const championPools = {
  top: ${formatArray(championPools.top)},
  jungle: ${formatArray(championPools.jungle)},
  mid: ${formatArray(championPools.mid)},
  adc: ${formatArray(championPools.adc)},
  support: ${formatArray(championPools.support)}
} as const;

// Lane colors and display info
export const laneInfo = {
  top: { color: "#dc2626", icon: "⚔️", display: "TOP" },
  jungle: { color: "#16a34a", icon: "🌲", display: "JUNGLE" },
  mid: { color: "#2563eb", icon: "✨", display: "MID" },
  adc: { color: "#ca8a04", icon: "🏹", display: "ADC" },
  support: { color: "#9333ea", icon: "🛡️", display: "SUPPORT" }
} as const;

export type Lane = keyof typeof championPools;

// Convert champion display name to Data Dragon API format
export function getChampionUrlName(championName: string): string {
  const specialCases: Record<string, string> = {
    "Bel'Veth": "Belveth",
    "Cho'Gath": "Chogath",
    "Dr. Mundo": "DrMundo",
    "Jarvan IV": "JarvanIV",
    "K'Sante": "KSante",
    "Kai'Sa": "Kaisa",
    "Kha'Zix": "Khazix",
    "Kog'Maw": "KogMaw",
    "LeBlanc": "Leblanc",
    "Lee Sin": "LeeSin",
    "Master Yi": "MasterYi",
    "Miss Fortune": "MissFortune",
    "Nunu & Willump": "Nunu",
    "Rek'Sai": "RekSai",
    "Renata Glasc": "Renata",
    "Tahm Kench": "TahmKench",
    "Twisted Fate": "TwistedFate",
    "Vel'Koz": "Velkoz",
    "Xin Zhao": "XinZhao",
    "Aurelion Sol": "AurelionSol"
  };

  if (championName in specialCases) {
    return specialCases[championName];
  }

  return championName.replace(/'/g, "").replace(/ /g, "").replace(/\\./g, "");
}

export const BASE_IMAGE_URL = "https://ddragon.leagueoflegends.com/cdn/14.22.1/img/champion/";
`;
    
    console.log(`GET /api/champion-roles/generate - Generated champions.ts file`);
    res.json({ fileContent });
  } catch (error) {
    console.error('Error generating champions file:', error);
    res.status(500).json({ error: 'Failed to generate file', message: error.message });
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

