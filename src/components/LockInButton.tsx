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
        className={`px-8 py-4 font-bold text-lg rounded-xl transition-all duration-200 shadow-lg ${
          canLock
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white hover:scale-105 active:scale-95 cursor-pointer border-2 border-emerald-500/50 hover:shadow-xl'
            : 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50 border-2 border-slate-500/30'
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

