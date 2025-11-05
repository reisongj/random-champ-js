import { SavedTeam } from '../types';

// Configure your API endpoint here
// For production, set this to your backend URL
// Example: 'https://your-api.com/api' or 'https://your-project.supabase.co/rest/v1'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
        throw new Error(`Failed to fetch teams: ${response.statusText}`);
      }

      const data = await response.json();
      return data.teams || [];
    } catch (error) {
      console.error('Error fetching saved teams:', error);
      // Return empty array on error to allow app to continue working
      return [];
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
        throw new Error(`Failed to save team: ${response.statusText}`);
      }

      const data = await response.json();
      return data.team || team;
    } catch (error) {
      console.error('Error saving team:', error);
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
      return new Set<string>();
    }
  }
}

// Export singleton instance
export const apiService = new ApiService(API_BASE_URL);

