import { useState } from 'react';
import { Lane, championPools, laneInfo } from '../data/champions';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

interface AdminTeamCreatorProps {
  onClose: () => void;
}

export default function AdminTeamCreator({ onClose }: AdminTeamCreatorProps) {
  const { createAdminTeam, savedTeams } = useAppStore();
  const [selectedChampions, setSelectedChampions] = useState<Record<Lane, string | null>>({
    top: null,
    jungle: null,
    mid: null,
    adc: null,
    support: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Get champions that are already in saved teams
  const usedChampions = new Set<string>();
  savedTeams.forEach(team => {
    Object.values(team.team).forEach(champion => {
      if (champion) {
        usedChampions.add(champion);
      }
    });
  });

  const handleSelectChampion = (lane: Lane, value: string) => {
    const champion = value === '' ? null : value;
    setSelectedChampions(prev => ({
      ...prev,
      [lane]: champion,
    }));
    setSubmitStatus('idle');
  };

  const handleSubmit = async () => {
    // Check if at least one champion is selected
    if (!Object.values(selectedChampions).some(champ => champ !== null)) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      await createAdminTeam(selectedChampions);
      setSubmitStatus('success');
      
      // Reset form after successful submission
      setTimeout(() => {
        setSelectedChampions({
          top: null,
          jungle: null,
          mid: null,
          adc: null,
          support: null,
        });
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Failed to create admin team:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSelection = Object.values(selectedChampions).some(champ => champ !== null);

  return (
    <div className="space-y-6">
      <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
        <p className="text-sm text-slate-300">
          Create a saved team manually. Champions in saved teams will be removed from the randomizer until "Reset Champions" is clicked.
        </p>
      </div>

      {/* Team Selection with Dropdowns */}
      <div className="space-y-4">
        {(Object.keys(championPools) as Lane[]).map((lane) => {
          const champions = championPools[lane];
          const selected = selectedChampions[lane];
          const laneColor = laneInfo[lane].color;
          const laneIcon = laneInfo[lane].icon;
          const laneDisplay = laneInfo[lane].display;

          return (
            <div key={lane} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{laneIcon}</span>
                <label className="text-lg font-bold" style={{ color: laneColor }}>
                  {laneDisplay}
                </label>
              </div>
              
              <select
                value={selected || ''}
                onChange={(e) => handleSelectChampion(lane, e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ 
                  borderColor: selected ? laneColor : undefined,
                  borderWidth: selected ? '2px' : '1px'
                }}
              >
                <option value="">-- Select Champion --</option>
                {champions.map((champion) => {
                  const isUsed = usedChampions.has(champion);
                  return (
                    <option
                      key={champion}
                      value={champion}
                      disabled={isUsed}
                      style={{ 
                        color: isUsed ? '#64748b' : '#ffffff',
                        textDecoration: isUsed ? 'line-through' : 'none'
                      }}
                    >
                      {champion} {isUsed ? '(Already in saved team)' : ''}
                    </option>
                  );
                })}
              </select>
              
              {selected && (
                <p className="text-sm text-slate-400 mt-2">
                  Selected: <span className="text-white font-semibold">{selected}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Team Preview */}
      {hasSelection && (
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
          <h3 className="font-bold mb-2">Team Preview:</h3>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(selectedChampions) as Lane[]).map((lane) => {
              const champ = selectedChampions[lane];
              if (!champ) return null;
              return (
                <span
                  key={lane}
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    backgroundColor: `${laneInfo[lane].color}20`,
                    color: laneInfo[lane].color,
                    border: `1px solid ${laneInfo[lane].color}40`,
                  }}
                >
                  {laneInfo[lane].icon} {laneInfo[lane].display}: {champ}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Messages */}
      <AnimatePresence>
        {submitStatus === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Team created successfully! Champions removed from randomizer.</span>
          </motion.div>
        )}
        {submitStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400"
          >
            <XCircle className="w-5 h-5" />
            <span>Please select at least one champion, or an error occurred.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-slate-600">
        <button
          onClick={handleSubmit}
          disabled={!hasSelection || isSubmitting}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
        >
          {isSubmitting ? 'Creating...' : 'Create Team'}
        </button>
        <button
          onClick={onClose}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

