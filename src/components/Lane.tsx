import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Lane as LaneType, laneInfo, championPools, BASE_IMAGE_URL, getChampionUrlName } from '../data/champions';
import Tooltip from './Tooltip';

interface LaneProps {
  lane: LaneType;
}

export default function Lane({ lane }: LaneProps) {
  const {
    selectedChampions,
    randomizedLanes,
    displayingSavedTeam,
    randomizeChampion,
    rerandomizeLane,
    selectRerollChampion,
    getAvailableChampions,
    getAvailableCount,
    rerolledLanes,
    pendingSelections,
  } = useAppStore();

  const champion = selectedChampions[lane];
  const isRandomized = randomizedLanes.has(lane) || (displayingSavedTeam && champion !== null);
  const availableCount = getAvailableCount(lane);
  const availableChampions = getAvailableChampions(lane);
  const info = laneInfo[lane];
  const rerolled = rerolledLanes[lane];
  const pendingSelection = pendingSelections[lane];
  const hasReroll = !!rerolled;
  const needsSelection = hasReroll && pendingSelection === null;

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayedChampion, setDisplayedChampion] = useState<string | null>(null);
  const [displayedImageUrl, setDisplayedImageUrl] = useState<string | null>(null);
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const finalChampionRef = useRef<string | null>(null);
  const prevChampionRef = useRef<string | null>(null);

  // Update displayed champion when animation is not running
  useEffect(() => {
    if (!isAnimating && champion) {
      const urlName = getChampionUrlName(champion);
      setImageUrl(`${BASE_IMAGE_URL}${urlName}.png`);
      setImageError(false);
      setDisplayedChampion(champion);
      setDisplayedImageUrl(`${BASE_IMAGE_URL}${urlName}.png`);
      prevChampionRef.current = champion;
    } else if (!isAnimating && !champion) {
      setImageUrl(null);
      setImageError(false);
      setDisplayedChampion(null);
      setDisplayedImageUrl(null);
      prevChampionRef.current = null;
    }
  }, [champion, isAnimating]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
    };
  }, []);

  const startAnimation = (finalChampion: string) => {
    // Start animation
    setIsAnimating(true);
    finalChampionRef.current = finalChampion;
    
    const animationDuration = 1500; // 1.5 seconds
    const intervalDuration = 80; // Change champion every 80ms
    const iterations = Math.floor(animationDuration / intervalDuration);
    
    let currentIteration = 0;
    
    // Clear any existing animation
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    
    const animationInterval = setInterval(() => {
      if (currentIteration < iterations) {
        // Show random champion during animation
        const randomChamp = availableChampions[
          Math.floor(Math.random() * availableChampions.length)
        ];
        setDisplayedChampion(randomChamp);
        
        const urlName = getChampionUrlName(randomChamp);
        setDisplayedImageUrl(`${BASE_IMAGE_URL}${urlName}.png`);
        
        currentIteration++;
      } else {
        // Animation complete - set final champion
        clearInterval(animationInterval);
        animationIntervalRef.current = null;
        
        // Use the final champion we chose
        setDisplayedChampion(finalChampion);
        const urlName = getChampionUrlName(finalChampion);
        setDisplayedImageUrl(`${BASE_IMAGE_URL}${urlName}.png`);
        
        // Reset animation state after a brief delay to show final champion
        setTimeout(() => {
          setIsAnimating(false);
          finalChampionRef.current = null;
          // The champion should now be in the store from the randomizeChampion call
          // If it doesn't match, the useEffect will update it
        }, 100);
      }
    }, intervalDuration);
    
    animationIntervalRef.current = animationInterval;
  };

  const handleRandomize = () => {
    if (availableChampions.length === 0 || isAnimating) return;
    
    // Call randomizeChampion first - it picks a champion and updates store synchronously
    randomizeChampion(lane);
    
    // Read the champion that was just selected from the store
    // Zustand updates are synchronous, so we can read it immediately
    const store = useAppStore.getState();
    const finalChampion = store.selectedChampions[lane];
    
    if (finalChampion) {
      // Start animation using the champion that was just selected
      startAnimation(finalChampion);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // Helper component for champion image
  const ChampionImage = ({ champion }: { champion: string }) => {
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    useEffect(() => {
      const urlName = getChampionUrlName(champion);
      setImgUrl(`${BASE_IMAGE_URL}${urlName}.png`);
      setImgError(false);
    }, [champion]);

    if (imgUrl && !imgError) {
      return (
        <img
          src={imgUrl}
          alt={champion}
          className="w-24 h-24 object-contain"
          onError={() => setImgError(true)}
        />
      );
    }
    return <div className="text-4xl">🎮</div>;
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Lane Header */}
      <div
        className="w-full px-4 py-3 rounded-t-lg text-center flex-shrink-0"
        style={{ backgroundColor: info.color }}
      >
        <div className="text-2xl mb-1">{info.icon}</div>
        <div className="text-sm font-bold uppercase">{info.display}</div>
        
        {/* Count Badge */}
        <Tooltip
          content={
            availableChampions.length > 0
              ? availableChampions.join('\n')
              : 'No champions available'
          }
        >
          <div className="mt-2 inline-block px-3 py-1 bg-black/20 rounded-md border-2 border-white/30">
            <span className="text-sm font-bold">{availableCount}</span>
          </div>
        </Tooltip>
      </div>

      {/* Champion Display */}
      {needsSelection ? (
        // Show both champions when rerolled and needs selection
        <div className="w-full bg-slate-700 rounded-b-lg p-4 flex flex-col items-center justify-center flex-1 border-2 border-yellow-500">
          <div className="text-sm font-bold text-yellow-400 mb-3">Choose your champion:</div>
          <div className="flex gap-4 w-full">
            {/* Original Champion */}
            <div
              className={`flex-1 flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
                pendingSelection === rerolled.original
                  ? 'bg-yellow-500/30 border-2 border-yellow-500'
                  : 'bg-slate-600/50 border-2 border-slate-500 hover:bg-slate-600'
              }`}
              onClick={() => selectRerollChampion(lane, rerolled.original)}
            >
              <ChampionImage champion={rerolled.original} />
              <div className="text-sm font-bold mt-2 text-center">{rerolled.original}</div>
              <div className="text-xs text-slate-400 mt-1">Original</div>
            </div>
            
            {/* Rerolled Champion */}
            <div
              className={`flex-1 flex flex-col items-center p-3 rounded-lg cursor-pointer transition-all ${
                pendingSelection === rerolled.rerolled
                  ? 'bg-yellow-500/30 border-2 border-yellow-500'
                  : 'bg-slate-600/50 border-2 border-slate-500 hover:bg-slate-600'
              }`}
              onClick={() => selectRerollChampion(lane, rerolled.rerolled)}
            >
              <ChampionImage champion={rerolled.rerolled} />
              <div className="text-sm font-bold mt-2 text-center">{rerolled.rerolled}</div>
              <div className="text-xs text-slate-400 mt-1">Rerolled</div>
            </div>
          </div>
        </div>
      ) : (
        // Normal single champion display
        <div
          className={`w-full bg-slate-700 rounded-b-lg p-4 flex flex-col items-center justify-center flex-1 border-2 border-slate-600 ${
            isAnimating ? 'animate-pulse' : ''
          }`}
        >
          {(displayedChampion || champion) ? (
            <>
              {((isAnimating ? displayedImageUrl : imageUrl) && !imageError) ? (
                <img
                  src={isAnimating ? displayedImageUrl! : imageUrl!}
                  alt={displayedChampion || champion || ''}
                  className={`w-32 h-32 object-contain mb-3 transition-opacity duration-75 ${
                    isAnimating ? 'opacity-90' : 'opacity-100'
                  }`}
                  onError={handleImageError}
                />
              ) : (
                <div className="text-6xl mb-3">🎮</div>
              )}
              <div className={`text-lg font-bold text-center px-2 transition-all duration-75 ${
                isAnimating ? 'opacity-90' : 'opacity-100'
              }`}>
                {displayedChampion || champion}
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl mb-3 text-slate-500">?</div>
              <div className="text-slate-400 text-sm">No champion selected</div>
            </>
          )}
        </div>
      )}

      {/* Randomize Button */}
      <button
        onClick={handleRandomize}
        disabled={isRandomized || availableChampions.length === 0 || isAnimating}
        className={`mt-4 px-6 py-3 rounded-lg font-bold text-white transition-all duration-200 flex-shrink-0 ${
          isRandomized || availableChampions.length === 0 || isAnimating
            ? 'bg-slate-600 cursor-not-allowed opacity-50'
            : 'hover:opacity-90 hover:scale-105 active:scale-95 cursor-pointer'
        }`}
        style={{
          backgroundColor: isRandomized || availableChampions.length === 0 || isAnimating
            ? undefined
            : info.color,
        }}
      >
        {isAnimating ? '🎲 RANDOMIZING...' : '🎲 RANDOMIZE'}
      </button>
    </div>
  );
}

