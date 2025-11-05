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
}

// Export singleton instance
export const apiService = new ApiService(API_BASE_URL);

// Log API configuration on startup (helpful for debugging)
console.log(`🔗 API Base URL: ${API_BASE_URL}`);
if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('your-backend-url')) {
  console.warn('⚠️  API URL not configured! Teams will not be shared between users.');
  console.warn('   Edit src/config.ts and set your deployed backend URL.');
}

