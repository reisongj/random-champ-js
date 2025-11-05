import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { championPools, laneInfo } from './data/champions';
import Lane from './components/Lane';
import ReRandomizeSection from './components/ReRandomizeSection';
import LockInButton from './components/LockInButton';
import ResetButton from './components/ResetButton';
import SavedTeamsButton from './components/SavedTeamsButton';
import IncompleteTeamsButton from './components/IncompleteTeamsButton';
import StartNewTeamButton from './components/StartNewTeamButton';
import LockedConfirmation from './components/LockedConfirmation';

function App() {
  const {
    randomizedLanes,
    loadSavedTeams,
    teamLocked,
    selectedChampions,
  } = useAppStore();

  useEffect(() => {
    loadSavedTeams();
  }, [loadSavedTeams]);

  // Check if all lanes are randomized
  const allLanesRandomized = randomizedLanes.size === Object.keys(championPools).length;
  // Show re-randomize section if all lanes are randomized
  // Show lock-in button after re-randomize is used (handled by ReRandomizeSection)

  return (
    <div className="h-screen bg-slate-800 text-slate-50 flex flex-col overflow-auto">
      <div className="container mx-auto px-4 py-6 flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-6 flex-shrink-0">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            League of Legends
          </h1>
          <p className="text-xl text-slate-400">Random Champion Selector</p>
        </div>

        {/* Lanes Grid - Flex to fill available space */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 flex-1 items-stretch">
          {Object.entries(laneInfo).map(([lane, info]) => (
            <Lane key={lane} lane={lane as keyof typeof laneInfo} />
          ))}
        </div>

        {/* Re-randomize Section */}
        {allLanesRandomized && (
          <div className="flex-shrink-0 mb-4">
            <ReRandomizeSection />
          </div>
        )}

        {/* Locked Confirmation */}
        {teamLocked && (
          <LockedConfirmation />
        )}

        {/* Bottom Actions */}
        <div className="flex justify-center gap-4 flex-shrink-0 flex-wrap">
          <ResetButton />
          <StartNewTeamButton />
          <IncompleteTeamsButton />
          <SavedTeamsButton />
        </div>
      </div>
    </div>
  );
}

export default App;

