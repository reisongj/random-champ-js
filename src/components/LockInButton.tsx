import { useAppStore } from '../store/useAppStore';

export default function LockInButton() {
  const { lockInTeam, canLockIn, pendingSelections } = useAppStore();
  const canLock = canLockIn();
  const pendingCount = Object.keys(pendingSelections).filter(
    lane => pendingSelections[lane as keyof typeof pendingSelections] === null
  ).length;

  return (
    <div className="text-center mb-8">
      <button
        onClick={lockInTeam}
        disabled={!canLock}
        className={`px-8 py-4 font-bold text-lg rounded-lg transition-all duration-200 shadow-lg ${
          canLock
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
            : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
        }`}
      >
        {canLock ? (
          '🔒 LOCK IN TEAM'
        ) : (
          `⚠️ Complete ${pendingCount} pending selection${pendingCount !== 1 ? 's' : ''} first`
        )}
      </button>
    </div>
  );
}

