import { useState, useRef, useEffect } from 'react';
import { Lane, laneInfo } from '../data/champions';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Upload, FileText } from 'lucide-react';
import { SavedTeam } from '../types';

interface AdminTeamCreatorProps {
  onClose: () => void;
}

export default function AdminTeamCreator({ onClose }: AdminTeamCreatorProps) {
  const { createAdminTeam, createAdminTeamFromSavedTeam, savedTeams, championPools, getAvailableChampions, loadAllAvailableChampions } = useAppStore();
  const [selectedChampions, setSelectedChampions] = useState<Record<Lane, string | null>>({
    top: null,
    jungle: null,
    mid: null,
    adc: null,
    support: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [jsonText, setJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available champions when component mounts
  useEffect(() => {
    loadAllAvailableChampions().catch(console.error);
  }, [loadAllAvailableChampions]);

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

  const validateTeam = (team: any): team is Record<Lane, string | null> => {
    if (!team || typeof team !== 'object') return false;
    
    const lanes: Lane[] = ['top', 'jungle', 'mid', 'adc', 'support'];
    for (const lane of lanes) {
      if (!(lane in team)) return false;
      if (team[lane] !== null && typeof team[lane] !== 'string') return false;
      // Validate champion name exists in the pool for that lane
      if (team[lane] !== null && typeof team[lane] === 'string') {
        const championName = team[lane] as string;
        if (!championPools[lane].includes(championName)) {
          return false;
        }
      }
    }
    return true;
  };

  const isSavedTeamFormat = (obj: any): obj is { team: Record<Lane, string | null>; timestamp: string; _id?: string } => {
    return obj && typeof obj === 'object' && 'team' in obj && 'timestamp' in obj && validateTeam(obj.team);
  };

  const processJsonData = async (jsonData: any) => {
    setUploadStatus('uploading');
    setUploadMessage('');
    setUploadProgress({ current: 0, total: 0 });

    try {
      // Handle both single team/SavedTeam and array of teams/SavedTeams
      const items: any[] = Array.isArray(jsonData) ? jsonData : [jsonData];

      // Validate all items and convert to SavedTeam format
      const savedTeams: { team: Record<Lane, string | null>; timestamp: string; _id?: string }[] = [];
      const invalidItems: number[] = [];

      items.forEach((item, index) => {
        if (isSavedTeamFormat(item)) {
          // It's a SavedTeam format with team and timestamp
          savedTeams.push({
            team: item.team,
            timestamp: item.timestamp,
            _id: item._id,
          });
        } else if (validateTeam(item)) {
          // It's just a team object, create a SavedTeam with current timestamp
          savedTeams.push({
            team: item,
            timestamp: new Date().toISOString(),
          });
        } else {
          invalidItems.push(index);
        }
      });

      if (invalidItems.length > 0) {
        setUploadStatus('error');
        setUploadMessage(`Invalid team format at index(es): ${invalidItems.join(', ')}. Each team must have all 5 lanes (top, jungle, mid, adc, support) with valid champion names or null, or be a SavedTeam object with team and timestamp properties.`);
        return;
      }

      // Create teams one by one
      setUploadProgress({ current: 0, total: savedTeams.length });
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < savedTeams.length; i++) {
        try {
          const savedTeam: SavedTeam = {
            timestamp: savedTeams[i].timestamp,
            team: savedTeams[i].team,
            isAdminCreated: true,
          };
          await createAdminTeamFromSavedTeam(savedTeam);
          successCount++;
        } catch (error) {
          console.error(`Failed to create team ${i + 1}:`, error);
          errorCount++;
        }
        setUploadProgress({ current: i + 1, total: savedTeams.length });
      }

      if (errorCount === 0) {
        setUploadStatus('success');
        setUploadMessage(`Successfully created ${successCount} team(s)!`);
      } else {
        setUploadStatus('error');
        setUploadMessage(`Created ${successCount} team(s), but ${errorCount} failed.`);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to process JSON:', error);
      setUploadStatus('error');
      setUploadMessage('Invalid JSON. Please check the format and try again.');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      await processJsonData(jsonData);
    } catch (error) {
      console.error('Failed to parse JSON file:', error);
      setUploadStatus('error');
      setUploadMessage('Invalid JSON file. Please check the format and try again.');
    }
  };

  const handlePasteJson = async () => {
    if (!jsonText.trim()) {
      setUploadStatus('error');
      setUploadMessage('Please paste JSON data.');
      return;
    }

    try {
      const jsonData = JSON.parse(jsonText);
      await processJsonData(jsonData);
      setJsonText(''); // Clear textarea on success
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      setUploadStatus('error');
      setUploadMessage('Invalid JSON. Please check the format and try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-600">
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'manual'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Manual Selection
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'upload'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          JSON Upload
        </button>
      </div>

      {activeTab === 'manual' && (
        <>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-sm text-slate-300">
              Create a saved team manually. Champions in saved teams will be removed from the randomizer until "Reset Champions" is clicked.
            </p>
          </div>

      {/* Team Selection with Dropdowns */}
      <div className="space-y-4">
        {(Object.keys(championPools) as Lane[]).map((lane) => {
          // Use available champions from database instead of all champions
          const availableChampions = getAvailableChampions(lane);
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
                <span className="text-sm text-slate-400 ml-auto">
                  ({availableChampions.length} available)
                </span>
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
                {availableChampions.length === 0 ? (
                  <option disabled>No champions available</option>
                ) : (
                  availableChampions.map((champion) => (
                    <option
                      key={champion}
                      value={champion}
                    >
                      {champion}
                    </option>
                  ))
                )}
              </select>
              
              {availableChampions.length === 0 && (
                <p className="text-sm text-yellow-400 mt-2">
                  All champions for this role have been used. Reset champions to make them available again.
                </p>
              )}
              
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
        </>
      )}

      {activeTab === 'upload' && (
        <>
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <p className="text-sm text-slate-300 mb-2">
              Upload a JSON file to create one or multiple teams at once.
            </p>
            <div className="bg-slate-800/50 rounded p-3 mt-3">
              <p className="text-xs text-slate-400 font-mono mb-2">Simple team format:</p>
              <pre className="text-xs text-slate-300 overflow-x-auto">
{`{
  "top": "Garen",
  "jungle": "Lee Sin",
  "mid": "Ahri",
  "adc": "Jinx",
  "support": "Thresh"
}`}
              </pre>
              <p className="text-xs text-slate-400 font-mono mt-3 mb-2">SavedTeam format (with timestamp):</p>
              <pre className="text-xs text-slate-300 overflow-x-auto">
{`{
  "_id": "690c17a459ad4122c0e303da",
  "timestamp": "2025-11-06T03:36:05.784Z",
  "team": {
    "top": "Poppy",
    "jungle": "Maokai",
    "mid": "Malzahar",
    "adc": "Xayah",
    "support": "Janna"
  }
}`}
              </pre>
              <p className="text-xs text-slate-400 font-mono mt-3 mb-2">Multiple teams (array):</p>
              <pre className="text-xs text-slate-300 overflow-x-auto">
{`[
  {
    "top": "Garen",
    "jungle": "Lee Sin",
    "mid": "Ahri",
    "adc": "Jinx",
    "support": "Thresh"
  },
  {
    "timestamp": "2025-11-06T03:36:05.784Z",
    "team": {
      "top": "Darius",
      "jungle": "Graves",
      "mid": "Zed",
      "adc": "Caitlyn",
      "support": "Leona"
    }
  }
]`}
              </pre>
            </div>
          </div>

          {/* JSON Paste */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <label className="block mb-2 text-sm font-medium">
              Paste JSON
            </label>
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setUploadStatus('idle');
                setUploadMessage('');
              }}
              placeholder='Paste JSON here, e.g. {"top": "Garen", "jungle": "Lee Sin", ...}'
              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] resize-y"
            />
            <button
              onClick={handlePasteJson}
              disabled={!jsonText.trim() || uploadStatus === 'uploading'}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              Process JSON
            </button>
          </div>

          {/* File Upload */}
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <label className="block mb-2 text-sm font-medium">
              Or Upload JSON File
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
                id="json-upload"
              />
              <label
                htmlFor="json-upload"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>
              {uploadProgress.total > 0 && (
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <span>Progress: {uploadProgress.current} / {uploadProgress.total}</span>
                    <div className="flex-1 bg-slate-600 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Upload Status Messages */}
          <AnimatePresence>
            {uploadStatus === 'uploading' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400"
              >
                <FileText className="w-5 h-5" />
                <span>Uploading and creating teams...</span>
              </motion.div>
            )}
            {uploadStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{uploadMessage || 'Teams created successfully!'}</span>
              </motion.div>
            )}
            {uploadStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400"
              >
                <XCircle className="w-5 h-5" />
                <span>{uploadMessage || 'An error occurred while uploading teams.'}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-600">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </>
      )}
    </div>
  );
}

