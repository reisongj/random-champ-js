import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { Lane as LaneType, laneInfo, BASE_IMAGE_URL, getChampionUrlName } from '../data/champions';
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
    hasUsedReroll,
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
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalChampionRef = useRef<string | null>(null);
  const prevChampionRef = useRef<string | null>(null);
  
  // Check if all lanes are randomized for re-randomize functionality (after state declarations)
  const allLanesRandomized = randomizedLanes.size === Object.keys(laneInfo).length;
  const canRerandomize = allLanesRandomized && !hasUsedReroll && availableChampions.length > 0 && !needsSelection && !isAnimating;

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

  const handleRandomize = async () => {
    if (availableChampions.length === 0 || isAnimating) return;
    
    // Call randomizeChampion - it picks a champion and updates store
    await randomizeChampion(lane);
    
    // Read the champion that was just selected from the store
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
    <div className="flex flex-col items-center mt-4">
      {/* Lane Header - Outside the card */}
      <div className="w-full mb-4 flex items-center justify-start gap-1.5">
        <div className="text-2xl">{info.icon}</div>
        <div className="text-base md:text-lg font-bold uppercase text-slate-300">{info.display}</div>
        
        {/* Count Badge */}
        <Tooltip
          content={
            availableChampions.length > 0
              ? availableChampions.join('\n')
              : 'No champions available'
          }
        >
          <div className="inline-flex items-center justify-center px-3 py-1 glass rounded-full">
            <span className="text-sm font-bold text-slate-200">{availableCount}</span>
          </div>
        </Tooltip>
      </div>

      {/* Champion Display */}
      {needsSelection ? (
        // Show both champions when rerolled and needs selection
        <div className="w-full glass rounded-2xl p-4 flex flex-col items-center justify-center border border-yellow-500/50 aspect-[5/6]">
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
          className={`w-full glass rounded-2xl border border-white/20 relative overflow-hidden aspect-[5/6] ${
            isAnimating ? 'animate-pulse' : ''
          } ${isRandomized ? 'border-emerald-500/30' : ''} ${
            !champion && !displayedChampion && availableChampions.length > 0 && !isAnimating ? 'hover:border-white/40' : ''
          } ${
            canRerandomize ? 'hover:border-yellow-500/50 cursor-pointer' : ''
          }`}
          onClick={() => {
            if (canRerandomize) {
              rerandomizeLane(lane);
            }
          }}
        >
          {(displayedChampion || champion) ? (
            <motion.div 
              className={`w-full h-full flex flex-col relative ${
                canRerandomize ? 'cursor-pointer' : ''
              }`}
              initial={{ padding: '0px' }}
              animate={{ 
                padding: isAnimating ? '0px' : '16px 16px 0px 16px'
              }}
              transition={{ duration: 0.5, ease: "easeOut", delay: isAnimating ? 0 : 0.3 }}
              onClick={() => {
                if (canRerandomize) {
                  rerandomizeLane(lane);
                }
              }}
            >
              {/* Champion Image - full during animation, then with padding */}
              {((isAnimating ? displayedImageUrl : imageUrl) && !imageError) ? (
                <motion.img
                  src={isAnimating ? displayedImageUrl! : imageUrl!}
                  alt={displayedChampion || champion || ''}
                  className={`w-full rounded-xl ${
                    isAnimating ? 'h-full object-cover' : 'object-contain'
                  }`}
                  style={{
                    borderRadius: isAnimating ? '0' : '0.75rem',
                  }}
                  onError={handleImageError}
                  initial={false}
                  animate={{ 
                    opacity: 1,
                    objectFit: isAnimating ? 'cover' : 'contain'
                  }}
                  transition={{ duration: 0.3 }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                  <div className="text-6xl mb-3">🎮</div>
                </div>
              )}
              {/* Champion Name - underneath the image */}
              <motion.div 
                className="absolute bottom-0 left-0 right-0 text-left pb-6 px-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: isAnimating ? 0 : 0.5 }}
              >
                <div className={`text-2xl text-slate-300 drop-shadow-lg transition-all duration-75 ${
                  isAnimating ? 'opacity-90' : 'opacity-100'
                }`}>
                  {displayedChampion || champion}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            // No champion selected - card is clickable to randomize
            <div 
              onClick={handleRandomize}
              className={`w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group ${
                availableChampions.length === 0 || isAnimating
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:scale-105'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                {/* Dice Icon */}
                <div className={`relative transition-all duration-200 ${
                  isAnimating ? 'animate-spin' : 'group-hover:scale-110'
                }`}>
                  <div className="relative w-16 h-16">
                    {/* Base white low opacity icon */}
                    <img
                      src={`${import.meta.env.BASE_URL}perspective-dice-random-svgrepo-com.svg`}
                      alt="Dice"
                      className={`w-full h-full transition-all duration-200 ${
                        availableChampions.length === 0 || isAnimating
                          ? 'opacity-20'
                          : 'opacity-25'
                      }`}
                      style={{
                        filter: 'brightness(0) invert(1)',
                      }}
                    />
                    {/* Gradient overlay on hover */}
                    <div 
                      className={`absolute inset-0 transition-opacity duration-200 ${
                        availableChampions.length === 0 || isAnimating
                          ? 'opacity-0'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      style={{
                        background: 'linear-gradient(135deg, #ec4899 0%, #14b8a6 100%)',
                        maskImage: `url(${import.meta.env.BASE_URL}perspective-dice-random-svgrepo-com.svg)`,
                        WebkitMaskImage: `url(${import.meta.env.BASE_URL}perspective-dice-random-svgrepo-com.svg)`,
                        maskSize: 'contain',
                        WebkitMaskSize: 'contain',
                        maskRepeat: 'no-repeat',
                        WebkitMaskRepeat: 'no-repeat',
                        maskPosition: 'center',
                        WebkitMaskPosition: 'center',
                      }}
                    />
                  </div>
                </div>
                {/* Text appears on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white text-sm">
                  {isAnimating ? 'Randomizing...' : 'Randomize'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

