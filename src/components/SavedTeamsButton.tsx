import { useState, useEffect } from 'react';
import { FolderOpen, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Lane } from '../data/champions';

const ADMIN_PASSWORD = 'fuzzyisthegoat';

export default function SavedTeamsButton() {
  const [showModal, setShowModal] = useState(false);
  const { savedTeams, loadSavedTeams } = useAppStore();

  useEffect(() => {
    loadSavedTeams().catch(console.error);
  }, [loadSavedTeams]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center gap-2 text-sm"
      >
        <FolderOpen className="w-4 h-4" />
        <span className="hidden sm:inline">Saved</span>
        {savedTeams.length > 0 && (
          <span className="glass px-1.5 py-0.5 rounded text-xs border border-white/10">
            {savedTeams.length}
          </span>
        )}
      </button>
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SavedTeamsContent onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function SavedTeamsContent({ onClose }: { onClose: () => void }) {
  const { savedTeams, displayTeam, returnToRandomize, loadSavedTeams, deleteSavedTeam } = useAppStore();
  const [deletingTimestamp, setDeletingTimestamp] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingDeleteTimestamp, setPendingDeleteTimestamp] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  useEffect(() => {
    loadSavedTeams().catch(console.error);
  }, [loadSavedTeams]);

  const handleDisplay = (team: Record<string, string | null>) => {
    displayTeam(team as Record<Lane, string | null>);
    onClose();
  };

  const handleDeleteClick = (timestamp: string) => {
    // Clear bulk selection when doing single delete
    setSelectedTeams(new Set());
    setPendingDeleteTimestamp(timestamp);
    setShowPasswordModal(true);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setShowPasswordModal(false);
      setError('');
      
      // Handle bulk delete
      if (selectedTeams.size > 0) {
        const count = selectedTeams.size;
        if (!confirm(`Are you sure you want to delete ${count} team${count > 1 ? 's' : ''}? This will make the champions available for randomization again.`)) {
          setPassword('');
          return;
        }
        await handleBulkDelete();
        return;
      }
      
      // Handle single delete
      if (!pendingDeleteTimestamp) return;
      
      if (!confirm('Are you sure you want to delete this team? This will make the champions available for randomization again.')) {
        setPendingDeleteTimestamp(null);
        setPassword('');
        return;
      }

      setDeletingTimestamp(pendingDeleteTimestamp);
      try {
        await deleteSavedTeam(pendingDeleteTimestamp);
      } catch (error) {
        console.error('Failed to delete team:', error);
        alert('Failed to delete team. Please try again.');
      } finally {
        setDeletingTimestamp(null);
        setPendingDeleteTimestamp(null);
        setPassword('');
      }
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    setPendingDeleteTimestamp(null);
    setPassword('');
    setError('');
    // Don't clear selectedTeams here - let user keep selection if they cancel
  };

  const handleToggleSelect = (timestamp: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev);
      if (next.has(timestamp)) {
        next.delete(timestamp);
      } else {
        next.add(timestamp);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTeams.size === savedTeams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(savedTeams.map(team => team.timestamp)));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedTeams.size === 0) return;
    setShowPasswordModal(true);
    setPassword('');
    setError('');
  };

  const handleBulkDelete = async () => {
    if (selectedTeams.size === 0) return;
    
    setIsDeletingBulk(true);
    try {
      // Delete all selected teams
      const deletePromises = Array.from(selectedTeams).map(timestamp => 
        deleteSavedTeam(timestamp).catch(error => {
          console.error(`Failed to delete team ${timestamp}:`, error);
          return null; // Continue with other deletions even if one fails
        })
      );
      
      await Promise.all(deletePromises);
      setSelectedTeams(new Set());
      setShowPasswordModal(false);
      setPassword('');
    } catch (error) {
      console.error('Failed to delete teams:', error);
      alert('Some teams failed to delete. Please try again.');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Saved Teams</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-2xl"
        >
          ×
        </button>
      </div>

      {savedTeams.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-3 bg-slate-700 rounded-lg border border-slate-600">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedTeams.size === savedTeams.length && savedTeams.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium">
              Select All ({selectedTeams.size} selected)
            </span>
          </label>
          {selectedTeams.size > 0 && (
            <button
              onClick={handleBulkDeleteClick}
              disabled={isDeletingBulk}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {isDeletingBulk ? 'Deleting...' : `Delete Selected (${selectedTeams.size})`}
            </button>
          )}
        </div>
      )}

      {savedTeams.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No saved teams yet.</p>
      ) : (
        <div className="space-y-4">
          {savedTeams.map((item, idx) => {
            // Parse UTC timestamp and convert to local timezone
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            });

            const isSelected = selectedTeams.has(item.timestamp);
            
            return (
              <div
                key={idx}
                className={`bg-slate-700 rounded-lg p-4 border transition-colors ${
                  isSelected ? 'border-blue-500 bg-slate-650' : 'border-slate-600'
                }`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelect(item.timestamp)}
                    className="mt-1 w-4 h-4 text-blue-600 bg-slate-600 border-slate-500 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-bold">{dateStr}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-300 mb-3">
                  {Object.entries(item.team)
                    .map(([lane, champ]) => `${lane.toUpperCase()}: ${champ || '-'}`)
                    .join(' | ')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDisplay(item.team)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
                  >
                    Display
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(item, null, 2));
                      alert('Details copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors text-sm"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item.timestamp)}
                    disabled={deletingTimestamp === item.timestamp}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded transition-colors text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deletingTimestamp === item.timestamp ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            returnToRandomize();
            onClose();
          }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          ↩️ Back to Randomize
        </button>
      </div>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]"
            onClick={handlePasswordModalClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Trash2 className="w-6 h-6 text-red-500" />
                  {selectedTeams.size > 0 ? `Delete ${selectedTeams.size} Team${selectedTeams.size > 1 ? 's' : ''}` : 'Delete Team'}
                </h2>
                <button
                  onClick={handlePasswordModalClose}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Admin Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter admin password"
                    autoFocus
                  />
                  {error && (
                    <p className="text-red-400 text-sm mt-2">{error}</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    {selectedTeams.size > 0 ? `Delete ${selectedTeams.size} Team${selectedTeams.size > 1 ? 's' : ''}` : 'Delete Team'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordModalClose}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

