import { SavedTeam } from '../types';
import { API_BASE_URL } from '../config';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Get all saved teams from the shared storage
  async getSavedTeams(): Promise<SavedTeam[]> {
    try {
      const response = await fetch(`${this.baseUrl}/teams`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      // Ensure we return an array
      if (Array.isArray(data.teams)) {
        return data.teams;
      }
      // If response format is unexpected, return empty array
      console.warn('API returned unexpected format:', data);
      return [];
    } catch (error) {
      console.error(`Error fetching saved teams from ${this.baseUrl}:`, error);
      // Re-throw the error so the caller can handle it appropriately
      // This prevents silently returning empty array which would clear teams
      throw error;
    }
  }

  // Save a team to shared storage
  async saveTeam(team: SavedTeam): Promise<SavedTeam> {
    try {
      const response = await fetch(`${this.baseUrl}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(team),
      });

      if (!response.ok) {
        throw new Error(`Failed to save team: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return data.team || team;
    } catch (error) {
      console.error(`Error saving team to ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Get all champions that have been used in saved teams (for exclusion)
  async getUsedChampions(): Promise<Set<string>> {
    try {
      const teams = await this.getSavedTeams();
      const usedChampions = new Set<string>();
      
      teams.forEach(team => {
        Object.values(team.team).forEach(champion => {
          if (champion) {
            usedChampions.add(champion);
          }
        });
      });

      return usedChampions;
    } catch (error) {
      console.error('Error getting used champions:', error);
      // Return empty set on error - this is safe as it just means
      // we won't exclude champions from saved teams temporarily
      return new Set<string>();
    }
  }

  // Delete a specific team by timestamp
  async deleteTeam(timestamp: string): Promise<void> {
    try {
      // Encode timestamp for URL (in case it contains special characters)
      const encodedTimestamp = encodeURIComponent(timestamp);
      const response = await fetch(`${this.baseUrl}/teams/${encodedTimestamp}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete team: ${response.statusText} (${response.status})`);
      }

      await response.json();
      console.log(`Deleted team with timestamp ${timestamp} from database`);
    } catch (error) {
      console.error(`Error deleting team from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Delete all teams from shared storage
  async deleteAllTeams(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/teams`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete teams: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log(`Deleted ${data.deletedCount || 0} teams from database`);
    } catch (error) {
      console.error(`Error deleting teams from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Get champion roles from the database
  async getChampionRoles(): Promise<Record<string, string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/champion-roles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch champion roles: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return data.roles || {};
    } catch (error) {
      console.error(`Error fetching champion roles from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Save champion roles to the database
  async saveChampionRoles(roles: Record<string, string[]>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/champion-roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roles }),
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Failed to save champion roles: ${response.statusText} (${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData.error || errorData.message) {
            errorMessage = errorData.message || errorData.error;
          }
        } catch (e) {
          // If JSON parsing fails, use the default message
        }
        throw new Error(errorMessage);
      }

      await response.json();
      console.log('Champion roles saved successfully');
    } catch (error) {
      console.error(`Error saving champion roles to ${this.baseUrl}:`, error);
      // Re-throw with more context if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to ${this.baseUrl}. Make sure the backend server is running.`);
      }
      throw error;
    }
  }

  // Generate champions.ts file content from database
  async generateChampionsFile(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/champion-roles/generate`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to generate file: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return data.fileContent || '';
    } catch (error) {
      console.error(`Error generating champions file from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Get champion pools (structured by lane) from database
  async getChampionPools(): Promise<Record<string, string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/champion-pools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch champion pools: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return data.championPools || {};
    } catch (error) {
      console.error(`Error fetching champion pools from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Get available champions for a specific lane
  async getAvailableChampions(lane: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/available-champions/${lane}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch available champions: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return data.champions || [];
    } catch (error) {
      console.error(`Error fetching available champions from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Remove a champion from available (when rolled)
  async removeAvailableChampion(lane: string, champion: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/available-champions/${lane}/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ champion }),
      });

      if (!response.ok) {
        throw new Error(`Failed to remove champion: ${response.statusText} (${response.status})`);
      }

      await response.json();
      console.log(`Removed ${champion} from available champions for ${lane}`);
    } catch (error) {
      console.error(`Error removing champion from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Restore a specific champion to available (when incomplete team is deleted)
  async restoreAvailableChampion(lane: string, champion: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/available-champions/${lane}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ champion }),
      });

      if (!response.ok) {
        throw new Error(`Failed to restore champion: ${response.statusText} (${response.status})`);
      }

      await response.json();
      console.log(`Restored ${champion} to available champions for ${lane}`);
    } catch (error) {
      console.error(`Error restoring champion from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Reset available champions for a specific lane
  async resetAvailableChampions(lane: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/available-champions/${lane}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to reset available champions: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log(`Reset ${data.count || 0} champions for ${lane}`);
    } catch (error) {
      console.error(`Error resetting available champions from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Check if available champions need initialization
  async checkNeedsInitialization(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/available-champions/check-initialization`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check initialization: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return data.needsInitialization === true;
    } catch (error) {
      console.error(`Error checking initialization from ${this.baseUrl}:`, error);
      // If check fails, assume initialization is needed as fallback
      return true;
    }
  }

  // Initialize all available champions (first time setup)
  async initializeAvailableChampions(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/available-champions/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize available champions: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log(`Initialized ${data.count || 0} champion records`);
    } catch (error) {
      console.error(`Error initializing available champions from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Check if a champion is available for randomizer
  async checkChampionAvailability(champion: string): Promise<{ isAvailable: boolean; lanes: string[] }> {
    try {
      const encodedChampion = encodeURIComponent(champion);
      const response = await fetch(`${this.baseUrl}/available-champions/champion/${encodedChampion}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to check champion availability: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      return {
        isAvailable: data.isAvailable === true,
        lanes: data.lanes || [],
      };
    } catch (error) {
      console.error(`Error checking champion availability from ${this.baseUrl}:`, error);
      throw error;
    }
  }

  // Set a champion as unavailable for randomizer (for all lanes it can play)
  async setChampionUnavailable(champion: string): Promise<void> {
    try {
      const encodedChampion = encodeURIComponent(champion);
      const response = await fetch(`${this.baseUrl}/available-champions/champion/${encodedChampion}/set-unavailable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to set champion as unavailable: ${response.statusText} (${response.status})`);
      }

      await response.json();
      console.log(`Set ${champion} as unavailable for randomizer`);
    } catch (error) {
      console.error(`Error setting champion as unavailable from ${this.baseUrl}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService(API_BASE_URL);

// Log API configuration on startup (helpful for debugging)
console.log(`🔗 API Base URL: ${API_BASE_URL}`);
if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('your-backend-url')) {
  console.warn('⚠️  API URL not configured! Teams will not be shared between users.');
  console.warn('   Edit src/config.ts and set your deployed backend URL.');
}

