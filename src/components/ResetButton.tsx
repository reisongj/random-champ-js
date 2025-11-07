import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, CheckCircle2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Lane, laneInfo } from '../data/champions';

const ADMIN_PASSWORD = 'fuzzyisthegoat';

export default function ResetButton() {
  const { resetChampionsByRoles } = useAppStore();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<Lane>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const allLanes: Lane[] = ['top', 'jungle', 'mid', 'adc', 'support'];

  const handleOpen = () => {
    setShowPasswordModal(true);
    setPassword('');
    setError('');
    setSelectedRoles(new Set());
    setSelectAll(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setShowPasswordModal(false);
      setShowRoleSelection(true);
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  const handleResetSubmit = async () => {
    if (selectedRoles.size === 0) {
      setError('Please select at least one role to reset');
      return;
    }

    setError('');
    const rolesToReset = Array.from(selectedRoles);
    await resetChampionsByRoles(rolesToReset);
    setShowRoleSelection(false);
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2000);
    setSelectedRoles(new Set());
    setSelectAll(false);
  };

  const handleRoleToggle = (role: Lane) => {
    const newSelected = new Set(selectedRoles);
    if (newSelected.has(role)) {
      newSelected.delete(role);
    } else {
      newSelected.add(role);
    }
    setSelectedRoles(newSelected);
    setSelectAll(newSelected.size === allLanes.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRoles(new Set());
      setSelectAll(false);
    } else {
      setSelectedRoles(new Set(allLanes));
      setSelectAll(true);
    }
  };

  const handleClose = () => {
    setShowPasswordModal(false);
    setShowRoleSelection(false);
    setPassword('');
    setError('');
    setSelectedRoles(new Set());
    setSelectAll(false);
  };

  return (
    <>
      <motion.button
        onClick={handleOpen}
        className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center gap-2 text-sm"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset champions</span>
      </motion.button>

      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={handleClose}
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
                  <RotateCcw className="w-6 h-6" />
                  Reset Champions
                </h2>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-300">
                  ⚠️ Warning: This will delete saved teams and reset champions for selected roles. This action cannot be undone.
                </p>
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
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
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

      {/* Role Selection Modal */}
      <AnimatePresence>
        {showRoleSelection && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={handleClose}
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
                  <RotateCcw className="w-6 h-6" />
                  Select Roles to Reset
                </h2>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4 bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-300">
                  ⚠️ This will reset champions from selected roles, making ALL champions in those roles available again (even if they're in saved teams). Saved teams will be kept.
                </p>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors mb-2">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-red-600 bg-slate-600 border-slate-500 rounded focus:ring-red-500"
                  />
                  <span className="font-semibold text-lg">Select All</span>
                </label>
                
                <div className="space-y-2">
                  {allLanes.map((lane) => {
                    const laneData = laneInfo[lane];
                    const isSelected = selectedRoles.has(lane);
                    return (
                      <label
                        key={lane}
                        className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                        style={{
                          border: isSelected ? `2px solid ${laneData.color}` : '2px solid transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRoleToggle(lane)}
                          className="w-4 h-4 text-red-600 bg-slate-600 border-slate-500 rounded focus:ring-red-500"
                        />
                        <span className="text-xl">{laneData.icon}</span>
                        <span className="font-medium" style={{ color: laneData.color }}>
                          {laneData.display}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleResetSubmit}
                  disabled={selectedRoles.size === 0}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold"
                >
                  Reset Selected Roles
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Confirmation */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 glass border border-emerald-500/50 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Champions Reset!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

