import { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { championPools, laneInfo } from './data/champions';
import Lane from './components/Lane';
import ReRandomizeSection from './components/ReRandomizeSection';
import ResetButton from './components/ResetButton';
import SavedTeamsButton from './components/SavedTeamsButton';
import IncompleteTeamsButton from './components/IncompleteTeamsButton';
import StartNewTeamButton from './components/StartNewTeamButton';
import ImageViewerButton from './components/ImageViewerButton';
import LockedConfirmation from './components/LockedConfirmation';

function App() {
  const {
    randomizedLanes,
    loadSavedTeams,
    teamLocked,
  } = useAppStore();

  useEffect(() => {
    loadSavedTeams();
  }, [loadSavedTeams]);

  // Check if all lanes are randomized
  const allLanesRandomized = randomizedLanes.size === Object.keys(championPools).length;
  // Show re-randomize section if all lanes are randomized
  // Show lock-in button after re-randomize is used (handled by ReRandomizeSection)

  return (
    <div className="min-h-screen text-slate-50 flex flex-col overflow-auto relative">
      {/* Dark gradient overlay at top */}
      <div className="fixed top-0 left-0 right-0 h-96 bg-gradient-to-b from-indigo-950/90 via-indigo-950/50 to-transparent pointer-events-none z-0" />
      <div className="container mx-auto px-4 py-6 flex flex-col h-full relative z-10">
        {/* Top Left Button */}
        <div className="fixed top-6 flex gap-2 z-20" style={{ left: '24px' }}>
          <ResetButton />
        </div>
        
        {/* Top Right Buttons */}
        <div className="fixed top-6 flex gap-2 z-20" style={{ right: '24px' }}>
          <IncompleteTeamsButton />
          <SavedTeamsButton />
        </div>

        {/* Bottom Buttons */}
        <div className="fixed bottom-6 flex justify-center w-full z-20" style={{ left: '0' }}>
          <StartNewTeamButton />
        </div>
        <div className="fixed bottom-6 flex gap-2 z-20" style={{ right: '24px' }}>
          <ImageViewerButton />
        </div>

        {/* Header */}
        <div className="text-center mb-8 flex-shrink-0">
          <div className="flex justify-center mb-1">
            <div className="h-24 md:h-32 lg:h-40 overflow-hidden flex items-center justify-center">
              <img 
                src="/League-of-Legends-Logo-2009-2019.png" 
                alt="League of Legends" 
                className="h-full w-auto object-contain"
              />
            </div>
          </div>
          <p className="text-xl text-slate-400">Random Champion Selector</p>
        </div>

        {/* Main Content Area - Vertically Centered */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Lanes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {Object.entries(laneInfo).map(([lane]) => (
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
        </div>
      </div>
    </div>
  );
}

export default App;

