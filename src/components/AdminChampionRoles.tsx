import { useState, useEffect } from 'react';
import { Lane, laneInfo, championPools } from '../data/champions';
import { apiService } from '../services/api';
import { motion } from 'framer-motion';
import { Save, Search, CheckCircle2, XCircle } from 'lucide-react';

interface AdminChampionRolesProps {
  onClose?: () => void;
}

interface ChampionRoles {
  [champion: string]: Lane[];
}

// Get all unique champions from all pools
function getAllChampions(): string[] {
  const allChampions = new Set<string>();
  Object.values(championPools).forEach(pool => {
    pool.forEach(champion => allChampions.add(champion));
  });
  return Array.from(allChampions).sort();
}

export default function AdminChampionRoles({}: AdminChampionRolesProps) {
  const [championRoles, setChampionRoles] = useState<ChampionRoles>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveErrorMessage, setSaveErrorMessage] = useState<string>('');
  // Initialize availability to all true by default so champions show up immediately
  // Prefixed with underscore as it's loaded but not yet used in UI (for future features)
  const [_championAvailability, setChampionAvailability] = useState<Record<string, boolean>>(() => {
    const defaultAvailability: Record<string, boolean> = {};
    getAllChampions().forEach(champion => {
      defaultAvailability[champion] = true;
    });
    return defaultAvailability;
  });
  // Prefixed with underscore as these are for future availability management features
  const [_settingUnavailable, setSettingUnavailable] = useState<Record<string, boolean>>({});

  const allChampions = getAllChampions();
  const lanes: Lane[] = ['top', 'jungle', 'mid', 'adc', 'support'];

  // Helper function to get default roles for a champion from championPools
  const getDefaultRolesForChampion = (champion: string): Lane[] => {
    const defaultRoles: Lane[] = [];
    lanes.forEach(lane => {
      if ((championPools[lane] as readonly string[]).includes(champion)) {
        defaultRoles.push(lane);
      }
    });
    return defaultRoles;
  };

  // Initialize all champions with default roles from championPools
  const initializeDefaultRoles = (): ChampionRoles => {
    const initialRoles: ChampionRoles = {};
    allChampions.forEach(champion => {
      initialRoles[champion] = getDefaultRolesForChampion(champion);
    });
    return initialRoles;
  };

  // Load champion roles and availability in parallel on mount
  useEffect(() => {
    // Load both in parallel for better performance
    Promise.all([
      loadChampionRoles(),
      loadAllChampionAvailability()
    ]).catch(error => {
      console.error('Error loading initial data:', error);
    });
  }, []);

  const loadChampionRoles = async () => {
    try {
      setIsLoading(true);
      const roles = await apiService.getChampionRoles();
      
      // Start with default roles for all champions
      const typedRoles: ChampionRoles = initializeDefaultRoles();
      
      // Override with roles from database if they exist
      Object.entries(roles).forEach(([champion, laneStrings]) => {
        if (allChampions.includes(champion)) {
          // Only use database roles if they're valid lanes
          const validLanes = laneStrings.filter(l => lanes.includes(l as Lane)) as Lane[];
          // If database has roles for this champion, use them; otherwise keep defaults
          if (validLanes.length > 0) {
            typedRoles[champion] = validLanes;
          }
        }
      });
      
      setChampionRoles(typedRoles);
    } catch (error) {
      console.error('Failed to load champion roles:', error);
      // Initialize with current championPools structure if API fails
      setChampionRoles(initializeDefaultRoles());
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllChampionAvailability = async () => {
    try {
      // Load all availability records at once from the backend
      const availabilityMap = await apiService.getAllChampionAvailability();
      
      // Update availability state with data from backend
      // Champions not in the map default to available (true)
      const updated: Record<string, boolean> = {};
      allChampions.forEach(champion => {
        // If champion has a record, use its isAvailable value
        // If no record exists, default to available (true)
        updated[champion] = availabilityMap[champion] ?? true;
      });
      setChampionAvailability(updated);
    } catch (error) {
      console.error('Failed to load all champion availability:', error);
      // On error, keep existing availability (defaults to all true)
      // Don't update state to avoid flickering
    }
  };

  // Prefixed with underscore as this function is for future availability management features
  // @ts-expect-error - Intentionally unused, reserved for future UI features
  const _handleSetUnavailable = async (champion: string) => {
    try {
      setSettingUnavailable((prev: Record<string, boolean>) => ({ ...prev, [champion]: true }));
      await apiService.setChampionUnavailable(champion);
      
      // Reload all availability from server to ensure we have the correct values
      await loadAllChampionAvailability();
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error(`Failed to set ${champion} as unavailable:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSaveErrorMessage(`Failed to set ${champion} as unavailable: ${errorMessage}`);
      setSaveStatus('error');
    } finally {
      setSettingUnavailable((prev: Record<string, boolean>) => ({ ...prev, [champion]: false }));
    }
  };

  const toggleLane = (champion: string, lane: Lane) => {
    setChampionRoles(prev => {
      const currentRoles = prev[champion] || [];
      const newRoles = currentRoles.includes(lane)
        ? currentRoles.filter(l => l !== lane)
        : [...currentRoles, lane];
      return { ...prev, [champion]: newRoles };
    });
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      setSaveErrorMessage('');
      // Convert Lane[] to string[] for API (they're compatible)
      const rolesToSave: Record<string, string[]> = {};
      Object.entries(championRoles).forEach(([champion, laneArray]) => {
        rolesToSave[champion] = laneArray;
      });
      console.log('Saving champion roles:', rolesToSave);
      await apiService.saveChampionRoles(rolesToSave);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save champion roles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSaveErrorMessage(errorMessage);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };


  const filteredChampions = allChampions.filter(champion =>
    champion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-400">Loading champion roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search champions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isSaving
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Save Status */}
      {saveStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-emerald-400 bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Champion roles saved successfully!</span>
        </motion.div>
      )}

      {saveStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 text-red-400 bg-red-500/20 border border-red-500/50 rounded-lg p-3"
        >
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Failed to save champion roles</span>
          </div>
          {saveErrorMessage && (
            <div className="text-sm text-red-300 ml-7">
              {saveErrorMessage}
            </div>
          )}
          <div className="text-sm text-red-300 ml-7">
            Check the browser console for more details.
          </div>
        </motion.div>
      )}

      {/* Champions List */}
      <div className="bg-slate-700/50 rounded-lg border border-slate-600 max-h-[60vh] overflow-y-auto">
        <div className="p-4 space-y-3">
          {filteredChampions.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              No champions found matching "{searchTerm}"
            </div>
          ) : (
            filteredChampions.map((champion) => {
              const roles = championRoles[champion] || [];
              return (
                <div
                  key={champion}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-600/50 hover:border-slate-500 transition-colors"
                >
                  <div className="font-semibold text-white min-w-[180px]">{champion}</div>
                  <div className="flex flex-wrap gap-2 flex-1">
                    {lanes.map((lane) => {
                      const isSelected = roles.includes(lane);
                      const info = laneInfo[lane];
                      return (
                        <button
                          key={lane}
                          onClick={() => toggleLane(champion, lane)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-opacity-80 text-white border-2 shadow-lg'
                              : 'bg-slate-700 text-slate-300 border-2 border-slate-600 hover:border-slate-500'
                          }`}
                          style={{
                            backgroundColor: isSelected ? info.color : undefined,
                            borderColor: isSelected ? `${info.color}80` : undefined,
                          }}
                        >
                          {info.icon} {info.display}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info */}
      <div className="text-sm text-slate-400 bg-slate-800/50 border border-slate-700 rounded-lg p-3">
        <p>💡 Click on role buttons to toggle which lanes each champion can play. Changes are saved to the database and can be used to generate the champions.ts file.</p>
      </div>
    </div>
  );
}

