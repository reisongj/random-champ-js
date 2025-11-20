import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Lane, laneInfo } from '../data/champions';

export default function LockedConfirmation() {
  const { getAllPlayedCount, getAvailableCount, availableChampions } = useAppStore();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  const playedCount = getAllPlayedCount();
  // Count unique champions across all available champions (not pools)
  const allChampions = new Set<string>();
  Object.values(availableChampions).forEach((champs) => {
    champs.forEach((champ) => allChampions.add(champ));
  });
  const totalUnique = allChampions.size;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-slate-800 border-2 border-emerald-600 rounded-lg p-6 z-50 max-w-md shadow-2xl">
      <div className="text-center mb-4">
        <div className="text-3xl mb-2">✅</div>
        <h3 className="text-xl font-bold text-emerald-500">Team Locked In!</h3>
      </div>

      <div className="bg-slate-700 rounded-lg p-4 mb-4">
        <div className="text-center font-bold mb-3">
          Total Champions Played: {playedCount}/{totalUnique}
        </div>

        <div className="space-y-2">
          {Object.entries(laneInfo).map(([lane, info]) => {
            const remaining = getAvailableCount(lane as keyof typeof laneInfo);
            // Use availableChampions count (from database) instead of championPools
            const total = availableChampions[lane as Lane]?.length || 0;

            return (
              <div key={lane} className="text-sm">
                {info.icon} {info.display}: {remaining}/{total} available
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

