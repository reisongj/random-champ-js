import { useAppStore } from '../store/useAppStore';

export default function ReRandomizeSection() {
  const { hasUsedReroll } = useAppStore();

  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold mb-4">Re-randomize a Role</h2>
      {hasUsedReroll ? (
        <div className="text-sm text-yellow-400 mb-4">
          ⚠️ Re-roll already used for this team
        </div>
      ) : (
        <div className="text-base text-slate-300 mb-4">
          Click on the role card you wish to re-randomize
        </div>
      )}
    </div>
  );
}

