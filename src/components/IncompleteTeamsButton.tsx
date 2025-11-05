import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Lane } from '../data/champions';

export default function IncompleteTeamsButton() {
  const [showModal, setShowModal] = useState(false);
  const { incompleteTeams, loadIncompleteTeam, deleteIncompleteTeam, loadIncompleteTeams } = useAppStore();

  useEffect(() => {
    loadIncompleteTeams();
  }, [loadIncompleteTeams]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="glass px-3 py-2 text-white rounded-lg transition-all duration-200 border border-white/20 hover:border-white/40 flex items-center gap-2 text-sm"
      >
        <FileText className="w-4 h-4" />
        <span className="hidden sm:inline">Incomplete</span>
        {incompleteTeams.length > 0 && (
          <span className="glass px-1.5 py-0.5 rounded text-xs border border-white/10">
            {incompleteTeams.length}
          </span>
        )}
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Incomplete Teams</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {incompleteTeams.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No incomplete teams.</p>
            ) : (
              <div className="space-y-4">
                {incompleteTeams.map((team) => {
                  const date = new Date(team.timestamp);
                  const dateStr = date.toLocaleString();
                  const pendingCount = Object.keys(team.pendingSelections).filter(
                    lane => team.pendingSelections[lane as Lane] === null
                  ).length;

                  return (
                    <div
                      key={team.id}
                      className="bg-slate-700 rounded-lg p-4 border border-slate-600"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold">{dateStr}</div>
                        {pendingCount > 0 && (
                          <div className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">
                            {pendingCount} pending
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-300 mb-3">
                        {Object.entries(team.team)
                          .map(([lane, champ]) => `${lane.toUpperCase()}: ${champ || '-'}`)
                          .join(' | ')}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            loadIncompleteTeam(team.id);
                            setShowModal(false);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors text-sm"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            deleteIncompleteTeam(team.id);
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

