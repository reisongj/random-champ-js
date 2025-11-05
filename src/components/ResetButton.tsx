import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function ResetButton() {
  const { resetAllChampions } = useAppStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = async () => {
    await resetAllChampions();
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2000);
  };

  return (
    <>
      <motion.button
        onClick={handleReset}
        className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center gap-2 text-sm"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <RotateCcw className="w-4 h-4" />
        <span className="hidden sm:inline">Reset champions</span>
      </motion.button>
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 glass border border-emerald-500/50 text-white px-6 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            All Champions Reset!
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

