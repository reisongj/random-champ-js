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
const AVAILABLE_CHAMPIONS_COLLECTION = 'available-champions';

let client;
let db;
let teamsCollection;
let championRolesCollection;
let availableChampionsCollection;

// Connect to MongoDB
async function connectToDatabase() {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    teamsCollection = db.collection(COLLECTION_NAME);
    championRolesCollection = db.collection(CHAMPION_ROLES_COLLECTION);
    availableChampionsCollection = db.collection(AVAILABLE_CHAMPIONS_COLLECTION);
    
    // Create index on timestamp for faster queries
    await teamsCollection.createIndex({ timestamp: -1 });
    
    // Create index on champion name for champion roles
    await championRolesCollection.createIndex({ champion: 1 }, { unique: true });
    
    // Clean up duplicate champions before creating unique index
    // This handles migration from old structure (per-lane records) to new structure (per-champion)
    try {
      const duplicates = await availableChampionsCollection.aggregate([
        {
          $group: {
            _id: "$champion",
            count: { $sum: 1 },
            ids: { $push: "$_id" }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ]).toArray();
      
      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} champions with duplicate records, cleaning up...`);
        
        for (const dup of duplicates) {
          // Keep the first record (or one without lane field if available), delete the rest
          const records = await availableChampionsCollection.find({ champion: dup._id }).toArray();
          
          // Prefer records without lane field (new structure)
          const withoutLane = records.filter(r => !r.lane);
          const toKeep = withoutLane.length > 0 ? withoutLane[0] : records[0];
          const toDelete = records.filter(r => r._id.toString() !== toKeep._id.toString());
          
          if (toDelete.length > 0) {
            const idsToDelete = toDelete.map(r => r._id);
            await availableChampionsCollection.deleteMany({ _id: { $in: idsToDelete } });
            console.log(`  Removed ${toDelete.length} duplicate record(s) for ${dup._id}`);
          }
        }
      }
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up duplicates:', cleanupError.message);
    }
    
    // Drop existing index if it exists (to handle partial index creation failures)
    try {
      await availableChampionsCollection.dropIndex('champion_1');
    } catch (dropError) {
      // Index doesn't exist, which is fine
      if (dropError.code !== 27) { // 27 = IndexNotFound
        console.warn('Warning: Could not drop existing index:', dropError.message);
      }
    }
    
    // Create unique index on champion for available champions (single record per champion)
    await availableChampionsCollection.createIndex({ champion: 1 }, { unique: true });
    
    // Count existing teams
    const count = await teamsCollection.countDocuments();
    const rolesCount = await championRolesCollection.countDocuments();
    const availableCount = await availableChampionsCollection.countDocuments();
    console.log(`✓ Connected to MongoDB database: ${DB_NAME}`);
    console.log(`✓ Found ${count} existing teams in collection: ${COLLECTION_NAME}`);
    console.log(`✓ Found ${rolesCount} champion role configurations in collection: ${CHAMPION_ROLES_COLLECTION}`);
    console.log(`✓ Found ${availableCount} available champion records in collection: ${AVAILABLE_CHAMPIONS_COLLECTION}`);
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

// Get all champion availability records at once (for admin panel)
// NOTE: This route must be defined BEFORE /api/available-champions/:lane to avoid route conflicts
app.get('/api/available-champions/all', async (req, res) => {
  try {
    // Get all records from available-champions collection
    const records = await availableChampionsCollection.find({}).toArray();
    
    console.log(`GET /api/available-champions/all - Found ${records.length} total records in collection`);
    
    // Log all records for debugging
    if (records.length > 0) {
      console.log('Sample records (first 5):', records.slice(0, 5).map(r => ({
        champion: r.champion,
        lane: r.lane,
        isAvailable: r.isAvailable,
        _id: r._id
      })));
    }
    
    // Convert to a map: champion -> isAvailable
    const availabilityMap = {};
    let recordsWithChampion = 0;
    let recordsWithoutChampion = 0;
    
    records.forEach(record => {
      if (record.champion) {
        recordsWithChampion++;
        // If record exists: isAvailable = false means unavailable, isAvailable = true means available
        // If isAvailable is undefined/null, treat as unavailable (false) since record exists
        const isAvailable = record.isAvailable === true;
        
        // If champion already exists in map, keep the most restrictive (false wins)
        // This handles cases where a champion might have multiple records (old format with lanes)
        if (availabilityMap[record.champion] === undefined || !isAvailable) {
          availabilityMap[record.champion] = isAvailable;
        }
        
        // Log Ambessa specifically for debugging
        if (record.champion === 'Ambessa') {
          console.log(`Ambessa record found: isAvailable=${record.isAvailable}, type=${typeof record.isAvailable}, final=${isAvailable}, full record:`, JSON.stringify(record));
        }
      } else {
        recordsWithoutChampion++;
        // Log records without champion field for debugging
        console.log('Record without champion field:', JSON.stringify(record));
      }
    });
    
    console.log(`Records with champion field: ${recordsWithChampion}, Records without champion field: ${recordsWithoutChampion}`);
    
    // Log Ambessa's final status
    if (availabilityMap['Ambessa'] !== undefined) {
      console.log(`Ambessa in availabilityMap: ${availabilityMap['Ambessa']}`);
    } else {
      console.log('Ambessa NOT in availabilityMap (will default to available)');
    }
    
    console.log(`GET /api/available-champions/all - Returning availability for ${Object.keys(availabilityMap).length} champions`);
    res.json({ availability: availabilityMap });
  } catch (error) {
    console.error('Error fetching all champion availability:', error);
    res.status(500).json({ error: 'Failed to fetch all champion availability', message: error.message });
  }
});

// Check if a champion is available for randomizer
// NOTE: This route must be defined BEFORE /api/available-champions/:lane to avoid route conflicts
app.get('/api/available-champions/champion/:champion', async (req, res) => {
  try {
    const { champion } = req.params;
    
    // Query ONLY the available-champions table - should be 1 record per champion
    // Find any record for this champion (with or without lane field for backwards compatibility)
    const record = await availableChampionsCollection.findOne({ champion });
    
    // Get the lanes this champion can play (from champion roles) for reference only
    const role = await championRolesCollection.findOne({ champion });
    const lanes = role && role.lanes && Array.isArray(role.lanes) ? role.lanes : [];
    
    // Determine availability based ONLY on available-champions table
    // If record exists: isAvailable = false means unavailable, isAvailable = true means available
    // If no record exists: default to available (champion hasn't been explicitly set as unavailable)
    const isAvailable = record ? (record.isAvailable === true) : true;
    
    console.log(`GET /api/available-champions/champion/${champion} - Available: ${isAvailable}, Record found: ${!!record}, isAvailable value: ${record ? record.isAvailable : 'N/A'}, Full record: ${JSON.stringify(record)}`);
    res.json({ 
      champion,
      isAvailable,
      lanes 
    });
  } catch (error) {
    console.error('Error checking champion availability:', error);
    res.status(500).json({ error: 'Failed to check champion availability', message: error.message });
  }
});

// Set a champion as unavailable for randomizer
// NOTE: This route must be defined BEFORE /api/available-champions/:lane to avoid route conflicts
app.post('/api/available-champions/champion/:champion/set-unavailable', async (req, res) => {
  try {
    // Decode the champion name from URL
    const champion = decodeURIComponent(req.params.champion);
    
    // Verify champion exists in champion roles, or allow update anyway
    let role = await championRolesCollection.findOne({ champion });
    let lanes = [];
    
    if (!role) {
      // Champion doesn't have a role entry yet - still allow setting availability
      console.log(`Champion ${champion} not found in champion roles - allowing availability update anyway`);
    } else if (!role.lanes || !Array.isArray(role.lanes)) {
      console.log(`Champion ${champion} found but has no valid lanes`);
      // Still allow the update, just use empty lanes
    } else {
      lanes = role.lanes;
    }
    
    // Set champion as unavailable - single record per champion (no lane field)
    // Remove lane field if it exists (migration from old structure)
    const result = await availableChampionsCollection.updateOne(
      { champion },
      { $set: { champion, isAvailable: false }, $unset: { lane: "" } },
      { upsert: true }
    );
    
    console.log(`POST /api/available-champions/champion/${champion}/set-unavailable - Set unavailable (can play ${lanes.length} lanes)`);
    res.json({ 
      message: `Champion ${champion} set as unavailable for randomizer`,
      champion,
      lanes
    });
  } catch (error) {
    console.error('Error setting champion as unavailable:', error);
    res.status(500).json({ error: 'Failed to set champion as unavailable', message: error.message });
  }
});

// Set a champion as available for randomizer
// NOTE: This route must be defined BEFORE /api/available-champions/:lane to avoid route conflicts
app.post('/api/available-champions/champion/:champion/set-available', async (req, res) => {
  try {
    // Decode the champion name from URL
    const champion = decodeURIComponent(req.params.champion);
    
    console.log(`POST /api/available-champions/champion/${champion}/set-available - Decoded champion: ${champion}`);
    
    // Verify champion exists in champion roles, or create a default entry
    let role = await championRolesCollection.findOne({ champion });
    if (!role) {
      // Champion doesn't have a role entry yet - this can happen for new champions
      // We'll still allow setting availability, but we need to handle this case
      console.log(`Champion ${champion} not found in champion roles - allowing availability update anyway`);
      // We can still set availability even without a role entry
      // The lanes will be empty, but that's okay for availability management
      const lanes = [];
      
      // Set champion as available - single record per champion (no lane field)
      const result = await availableChampionsCollection.updateOne(
        { champion },
        { $set: { champion, isAvailable: true }, $unset: { lane: "" } },
        { upsert: true }
      );
      
      console.log(`POST /api/available-champions/champion/${champion}/set-available - Set available (no role entry yet)`);
      return res.json({ 
        message: `Champion ${champion} set as available for randomizer`,
        champion,
        lanes: []
      });
    }
    
    if (!role.lanes || !Array.isArray(role.lanes)) {
      console.log(`Champion ${champion} found but has no valid lanes`);
      return res.status(404).json({ error: `Champion ${champion} has no valid lanes configured` });
    }
    
    const lanes = role.lanes;
    
    // Set champion as available - single record per champion (no lane field)
    // Remove lane field if it exists (migration from old structure)
    const result = await availableChampionsCollection.updateOne(
      { champion },
      { $set: { champion, isAvailable: true }, $unset: { lane: "" } },
      { upsert: true }
    );
    
    console.log(`POST /api/available-champions/champion/${champion}/set-available - Set available (can play ${lanes.length} lanes)`);
    res.json({ 
      message: `Champion ${champion} set as available for randomizer`,
      champion,
      lanes
    });
  } catch (error) {
    console.error('Error setting champion as available:', error);
    res.status(500).json({ error: 'Failed to set champion as available', message: error.message });
  }
});

// Get available champions for all lanes in one request (batch endpoint for performance)
// NOTE: This route must be defined BEFORE /api/available-champions/:lane to avoid route conflicts
app.get('/api/available-champions/batch', async (req, res) => {
  try {
    const lanes = ['top', 'jungle', 'mid', 'adc', 'support'];
    
    // Get all champion roles once (instead of 5 times)
    const roles = await championRolesCollection.find({}).toArray();
    
    // Build a map of champion -> lanes they can play
    const championLanesMap = new Map();
    roles.forEach(role => {
      if (role.champion && role.lanes && Array.isArray(role.lanes)) {
        championLanesMap.set(role.champion, role.lanes);
      }
    });
    
    // Get all availability records once (instead of 5 times)
    const allChampions = Array.from(championLanesMap.keys());
    const availabilityRecords = await availableChampionsCollection.find({
      $or: [
        { champion: { $in: allChampions } }, // New structure (no lane field)
        { champion: { $in: allChampions }, lane: { $in: lanes } } // Old structure (with lane field)
      ]
    }).toArray();
    
    // Create maps for availability status
    // New structure: champion -> availability (applies to all lanes)
    const globalAvailabilityMap = new Map();
    // Old structure: champion -> lane -> availability (per-lane)
    const perLaneAvailabilityMap = new Map();
    
    // Process availability records
    availabilityRecords.forEach(record => {
      if (!record.lane) {
        // New structure: one record per champion, applies to all lanes
        globalAvailabilityMap.set(record.champion, record.isAvailable === true);
      } else {
        // Old structure: per-lane availability
        if (!perLaneAvailabilityMap.has(record.champion)) {
          perLaneAvailabilityMap.set(record.champion, new Map());
        }
        perLaneAvailabilityMap.get(record.champion).set(record.lane, record.isAvailable === true);
      }
    });
    
    // Build result: lane -> available champions array
    const result = {};
    
    lanes.forEach(lane => {
      const championsForLane = Array.from(championLanesMap.entries())
        .filter(([champion, championLanes]) => championLanes.includes(lane))
        .map(([champion]) => champion);
      
      // Filter champions: available if explicitly set as available (true), or if no record exists (defaults to available)
      const availableChampions = championsForLane.filter(champion => {
        // Check new structure first (global availability)
        if (globalAvailabilityMap.has(champion)) {
          return globalAvailabilityMap.get(champion) === true;
        }
        
        // Check old structure (per-lane availability)
        const perLaneMap = perLaneAvailabilityMap.get(champion);
        if (perLaneMap && perLaneMap.has(lane)) {
          return perLaneMap.get(lane) === true;
        }
        
        // No record exists, default to available
        return true;
      }).sort();
      
      result[lane] = availableChampions;
    });
    
    console.log(`GET /api/available-champions/batch - Returning champions for all ${lanes.length} lanes`);
    res.json({ championPools: result });
  } catch (error) {
    console.error('Error fetching batch available champions:', error);
    res.status(500).json({ error: 'Failed to fetch batch available champions', message: error.message });
  }
});

// Get available champions for a specific lane
app.get('/api/available-champions/:lane', async (req, res) => {
  try {
    const { lane } = req.params;
    
    // Get all champions that can play this lane from champion roles
    const roles = await championRolesCollection.find({}).toArray();
    const championsForLane = roles
      .filter(role => role.lanes && Array.isArray(role.lanes) && role.lanes.includes(lane))
      .map(role => role.champion);
    
    if (championsForLane.length === 0) {
      return res.json({ champions: [] });
    }
    
    // Get availability status for all champions (new structure: one record per champion, no lane field)
    // Also check old structure for backwards compatibility
    // We need to get ALL records (both available and unavailable) to determine status
    const availabilityRecords = await availableChampionsCollection.find({
      $or: [
        { champion: { $in: championsForLane } }, // New structure (no lane field) - get all records
        { lane, champion: { $in: championsForLane } } // Old structure (with lane field) - get all records
      ]
    }).toArray();
    
    // Create a map of champion -> availability status
    const availabilityMap = new Map();
    
    // First, process new structure records (no lane field) - these take precedence
    availabilityRecords.forEach(record => {
      if (!record.lane) {
        // New structure: one record per champion
        // isAvailable: true means available, isAvailable: false means unavailable
        availabilityMap.set(record.champion, record.isAvailable === true);
      }
    });
    
    // Then, process old structure records (with lane field) for champions not in new structure
    availabilityRecords.forEach(record => {
      if (record.lane && !availabilityMap.has(record.champion)) {
        // Old structure: only if champion not already in map
        if (record.lane === lane) {
          availabilityMap.set(record.champion, record.isAvailable === true);
        }
      }
    });
    
    // Filter champions: available if explicitly set as available (true), or if no record exists (defaults to available)
    const availableChampions = championsForLane.filter(champion => {
      const availability = availabilityMap.get(champion);
      // If no record exists, default to available (true)
      // If record exists, only include if isAvailable is explicitly true
      return availability === undefined || availability === true;
    }).sort();
    
    console.log(`GET /api/available-champions/${lane} - Returning ${availableChampions.length} available champions out of ${championsForLane.length} total`);
    res.json({ champions: availableChampions });
  } catch (error) {
    console.error('Error fetching available champions:', error);
    res.status(500).json({ error: 'Failed to fetch available champions', message: error.message });
  }
});

// Remove a champion from available (when rolled)
app.post('/api/available-champions/:lane/remove', async (req, res) => {
  try {
    const { lane } = req.params;
    const { champion } = req.body;
    
    if (!champion) {
      return res.status(400).json({ error: 'Champion name is required' });
    }
    
    // Update the champion to mark as not available (soft delete)
    const result = await availableChampionsCollection.updateOne(
      { lane, champion },
      { $set: { isAvailable: false } },
      { upsert: false }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Champion not found in available champions' });
    }
    
    console.log(`POST /api/available-champions/${lane}/remove - Removed ${champion} from available`);
    res.json({ message: 'Champion removed from available', champion, lane });
  } catch (error) {
    console.error('Error removing champion:', error);
    res.status(500).json({ error: 'Failed to remove champion', message: error.message });
  }
});

// Restore a specific champion to available (when incomplete team is deleted)
app.post('/api/available-champions/:lane/restore', async (req, res) => {
  try {
    const { lane } = req.params;
    const { champion } = req.body;
    
    if (!champion) {
      return res.status(400).json({ error: 'Champion name is required' });
    }
    
    // Update the champion to mark as available
    const result = await availableChampionsCollection.updateOne(
      { lane, champion },
      { $set: { isAvailable: true } },
      { upsert: true }
    );
    
    console.log(`POST /api/available-champions/${lane}/restore - Restored ${champion} to available`);
    res.json({ message: 'Champion restored to available', champion, lane });
  } catch (error) {
    console.error('Error restoring champion:', error);
    res.status(500).json({ error: 'Failed to restore champion', message: error.message });
  }
});

// Reset available champions for a specific lane (add all champions back)
// Saved teams are just historical records and don't affect availability
app.post('/api/available-champions/:lane/reset', async (req, res) => {
  try {
    const { lane } = req.params;
    
    // Get champion pool for this lane from champion-roles
    const roles = await championRolesCollection.find({}).toArray();
    const championsForLane = [];
    
    roles.forEach(role => {
      if (role.lanes && Array.isArray(role.lanes) && role.lanes.includes(lane)) {
        championsForLane.push(role.champion);
      }
    });
    
    if (championsForLane.length === 0) {
      return res.status(404).json({ error: `No champions found for lane: ${lane}` });
    }
    
    // Reset champions using the new global structure (no lane field)
    // This sets champions as available globally, which is what the availability check uses
    const operations = [];
    championsForLane.forEach(champion => {
      // Set champion as available globally (no lane field) - this is what matters for availability
      // Match any record for this champion (with or without lane field) and convert to global structure
      operations.push({
        updateOne: {
          filter: { champion }, // Match any record for this champion
          update: { $set: { champion, isAvailable: true }, $unset: { lane: "" } },
          upsert: true
        }
      });
    });
    
    if (operations.length > 0) {
      await availableChampionsCollection.bulkWrite(operations);
    }
    
    console.log(`POST /api/available-champions/${lane}/reset - Reset all ${championsForLane.length} champions for ${lane} (global availability)`);
    res.json({ 
      message: `Reset all champions for ${lane}`,
      count: championsForLane.length,
      lane 
    });
  } catch (error) {
    console.error('Error resetting available champions:', error);
    res.status(500).json({ error: 'Failed to reset available champions', message: error.message });
  }
});

// Check if available champions collection needs initialization
app.get('/api/available-champions/check-initialization', async (req, res) => {
  try {
    const count = await availableChampionsCollection.countDocuments();
    res.json({ 
      needsInitialization: count === 0,
      recordCount: count 
    });
  } catch (error) {
    console.error('Error checking initialization:', error);
    res.status(500).json({ error: 'Failed to check initialization', message: error.message });
  }
});

// Initialize all available champions for all lanes (first time setup)
app.post('/api/available-champions/initialize', async (req, res) => {
  try {
    // Get all champion roles
    const roles = await championRolesCollection.find({}).toArray();
    
    // Build operations for all lanes
    const operations = [];
    const lanes = ['top', 'jungle', 'mid', 'adc', 'support'];
    
    roles.forEach(role => {
      if (role.lanes && Array.isArray(role.lanes)) {
        role.lanes.forEach(lane => {
          if (lanes.includes(lane)) {
            operations.push({
              updateOne: {
                filter: { lane, champion: role.champion },
                update: { $set: { lane, champion: role.champion, isAvailable: true } },
                upsert: true
              }
            });
          }
        });
      }
    });
    
    if (operations.length > 0) {
      await availableChampionsCollection.bulkWrite(operations);
    }
    
    console.log(`POST /api/available-champions/initialize - Initialized ${operations.length} champion records`);
    res.json({ 
      message: `Initialized ${operations.length} champion records`,
      count: operations.length 
    });
  } catch (error) {
    console.error('Error initializing available champions:', error);
    res.status(500).json({ error: 'Failed to initialize available champions', message: error.message });
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

