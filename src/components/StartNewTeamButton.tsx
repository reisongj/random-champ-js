import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export default function StartNewTeamButton() {
  const { saveAndStartNewTeam, randomizedLanes } = useAppStore();
  
  // Only show button if there's at least one randomized lane
  const hasProgress = randomizedLanes.size > 0;

  if (!hasProgress) {
    return null;
  }

  return (
    <motion.button
      onClick={saveAndStartNewTeam}
      className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-blue-400/40 hover:border-blue-400/60 flex items-center gap-2 text-sm"
      style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Save className="w-4 h-4" />
      <span className="hidden sm:inline">Save & Start New</span>
    </motion.button>
  );
}

