import { useAppStore } from '../store/useAppStore';
import { laneInfo } from '../data/champions';
import { Lane } from '../data/champions';
import LockInButton from './LockInButton';

export default function ReRandomizeSection() {
  const { rerandomizeLane, getAvailableChampions, hasUsedReroll, rerolledLanes } = useAppStore();

  const handleRerandomize = (lane: Lane) => {
    const available = getAvailableChampions(lane);
    if (available.length > 0 && !hasUsedReroll) {
      rerandomizeLane(lane);
    }
  };

  // Find which lane has been rerolled (if any)
  const rerolledLane = Object.keys(rerolledLanes)[0] as Lane | undefined;

  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Re-randomize a Role</h2>
      {hasUsedReroll && (
        <div className="text-sm text-yellow-400 mb-4">
          ⚠️ Re-roll already used for this team
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3 mb-4">
        {Object.entries(laneInfo).map(([lane, info]) => {
          const available = getAvailableChampions(lane as Lane);
          const hasAvailable = available.length > 0;
          const isRerolledLane = rerolledLane === lane;
          
          return (
            <button
              key={lane}
              onClick={() => handleRerandomize(lane as Lane)}
              disabled={!hasAvailable || hasUsedReroll}
              className={`px-5 py-3 rounded-xl font-bold text-white transition-all duration-200 shadow-lg ${
                hasAvailable && !hasUsedReroll
                  ? 'hover:scale-110 active:scale-95 cursor-pointer border-2 shadow-xl hover:shadow-2xl'
                  : 'opacity-50 cursor-not-allowed border-2 border-white/20'
              }`}
              style={{ 
                backgroundColor: info.color,
                borderColor: hasAvailable && !hasUsedReroll ? `${info.color}80` : undefined,
              }}
            >
              {info.icon} {info.display} {isRerolledLane && '✓'}
            </button>
          );
        })}
      </div>
      <LockInButton />
    </div>
  );
}

