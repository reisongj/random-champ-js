import { useState } from 'react';
import { Shield, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminTeamCreator from './AdminTeamCreator';

const ADMIN_PASSWORD = 'fuzzyisthegoat';

export default function AdminButton() {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleOpen = () => {
    setShowPasswordModal(true);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setShowPasswordModal(false);
      setShowAdminPanel(true);
      setPassword('');
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  const handleClose = () => {
    setShowAdminPanel(false);
    setShowPasswordModal(false);
    setPassword('');
    setError('');
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center gap-2 text-sm"
      >
        <Shield className="w-4 h-4" />
        <span className="hidden sm:inline">Admin</span>
      </button>

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
                  <Shield className="w-6 h-6" />
                  Admin Access
                </h2>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Submit
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

      {/* Admin Panel */}
      <AnimatePresence>
        {showAdminPanel && (
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
              className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-600"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="w-6 h-6" />
                  Admin Panel
                </h2>
                <button
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <AdminTeamCreator onClose={handleClose} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

