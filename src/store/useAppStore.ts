import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lane, championPools } from '../data/champions';
import { SavedTeam, IncompleteTeam } from '../types';

interface AppStore {
  // State
  selectedChampions: Record<Lane, string | null>;
  randomizedLanes: Set<Lane>;
  playedChampions: Set<string>;
  teamLocked: boolean;
  displayingSavedTeam: boolean;
  savedTeams: SavedTeam[];
  rerolledLanes: Record<Lane, { original: string; rerolled: string }>;
  pendingSelections: Record<Lane, string | null>; // Which champion to keep for rerolled lanes
  hasUsedReroll: boolean; // Track if ANY reroll has been used for this team (only 1 per team)
  incompleteTeams: IncompleteTeam[];
  currentTeamId: string | null;
  
  // Actions
  randomizeChampion: (lane: Lane) => void;
  rerandomizeLane: (lane: Lane) => void;
  selectRerollChampion: (lane: Lane, champion: string) => void;
  lockInTeam: () => void;
  resetAllChampions: () => void;
  resetForNewGame: () => void;
  saveAndStartNewTeam: () => void; // Save current team as incomplete and start new one
  displayTeam: (team: Record<Lane, string | null>) => void;
  returnToRandomize: () => void;
  loadSavedTeams: () => void;
  saveTeam: () => void;
  saveIncompleteTeam: () => void;
  loadIncompleteTeams: () => void;
  loadIncompleteTeam: (id: string) => void;
  deleteIncompleteTeam: (id: string) => void;
  
  // Computed
  getAvailableChampions: (lane: Lane) => string[];
  getAvailableCount: (lane: Lane) => number;
  getAllPlayedCount: () => number;
  canLockIn: () => boolean; // Check if all pending selections are made
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      selectedChampions: {
        top: null,
        jungle: null,
        mid: null,
        adc: null,
        support: null,
      },
      randomizedLanes: new Set<Lane>() as Set<Lane>,
      playedChampions: new Set<string>() as Set<string>,
      teamLocked: false,
      displayingSavedTeam: false,
      savedTeams: [],
      rerolledLanes: {} as Record<Lane, { original: string; rerolled: string }>,
      pendingSelections: {} as Record<Lane, string | null>,
      hasUsedReroll: false,
      incompleteTeams: [],
      currentTeamId: null,

      randomizeChampion: (lane) => {
        const state = get();
        const available = state.getAvailableChampions(lane);
        
        if (available.length === 0) {
          return;
        }

        const champion = available[Math.floor(Math.random() * available.length)];
        const newRandomizedLanes = new Set(state.randomizedLanes);
        newRandomizedLanes.add(lane);

        set({
          selectedChampions: {
            ...state.selectedChampions,
            [lane]: champion,
          },
          randomizedLanes: newRandomizedLanes,
        });
        
        // Save incomplete team when all lanes are randomized
        if (newRandomizedLanes.size === Object.keys(championPools).length) {
          setTimeout(() => {
            get().saveIncompleteTeam();
          }, 100);
        }
      },

      rerandomizeLane: (lane) => {
        const state = get();
        
        // Check if ANY reroll has already been used for this team
        if (state.hasUsedReroll) {
          return; // Already used the one reroll allowed per team
        }
        
        const available = state.getAvailableChampions(lane);
        const originalChampion = state.selectedChampions[lane];
        
        if (available.length === 0 || !originalChampion) {
          return;
        }

        // Filter out the original champion to ensure we get a different one
        const availableWithoutOriginal = available.filter(c => c !== originalChampion);
        
        if (availableWithoutOriginal.length === 0) {
          return; // No other champions available
        }

        const rerolledChampion = availableWithoutOriginal[Math.floor(Math.random() * availableWithoutOriginal.length)];
        
        // Store both original and rerolled champions
        const newRerolledLanes = {
          ...state.rerolledLanes,
          [lane]: { original: originalChampion, rerolled: rerolledChampion },
        };
        
        // Mark as pending selection (user needs to choose)
        const newPendingSelections = {
          ...state.pendingSelections,
          [lane]: null, // No selection made yet
        };

        set({
          rerolledLanes: newRerolledLanes,
          pendingSelections: newPendingSelections,
          hasUsedReroll: true, // Mark that reroll has been used for this team
        });
        
        // Save incomplete team when rerolling
        get().saveIncompleteTeam();
      },

      selectRerollChampion: (lane, champion) => {
        const state = get();
        const newPendingSelections = {
          ...state.pendingSelections,
          [lane]: champion,
        };
        
        // Update the selected champion to the chosen one
        const newSelectedChampions = {
          ...state.selectedChampions,
          [lane]: champion,
        };

        set({
          pendingSelections: newPendingSelections,
          selectedChampions: newSelectedChampions,
        });
        
        // Remove from rerolled lanes once selection is made (but keep in history)
        const newRerolledLanes = { ...state.rerolledLanes };
        delete newRerolledLanes[lane];
        set({ rerolledLanes: newRerolledLanes });
        
        // Save incomplete team after selection
        get().saveIncompleteTeam();
      },

      lockInTeam: () => {
        const state = get();
        
        // Check if all pending selections are made
        if (!state.canLockIn()) {
          return; // Can't lock in until all selections are made
        }
        
        // Apply any pending selections before locking
        const finalChampions = { ...state.selectedChampions };
        Object.entries(state.pendingSelections).forEach(([lane, champion]) => {
          if (champion) {
            finalChampions[lane as Lane] = champion;
          }
        });
        
        const newPlayedChampions = new Set(state.playedChampions);
        
        Object.values(finalChampions).forEach((champion) => {
          if (champion) {
            newPlayedChampions.add(champion);
          }
        });

          // Update selected champions with final choices
        set({
          selectedChampions: finalChampions,
          playedChampions: newPlayedChampions,
          teamLocked: true,
          rerolledLanes: {} as Record<Lane, { original: string; rerolled: string }>,
          pendingSelections: {} as Record<Lane, string | null>,
          hasUsedReroll: false,
        });

        // Save team
        get().saveTeam();
        
        // Delete current incomplete team if it exists
        if (state.currentTeamId) {
          get().deleteIncompleteTeam(state.currentTeamId);
        }
        
        // Reset for new game
        get().resetForNewGame();
      },

      resetAllChampions: () => {
        set({
          playedChampions: new Set<string>(),
        });
      },

      resetForNewGame: () => {
        set({
          selectedChampions: {
            top: null,
            jungle: null,
            mid: null,
            adc: null,
            support: null,
          },
          randomizedLanes: new Set<Lane>(),
          teamLocked: false,
          displayingSavedTeam: false,
          rerolledLanes: {} as Record<Lane, { original: string; rerolled: string }>,
          pendingSelections: {} as Record<Lane, string | null>,
          hasUsedReroll: false,
          currentTeamId: null,
        });
      },

      displayTeam: (team) => {
        set({
          selectedChampions: team,
          displayingSavedTeam: true,
        });
      },

      returnToRandomize: () => {
        get().resetForNewGame();
      },

      saveAndStartNewTeam: () => {
        const state = get();
        
        // Only save if there's at least one randomized lane
        if (state.randomizedLanes.size > 0) {
          // Save current team as incomplete
          get().saveIncompleteTeam();
        }
        
        // Reset for new game
        get().resetForNewGame();
      },

      loadSavedTeams: () => {
        try {
          const stored = localStorage.getItem('saved-teams');
          if (stored) {
            const teams = JSON.parse(stored) as SavedTeam[];
            set({ savedTeams: teams });
          }
        } catch (e) {
          console.error('Failed to load saved teams:', e);
        }
      },

      saveTeam: () => {
        const state = get();
        const team: SavedTeam = {
          timestamp: new Date().toISOString(),
          team: state.selectedChampions,
        };

        // Only save if at least one champion is selected
        if (!Object.values(team.team).some(champ => champ !== null)) {
          return;
        }

        const newSavedTeams = [...state.savedTeams, team];
        set({ savedTeams: newSavedTeams });

        try {
          localStorage.setItem('saved-teams', JSON.stringify(newSavedTeams));
        } catch (e) {
          console.error('Failed to save team:', e);
        }
      },

      getAvailableChampions: (lane) => {
        const state = get();
        return championPools[lane].filter(
          (champion) => !state.playedChampions.has(champion)
        );
      },

      getAvailableCount: (lane) => {
        return get().getAvailableChampions(lane).length;
      },

      getAllPlayedCount: () => {
        const state = get();
        const allChampions = new Set<string>();
        Object.values(championPools).forEach((champs) => {
          champs.forEach((champ) => allChampions.add(champ));
        });
        return state.playedChampions.size;
      },

      canLockIn: () => {
        const state = get();
        // Can lock in if there are no pending selections, or all pending selections have been made
        const pendingLanes = Object.keys(state.pendingSelections);
        if (pendingLanes.length === 0) {
          return true; // No pending selections
        }
        // Check if all pending selections have a value
        return pendingLanes.every(lane => state.pendingSelections[lane as Lane] !== null);
      },

      saveIncompleteTeam: () => {
        const state = get();
        const team: IncompleteTeam = {
          id: state.currentTeamId || `team-${Date.now()}`,
          timestamp: new Date().toISOString(),
          team: state.selectedChampions,
          rerolledLanes: state.rerolledLanes,
          pendingSelections: state.pendingSelections,
          hasUsedReroll: state.hasUsedReroll,
        };

        // Update or add incomplete team
        const existingIndex = state.incompleteTeams.findIndex(t => t.id === team.id);
        let newIncompleteTeams: IncompleteTeam[];
        
        if (existingIndex >= 0) {
          newIncompleteTeams = [...state.incompleteTeams];
          newIncompleteTeams[existingIndex] = team;
        } else {
          newIncompleteTeams = [...state.incompleteTeams, team];
        }
        
        set({ 
          incompleteTeams: newIncompleteTeams,
          currentTeamId: team.id,
        });

        try {
          localStorage.setItem('incomplete-teams', JSON.stringify(newIncompleteTeams));
        } catch (e) {
          console.error('Failed to save incomplete team:', e);
        }
      },

      loadIncompleteTeams: () => {
        try {
          const stored = localStorage.getItem('incomplete-teams');
          if (stored) {
            const teams = JSON.parse(stored) as IncompleteTeam[];
            set({ incompleteTeams: teams });
          }
        } catch (e) {
          console.error('Failed to load incomplete teams:', e);
        }
      },

      loadIncompleteTeam: (id) => {
        const state = get();
        const team = state.incompleteTeams.find(t => t.id === id);
        
        if (team) {
          set({
            selectedChampions: team.team,
            rerolledLanes: team.rerolledLanes,
            pendingSelections: team.pendingSelections,
            hasUsedReroll: team.hasUsedReroll ?? Object.keys(team.rerolledLanes).length > 0, // Default to true if rerolled lanes exist (for old data)
            currentTeamId: team.id,
            displayingSavedTeam: false,
          });
          
          // Rebuild randomized lanes based on selected champions
          const newRandomizedLanes = new Set<Lane>();
          Object.entries(team.team).forEach(([lane, champion]) => {
            if (champion) {
              newRandomizedLanes.add(lane as Lane);
            }
          });
          set({ randomizedLanes: newRandomizedLanes });
        }
      },

      deleteIncompleteTeam: (id) => {
        const state = get();
        const newIncompleteTeams = state.incompleteTeams.filter(t => t.id !== id);
        set({ incompleteTeams: newIncompleteTeams });

        try {
          localStorage.setItem('incomplete-teams', JSON.stringify(newIncompleteTeams));
        } catch (e) {
          console.error('Failed to delete incomplete team:', e);
        }
      },
    }),
    {
      name: 'lol-champion-selector-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        playedChampions: Array.from(state.playedChampions),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert playedChampions array back to Set
          const playedArray = (state as any).playedChampions;
          if (Array.isArray(playedArray)) {
            state.playedChampions = new Set(playedArray);
          }
          // Load saved teams
          state.loadSavedTeams();
          // Load incomplete teams
          state.loadIncompleteTeams();
        }
      },
    }
  )
);

