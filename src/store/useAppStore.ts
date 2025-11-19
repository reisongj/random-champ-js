import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lane, championPools as defaultChampionPools } from '../data/champions';
import { SavedTeam, IncompleteTeam } from '../types';
import { apiService } from '../services/api';

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
  resetRoles: Set<Lane>; // Track which roles have been reset (champions in these roles are available even if in saved teams)
  championPools: Record<Lane, string[]>; // Champion pools loaded from database
  availableChampions: Record<Lane, string[]>; // Available champions loaded from database
  
  // Actions
  randomizeChampion: (lane: Lane) => Promise<void>;
  rerandomizeLane: (lane: Lane) => void;
  selectRerollChampion: (lane: Lane, champion: string) => void;
  lockInTeam: () => Promise<void>;
  resetAllChampions: () => Promise<void>;
  resetChampionsByRoles: (roles: Lane[]) => Promise<void>;
  resetForNewGame: () => void;
  saveAndStartNewTeam: () => void; // Save current team as incomplete and start new one
  displayTeam: (team: Record<Lane, string | null>) => void;
  returnToRandomize: () => void;
  loadSavedTeams: () => Promise<void>;
  saveTeam: () => Promise<void>;
  deleteSavedTeam: (timestamp: string) => Promise<void>;
  syncUsedChampionsFromSavedTeams: () => Promise<void>;
  saveIncompleteTeam: () => void;
  loadIncompleteTeams: () => void;
  loadIncompleteTeam: (id: string) => void;
  deleteIncompleteTeam: (id: string) => Promise<void>;
  createAdminTeam: (team: Record<Lane, string | null>) => Promise<void>; // Create a team as admin
  createAdminTeamFromSavedTeam: (savedTeam: SavedTeam) => Promise<void>; // Create a team from a SavedTeam object
  loadChampionPools: () => Promise<void>; // Load champion pools from database
  loadAvailableChampions: (lane: Lane) => Promise<void>; // Load available champions for a lane from database
  loadAllAvailableChampions: () => Promise<void>; // Load available champions for all lanes
  initializeAvailableChampions: () => Promise<void>; // Initialize available champions (first time setup)
  
  // Computed
  getChampionLanes: (champion: string) => Lane[]; // Get all lanes a champion can play
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
      resetRoles: new Set<Lane>() as Set<Lane>,
      championPools: {
        top: [...defaultChampionPools.top],
        jungle: [...defaultChampionPools.jungle],
        mid: [...defaultChampionPools.mid],
        adc: [...defaultChampionPools.adc],
        support: [...defaultChampionPools.support],
      } as Record<Lane, string[]>,
      availableChampions: {
        // Initialize with default champion pools for optimistic loading
        // This ensures UI shows counts immediately while API loads
        top: [...defaultChampionPools.top],
        jungle: [...defaultChampionPools.jungle],
        mid: [...defaultChampionPools.mid],
        adc: [...defaultChampionPools.adc],
        support: [...defaultChampionPools.support],
      } as Record<Lane, string[]>,

      loadChampionPools: async () => {
        try {
          const pools = await apiService.getChampionPools();
          // Ensure all lanes are present, use defaults if missing
          const loadedPools: Record<Lane, string[]> = {
            top: pools.top || [...defaultChampionPools.top],
            jungle: pools.jungle || [...defaultChampionPools.jungle],
            mid: pools.mid || [...defaultChampionPools.mid],
            adc: pools.adc || [...defaultChampionPools.adc],
            support: pools.support || [...defaultChampionPools.support],
          };
          set({ championPools: loadedPools });
          console.log('Champion pools loaded from database');
        } catch (error) {
          console.error('Failed to load champion pools from database, using defaults:', error);
          // Keep using defaults if API fails
        }
      },

      loadAvailableChampions: async (lane) => {
        try {
          const champions = await apiService.getAvailableChampions(lane);
          set((state) => ({
            availableChampions: {
              ...state.availableChampions,
              [lane]: champions,
            },
          }));
          console.log(`Loaded ${champions.length} available champions for ${lane}`);
        } catch (error) {
          console.error(`Failed to load available champions for ${lane}:`, error);
          // If API fails, fall back to using champion pools
          const state = get();
          set({
            availableChampions: {
              ...state.availableChampions,
              [lane]: state.championPools[lane] || [],
            },
          });
        }
      },

      loadAllAvailableChampions: async () => {
        try {
          // Use batch endpoint for better performance (1 request instead of 5)
          const championPools = await apiService.getAvailableChampionsBatch();
          set({
            availableChampions: {
              top: championPools.top || [],
              jungle: championPools.jungle || [],
              mid: championPools.mid || [],
              adc: championPools.adc || [],
              support: championPools.support || [],
            },
          });
          console.log('Loaded all available champions via batch endpoint');
        } catch (error) {
          console.error('Failed to load available champions via batch, falling back to individual calls:', error);
          // Fallback to individual calls if batch fails
          const lanes: Lane[] = ['top', 'jungle', 'mid', 'adc', 'support'];
          await Promise.all(lanes.map(lane => get().loadAvailableChampions(lane)));
        }
      },

      initializeAvailableChampions: async () => {
        try {
          await apiService.initializeAvailableChampions();
          // After initialization, load all available champions
          await get().loadAllAvailableChampions();
          console.log('Available champions initialized and loaded');
        } catch (error) {
          console.error('Failed to initialize available champions:', error);
        }
      },

      randomizeChampion: async (lane) => {
        const state = get();
        const available = state.getAvailableChampions(lane);
        
        if (available.length === 0) {
          return;
        }

        const champion = available[Math.floor(Math.random() * available.length)];
        const newRandomizedLanes = new Set(state.randomizedLanes);
        newRandomizedLanes.add(lane);

        // If starting a new team (no currentTeamId), create one immediately
        // This ensures champions from this new team are excluded from other incomplete teams
        const newCurrentTeamId = state.currentTeamId || `team-${Date.now()}`;

        // Only update local state - do NOT remove from database
        // Champions are only removed from database when locked in
        // Incomplete teams filter champions client-side only via getAvailableChampions
        set({
          selectedChampions: {
            ...state.selectedChampions,
            [lane]: champion,
          },
          randomizedLanes: newRandomizedLanes,
          currentTeamId: newCurrentTeamId,
        });
        
        // Save incomplete team when all lanes are randomized
        if (newRandomizedLanes.size === Object.keys(state.championPools).length) {
          setTimeout(() => {
            get().saveIncompleteTeam();
          }, 100);
        } else {
          // Also save incomplete team after first randomization to ensure it's tracked
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

      lockInTeam: async () => {
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

        // Create team object for saving
        const teamToSave: SavedTeam = {
          timestamp: new Date().toISOString(),
          team: finalChampions,
        };

        // Delete current incomplete team if it exists (do this immediately)
        // Don't restore champions since they're being saved to a saved team
        if (state.currentTeamId) {
          await get().deleteIncompleteTeam(state.currentTeamId);
        }
        
        // Add team to saved teams immediately (optimistic update)
        // This ensures it shows up right away in the saved teams list
        const updatedSavedTeams = [...state.savedTeams, teamToSave];
        
        // Reset for new game IMMEDIATELY (optimistic update - don't wait for API)
        get().resetForNewGame();
        
        // Update played champions and saved teams after reset
        set({ 
          playedChampions: newPlayedChampions,
          savedTeams: updatedSavedTeams,
        });

        // Remove champions from available for ALL lanes they can play
        // This is important in case champions were added via admin or other means
        const removePromises: Promise<void>[] = [];
        const championsToRemove = new Set<string>();
        Object.values(finalChampions).forEach((champion) => {
          if (champion) {
            championsToRemove.add(champion);
          }
        });
        
        // Remove each champion from all lanes it can play
        championsToRemove.forEach(champion => {
          const championLanes = get().getChampionLanes(champion);
          championLanes.forEach(l => {
            removePromises.push(
              apiService.removeAvailableChampion(l, champion).catch(error => {
                console.error(`Failed to remove ${champion} from available for ${l}:`, error);
                // Don't fail the whole operation if one removal fails
              })
            );
          });
        });
        await Promise.all(removePromises);

        // Update local available champions state for all lanes
        const updatedAvailableChampions = { ...state.availableChampions };
        championsToRemove.forEach(champion => {
          const championLanes = get().getChampionLanes(champion);
          championLanes.forEach(l => {
            if (updatedAvailableChampions[l]) {
              updatedAvailableChampions[l] = updatedAvailableChampions[l].filter(c => c !== champion);
            }
          });
        });
        set({ availableChampions: updatedAvailableChampions });

        // Save team in the background (don't block UI)
        // This ensures the UI is responsive while the API call happens
        (async () => {
          try {
            // Save to shared API
            const savedTeam = await apiService.saveTeam(teamToSave);
            console.log('Team saved to API successfully:', savedTeam);
            
            // Reload all teams from API to ensure we have the latest from all users
            // This will update the savedTeams with the server's version (which might have an ID or other metadata)
            await get().loadSavedTeams();
            
            // Note: We don't update playedChampions here because saved teams are just historical records
            // Champions were already removed from available when the team was locked in
          } catch (e) {
            console.error('Failed to save team during lock-in:', e);
            // Team wasn't saved to API, but it's in local state
            // The next sync will try to save it again
          }
        })();
      },

      resetAllChampions: async () => {
        // Clear local state immediately for responsive UI
        set({
          playedChampions: new Set<string>(),
          savedTeams: [],
          resetRoles: new Set<Lane>(),
        });

        // Delete teams from database and reset all available champions
        try {
          await apiService.deleteAllTeams();
          console.log('All teams deleted from database');
          
          // Reset all available champions for all lanes
          const lanes: Lane[] = ['top', 'jungle', 'mid', 'adc', 'support'];
          await Promise.all(lanes.map(lane => apiService.resetAvailableChampions(lane)));
          
          // Reload all available champions
          await get().loadAllAvailableChampions();
          console.log('All available champions reset');
        } catch (error) {
          console.error('Failed to reset champions from database:', error);
          // Don't throw - local state is already cleared, user can continue
          // The teams will be deleted on next successful reset
        }
      },

      resetChampionsByRoles: async (roles: Lane[]) => {
        const state = get();
        
        // If all roles are selected, use the existing resetAllChampions function
        if (roles.length === Object.keys(state.championPools).length) {
          await state.resetAllChampions();
          return;
        }

        // Reset available champions for each role via API
        try {
          await Promise.all(roles.map(role => apiService.resetAvailableChampions(role)));
          
          // Reload available champions for reset roles
          await Promise.all(roles.map(role => get().loadAvailableChampions(role)));
          
          // Mark these roles as reset
          const updatedResetRoles = new Set(state.resetRoles);
          roles.forEach(role => {
            updatedResetRoles.add(role);
          });

          set({
            resetRoles: updatedResetRoles,
          });

          console.log(`Reset champions for roles: ${roles.join(', ')}`);
        } catch (error) {
          console.error('Failed to reset champions via API:', error);
          // Still update local state even if API fails
          const updatedResetRoles = new Set(state.resetRoles);
          roles.forEach(role => {
            updatedResetRoles.add(role);
          });
          set({ resetRoles: updatedResetRoles });
        }
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

      loadSavedTeams: async () => {
        const state = get();
        const localTeams = state.savedTeams || [];
        
        try {
          const teams = await apiService.getSavedTeams();
          console.log(`Loaded ${teams.length} teams from API (local: ${localTeams.length})`);
          
          // Only update if we got a valid response (array)
          if (Array.isArray(teams)) {
            // Merge local and API teams, preferring API data (which has latest from all users)
            // Use a Set to deduplicate by timestamp (each team has unique timestamp)
            const teamMap = new Map<string, SavedTeam>();
            
            // Add local teams first (as backup)
            localTeams.forEach(team => {
              if (team.timestamp) {
                teamMap.set(team.timestamp, team);
              }
            });
            
            // Add/override with API teams (these are authoritative)
            teams.forEach(team => {
              if (team.timestamp) {
                teamMap.set(team.timestamp, team);
              }
            });
            
            const mergedTeams = Array.from(teamMap.values());
            // Sort by timestamp (newest first)
            mergedTeams.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            set({ savedTeams: mergedTeams });
            console.log(`Updated savedTeams state with ${mergedTeams.length} teams (merged from local + API)`);
          } else {
            console.warn('API returned non-array response, keeping existing teams');
          }
          
          // Note: We no longer sync used champions from saved teams
          // Saved teams are just historical records and don't affect champion availability
          // Availability is only affected by actual usage (rolling, locking in, creating via admin)
        } catch (e) {
          console.error('Failed to load saved teams:', e);
          // Don't clear existing teams on error - preserve what we have in localStorage
          // The app will continue to work with the existing teams in state
        }
      },

      saveTeam: async () => {
        const state = get();
        const team: SavedTeam = {
          timestamp: new Date().toISOString(),
          team: state.selectedChampions,
        };

        // Only save if at least one champion is selected
        if (!Object.values(team.team).some(champ => champ !== null)) {
          return;
        }

        try {
          // Save to shared API
          const savedTeam = await apiService.saveTeam(team);
          console.log('Team saved to API successfully:', savedTeam);
          
          // Reload all teams from API to ensure we have the latest from all users
          // This ensures we see teams created by other users
          await get().loadSavedTeams();
          
          // Note: We don't update playedChampions here because saved teams are just historical records
          // Champions were already removed from available when they were used (rolled/locked in)
        } catch (e) {
          console.error('Failed to save team:', e);
          // Still update local state even if API call fails
          const newSavedTeams = [...state.savedTeams, team];
          set({ savedTeams: newSavedTeams });
        }
      },

      deleteSavedTeam: async (timestamp: string) => {
        const state = get();
        
        // Find the team being deleted before we delete it
        const teamToDelete = state.savedTeams.find(team => team.timestamp === timestamp);
        
        try {
          // Delete from API
          await apiService.deleteTeam(timestamp);
          console.log('Team deleted from API successfully');
          
          // Restore champions from deleted team back to available
          // Saved teams are just historical records - deleting one should restore its champions
          if (teamToDelete) {
            const restorePromises: Promise<void>[] = [];
            const affectedLanes = new Set<Lane>();
            
            // Restore ALL champions from the deleted team (saved teams don't affect availability)
            Object.values(teamToDelete.team).forEach((champion) => {
              if (champion) {
                // Restore champion from ALL lanes it can play
                const championLanes = get().getChampionLanes(champion);
                championLanes.forEach(l => {
                  affectedLanes.add(l);
                  restorePromises.push(
                    apiService.restoreAvailableChampion(l, champion).catch(error => {
                      console.error(`Failed to restore ${champion} for ${l}:`, error);
                      // Don't fail the whole operation if one restoration fails
                    })
                  );
                });
              }
            });
            
            // Wait for all restorations
            await Promise.all(restorePromises);
            
            // Reload available champions for all affected lanes
            await Promise.all(Array.from(affectedLanes).map(lane => get().loadAvailableChampions(lane)));
            
            console.log(`Restored champions from deleted team ${timestamp}`);
          }
          
          // Remove from local state immediately
          const updatedTeams = state.savedTeams.filter(team => team.timestamp !== timestamp);
          set({ savedTeams: updatedTeams });
          
          // Reload all teams from API to ensure we have the latest
          await get().loadSavedTeams();
          
          // Recalculate used champions from remaining teams
          const usedChampions = new Set<string>();
          const remainingTeams = get().savedTeams;
          remainingTeams.forEach(team => {
            Object.values(team.team).forEach(champion => {
              if (champion) {
                usedChampions.add(champion);
              }
            });
          });
          set({ playedChampions: usedChampions });
        } catch (e) {
          console.error('Failed to delete team:', e);
          
          // Still try to restore champions even if API delete failed
          // Saved teams are just historical records - deleting one should restore its champions
          if (teamToDelete) {
            try {
              const restorePromises: Promise<void>[] = [];
              const affectedLanes = new Set<Lane>();
              
              // Restore ALL champions from the deleted team
              Object.values(teamToDelete.team).forEach((champion) => {
                if (champion) {
                  // Restore champion from ALL lanes it can play
                  const championLanes = get().getChampionLanes(champion);
                  championLanes.forEach(l => {
                    affectedLanes.add(l);
                    restorePromises.push(
                      apiService.restoreAvailableChampion(l, champion).catch(error => {
                        console.error(`Failed to restore ${champion} for ${l}:`, error);
                      })
                    );
                  });
                }
              });
              
              await Promise.all(restorePromises);
              await Promise.all(Array.from(affectedLanes).map(lane => get().loadAvailableChampions(lane)));
            } catch (restoreError) {
              console.error('Failed to restore champions:', restoreError);
            }
          }
          
          // Remove from local state anyway (optimistic update)
          const updatedTeams = state.savedTeams.filter(team => team.timestamp !== timestamp);
          set({ savedTeams: updatedTeams });
        }
      },

      createAdminTeam: async (team: Record<Lane, string | null>) => {
        const state = get();
        const adminTeam: SavedTeam = {
          timestamp: new Date().toISOString(),
          team: team,
          isAdminCreated: true,
        };

        // Remove champions from available for ALL lanes they can play
        const removePromises: Promise<void>[] = [];
        const championsToRemove = new Set<string>();
        Object.values(team).forEach(champion => {
          if (champion) {
            championsToRemove.add(champion);
          }
        });
        
        // Remove each champion from all lanes it can play
        championsToRemove.forEach(champion => {
          const championLanes = get().getChampionLanes(champion);
          championLanes.forEach(l => {
            removePromises.push(
              apiService.removeAvailableChampion(l, champion).catch(error => {
                console.error(`Failed to remove ${champion} from available for ${l}:`, error);
                // Don't fail the whole operation if one removal fails
              })
            );
          });
        });
        await Promise.all(removePromises);

        // Update local available champions state for all lanes
        const updatedAvailableChampions = { ...state.availableChampions };
        championsToRemove.forEach(champion => {
          const championLanes = get().getChampionLanes(champion);
          championLanes.forEach(l => {
            if (updatedAvailableChampions[l]) {
              updatedAvailableChampions[l] = updatedAvailableChampions[l].filter(c => c !== champion);
            }
          });
        });
        set({ availableChampions: updatedAvailableChampions });

        try {
          // Save to shared API
          const savedTeam = await apiService.saveTeam(adminTeam);
          console.log('Admin team saved to API successfully:', savedTeam);
          
          // Reload all teams from API to ensure we have the latest
          await get().loadSavedTeams();
          
          // Update used champions from the admin team
          const usedChampions = new Set(state.playedChampions);
          Object.values(savedTeam.team).forEach(champion => {
            if (champion) {
              usedChampions.add(champion);
            }
          });
          set({ playedChampions: usedChampions });
        } catch (e) {
          console.error('Failed to save admin team:', e);
          // Still update local state even if API call fails
          const newSavedTeams = [...state.savedTeams, adminTeam];
          set({ savedTeams: newSavedTeams });
          
          // Update played champions locally
          const usedChampions = new Set(state.playedChampions);
          Object.values(adminTeam.team).forEach(champion => {
            if (champion) {
              usedChampions.add(champion);
            }
          });
          set({ playedChampions: usedChampions });
        }
      },

      createAdminTeamFromSavedTeam: async (savedTeam: SavedTeam) => {
        const state = get();
        // Ensure isAdminCreated flag is set
        const adminTeam: SavedTeam = {
          ...savedTeam,
          isAdminCreated: true,
        };

        // Remove champions from available for ALL lanes they can play
        const removePromises: Promise<void>[] = [];
        const championsToRemove = new Set<string>();
        Object.values(adminTeam.team).forEach(champion => {
          if (champion) {
            championsToRemove.add(champion);
          }
        });
        
        // Remove each champion from all lanes it can play
        championsToRemove.forEach(champion => {
          const championLanes = get().getChampionLanes(champion);
          championLanes.forEach(l => {
            removePromises.push(
              apiService.removeAvailableChampion(l, champion).catch(error => {
                console.error(`Failed to remove ${champion} from available for ${l}:`, error);
                // Don't fail the whole operation if one removal fails
              })
            );
          });
        });
        await Promise.all(removePromises);

        // Update local available champions state for all lanes
        const updatedAvailableChampions = { ...state.availableChampions };
        championsToRemove.forEach(champion => {
          const championLanes = get().getChampionLanes(champion);
          championLanes.forEach(l => {
            if (updatedAvailableChampions[l]) {
              updatedAvailableChampions[l] = updatedAvailableChampions[l].filter(c => c !== champion);
            }
          });
        });
        set({ availableChampions: updatedAvailableChampions });

        try {
          // Save to shared API
          const savedTeamResult = await apiService.saveTeam(adminTeam);
          console.log('Admin team saved to API successfully:', savedTeamResult);
          
          // Reload all teams from API to ensure we have the latest
          await get().loadSavedTeams();
          
          // Update used champions from the admin team
          const usedChampions = new Set(state.playedChampions);
          Object.values(savedTeamResult.team).forEach(champion => {
            if (champion) {
              usedChampions.add(champion);
            }
          });
          set({ playedChampions: usedChampions });
        } catch (e) {
          console.error('Failed to save admin team:', e);
          // Still update local state even if API call fails
          const newSavedTeams = [...state.savedTeams, adminTeam];
          set({ savedTeams: newSavedTeams });
          
          // Update played champions locally
          const usedChampions = new Set(state.playedChampions);
          Object.values(adminTeam.team).forEach(champion => {
            if (champion) {
              usedChampions.add(champion);
            }
          });
          set({ playedChampions: usedChampions });
        }
      },

      // Helper function to get all lanes a champion can play
      getChampionLanes: (champion: string): Lane[] => {
        const state = get();
        const lanes: Lane[] = [];
        Object.entries(state.championPools).forEach(([lane, champions]) => {
          if (champions.includes(champion)) {
            lanes.push(lane as Lane);
          }
        });
        return lanes;
      },

      getAvailableChampions: (lane) => {
        const state = get();
        
        // Start with available champions from database (API-loaded)
        let available = [...(state.availableChampions[lane] || [])];
        
        // Get all champions from incomplete teams (excluding the current team being worked on)
        const incompleteTeamChampions = new Set<string>();
        state.incompleteTeams.forEach(team => {
          // Exclude the current incomplete team - its champions should be available for modification
          if (team.id !== state.currentTeamId) {
            Object.values(team.team).forEach(champion => {
              if (champion) {
                incompleteTeamChampions.add(champion);
              }
            });
          }
        });
        
        // Filter out champions that are in other incomplete teams
        return available.filter(
          (champion) => !incompleteTeamChampions.has(champion)
        );
      },

      getAvailableCount: (lane) => {
        return get().getAvailableChampions(lane).length;
      },

      getAllPlayedCount: () => {
        const state = get();
        const allChampions = new Set<string>();
        Object.values(state.championPools).forEach((champs) => {
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
            selectedChampions: team.team as Record<Lane, string | null>,
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

      deleteIncompleteTeam: async (id) => {
        const state = get();
        const newIncompleteTeams = state.incompleteTeams.filter(t => t.id !== id);
        
        // If the deleted team was the current one, reset currentTeamId
        const newCurrentTeamId = state.currentTeamId === id ? null : state.currentTeamId;
        
        set({ 
          incompleteTeams: newIncompleteTeams,
          currentTeamId: newCurrentTeamId,
        });

        try {
          localStorage.setItem('incomplete-teams', JSON.stringify(newIncompleteTeams));
        } catch (e) {
          console.error('Failed to delete incomplete team:', e);
        }

        // Note: Champions in incomplete teams are never removed from the database
        // They are only filtered client-side via getAvailableChampions
        // So when an incomplete team is deleted, no restoration is needed
        // The champions remain available in the database and will be visible again
        // once the incomplete team is removed from the client-side filter
      },

      syncUsedChampionsFromSavedTeams: async () => {
        try {
          const usedChampions = await apiService.getUsedChampions();
          const currentPlayed = get().playedChampions;
          const combinedPlayed = new Set([...currentPlayed, ...usedChampions]);
          set({ playedChampions: combinedPlayed });
        } catch (e) {
          console.error('Failed to sync used champions:', e);
        }
      },
    }),
    {
      name: 'lol-champion-selector-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        playedChampions: Array.from(state.playedChampions),
        savedTeams: state.savedTeams, // Persist saved teams to localStorage
        resetRoles: Array.from(state.resetRoles), // Persist reset roles to localStorage
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert playedChampions array back to Set
          const playedArray = (state as any).playedChampions;
          if (Array.isArray(playedArray)) {
            state.playedChampions = new Set(playedArray);
          }
          
          // Convert resetRoles array back to Set
          const resetRolesArray = (state as any).resetRoles;
          if (Array.isArray(resetRolesArray)) {
            state.resetRoles = new Set(resetRolesArray);
          } else if (!state.resetRoles) {
            state.resetRoles = new Set<Lane>();
          }
          
          // Ensure savedTeams is an array (from localStorage)
          if (!Array.isArray(state.savedTeams)) {
            state.savedTeams = [];
          }
          
          // Ensure championPools is initialized (use defaults if not in storage)
          if (!state.championPools || Object.keys(state.championPools).length === 0) {
            state.championPools = {
              top: [...defaultChampionPools.top],
              jungle: [...defaultChampionPools.jungle],
              mid: [...defaultChampionPools.mid],
              adc: [...defaultChampionPools.adc],
              support: [...defaultChampionPools.support],
            } as Record<Lane, string[]>;
          }
          
          // Load incomplete teams (localStorage, fast)
          state.loadIncompleteTeams();
          
          // Load critical data in parallel for better performance
          // Champion pools and available champions are needed for UI
          // Saved teams can load in background (not critical for initial display)
          (async () => {
            try {
              // Load champion pools and check initialization in parallel
              const [needsInit] = await Promise.all([
                apiService.checkNeedsInitialization().catch(() => true), // Default to true on error
                state.loadChampionPools().catch(console.error),
              ]);
              
              // Load available champions (critical for UI)
              if (needsInit) {
                console.log('Available champions table is empty, initializing...');
                await state.initializeAvailableChampions();
              } else {
                // Table exists, just load available champions (will update optimistic defaults)
                await state.loadAllAvailableChampions();
              }
            } catch (error) {
              console.error('Failed to load/initialize available champions:', error);
              // Try to initialize as fallback if load fails
              try {
                await state.initializeAvailableChampions();
              } catch (initError) {
                console.error('Failed to initialize available champions:', initError);
                // If all fails, keep the optimistic defaults (champion pools)
                // This ensures the UI still works even if API is down
              }
            }
          })();
          
          // Load saved teams in background (not critical for initial UI display)
          // This can happen after the critical UI loads
          state.loadSavedTeams().catch(console.error);
        }
      },
    }
  )
);

