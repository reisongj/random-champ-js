import { useAppStore } from '../store/useAppStore';

export default function StartNewTeamButton() {
  const { saveAndStartNewTeam, randomizedLanes } = useAppStore();
  
  // Only show button if there's at least one randomized lane
  const hasProgress = randomizedLanes.size > 0;

  if (!hasProgress) {
    return null;
  }

  return (
    <button
      onClick={saveAndStartNewTeam}
      className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
    >
      💾 Save & Start New Team
    </button>
  );
}

