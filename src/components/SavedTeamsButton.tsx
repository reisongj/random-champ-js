import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Lane } from '../data/champions';

export default function SavedTeamsButton() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
      >
        📁 Saved Teams
      </button>
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <SavedTeamsContent onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function SavedTeamsContent({ onClose }: { onClose: () => void }) {
  const { savedTeams, displayTeam, returnToRandomize, loadSavedTeams } = useAppStore();

  useEffect(() => {
    loadSavedTeams();
  }, [loadSavedTeams]);

  const handleDisplay = (team: Record<string, string | null>) => {
    displayTeam(team as Record<Lane, string | null>);
    onClose();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Saved Teams</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-2xl"
        >
          ×
        </button>
      </div>

      {savedTeams.length === 0 ? (
        <p className="text-slate-400 text-center py-8">No saved teams yet.</p>
      ) : (
        <div className="space-y-4">
          {[...savedTeams].reverse().map((item, idx) => {
            const date = new Date(item.timestamp);
            const dateStr = date.toLocaleString();

            return (
              <div
                key={idx}
                className="bg-slate-700 rounded-lg p-4 border border-slate-600"
              >
                <div className="font-bold mb-2">{dateStr}</div>
                <div className="text-sm text-slate-300 mb-3">
                  {Object.entries(item.team)
                    .map(([lane, champ]) => `${lane.toUpperCase()}: ${champ || '-'}`)
                    .join(' | ')}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDisplay(item.team)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
                  >
                    Display
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(item, null, 2));
                      alert('Details copied to clipboard!');
                    }}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded transition-colors text-sm"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            returnToRandomize();
            onClose();
          }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
        >
          ↩️ Back to Randomize
        </button>
      </div>
    </div>
  );
}

