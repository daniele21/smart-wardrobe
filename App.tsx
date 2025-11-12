
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Canvas from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { OutfitLayer, WardrobeItem } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';
import Navbar from './components/Navbar';
import WardrobePage from './components/WardrobePage';
import SetupPage from './components/SetupPage';
import { useUserModel, UserModelProvider } from './hooks/useUserModel';
import { cn } from './lib/utils';
import { useDebounce } from './hooks/useDebounce';

const POSE_INSTRUCTIONS = [
  "Full frontal view, hands on hips",
  "Slightly turned, 3/4 view",
  "Side profile view",
  "Jumping in the air, mid-action shot",
  "Walking towards camera",
  "Leaning against a wall",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};

const WARDROBE_STORAGE_KEY = 'virtual-try-on-wardrobe';

export type Page = 'try-on' | 'wardrobe' | 'setup';

const AppContent: React.FC = () => {
  const { modelImageUrl, deleteModel, isLoading: isModelLoading } = useUserModel();
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [currentPage, setCurrentPage] = useState<Page>('try-on');
  const isMobile = useMediaQuery('(max-width: 767px)');

  const debouncedWardrobe = useDebounce(wardrobe, 500);

  useEffect(() => {
    try {
      const storedWardrobe = localStorage.getItem(WARDROBE_STORAGE_KEY);
      if (storedWardrobe) {
        setWardrobe(JSON.parse(storedWardrobe));
      } else {
        setWardrobe(defaultWardrobe);
      }
    } catch (error) {
      console.error("Failed to load wardrobe from local storage:", error);
      setWardrobe(defaultWardrobe);
    }
  }, []);
  
  useEffect(() => {
    try {
      // Use the debounced wardrobe state for saving
      if (debouncedWardrobe.length > 0) {
        localStorage.setItem(WARDROBE_STORAGE_KEY, JSON.stringify(debouncedWardrobe));
      }
    } catch (error) {
      console.error("Failed to save wardrobe to local storage:", error);
    }
  }, [debouncedWardrobe]);

  useEffect(() => {
    if (!modelImageUrl) {
        setOutfitHistory([]);
        setCurrentPoseIndex(0);
    }
  }, [modelImageUrl]);

  useEffect(() => {
    if (!isModelLoading && !modelImageUrl) {
        setCurrentPage('setup');
    }
  }, [isModelLoading, modelImageUrl]);

  const currentOutfitLayer = useMemo(() => 
    outfitHistory.length > 0 ? outfitHistory[outfitHistory.length - 1] : null,
    [outfitHistory]
  );
  
  const activeGarmentIds = useMemo(() => 
    outfitHistory.map(layer => layer.garment.id), 
    [outfitHistory]
  );
  
  const displayImageUrl = useMemo(() => {
    if (!currentOutfitLayer) {
        return modelImageUrl;
    }
    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentOutfitLayer.poseImages[poseInstruction] ?? Object.values(currentOutfitLayer.poseImages)[0];
  }, [currentOutfitLayer, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (!currentOutfitLayer) return [];
    return Object.keys(currentOutfitLayer.poseImages);
  }, [currentOutfitLayer]);

  const handleStartOver = async () => {
    await deleteModel();
    setOutfitHistory([]);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
    localStorage.removeItem(WARDROBE_STORAGE_KEY);
    setCurrentPage('setup');
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    const baseImageUrl = displayImageUrl;
    if (!baseImageUrl || isLoading) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Adding ${garmentInfo.name}...`);
    setCurrentPoseIndex(0);

    try {
      const newImageUrl = await generateVirtualTryOnImage(baseImageUrl, garmentFile);
      const defaultPoseInstruction = POSE_INSTRUCTIONS[0];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [defaultPoseInstruction]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => [...prevHistory, newLayer]);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading]);

  const handleRemoveLastGarment = () => {
    if (outfitHistory.length > 0) {
      setOutfitHistory(prevHistory => prevHistory.slice(0, -1));
      setCurrentPoseIndex(0);
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || !currentOutfitLayer || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];

    if (currentOutfitLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    const baseImageForPoseChange = Object.values(currentOutfitLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`Changing pose...`);
    
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
      setOutfitHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const lastLayer = newHistory[newHistory.length - 1];
        lastLayer.poseImages[poseInstruction] = newImageUrl;
        return newHistory;
      });
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, isLoading, currentOutfitLayer]);

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };
  
  const renderPageContent = () => {
      switch (currentPage) {
        case 'wardrobe':
          return <WardrobePage wardrobe={wardrobe} setWardrobe={setWardrobe} />;
        case 'setup':
          return <SetupPage poseInstructions={POSE_INSTRUCTIONS} />;
        case 'try-on':
        default:
          return (
             <div className="relative flex flex-col h-full bg-white overflow-hidden">
                <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
                  <div className="w-full h-full flex-grow flex items-center justify-center bg-white pb-16 relative">
                    <Canvas 
                      displayImageUrl={displayImageUrl}
                      onStartOver={handleStartOver}
                      isLoading={isLoading}
                      loadingMessage={loadingMessage}
                      onSelectPose={handlePoseSelect}
                      poseInstructions={POSE_INSTRUCTIONS}
                      currentPoseIndex={currentPoseIndex}
                      availablePoseKeys={availablePoseKeys}
                      isPoseChangeEnabled={outfitHistory.length > 0}
                    />
                  </div>
                  <aside 
                    className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0`}
                    style={{ transitionProperty: 'transform' }}
                  >
                      <button 
                        onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                        className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50"
                        aria-label={isSheetCollapsed ? 'Expand panel' : 'Collapse panel'}
                      >
                        {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500" />}
                      </button>
                      <div className="p-4 md:p-6 pb-20 overflow-y-auto flex-grow flex flex-col gap-8">
                        {error && (
                          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                          </div>
                        )}
                        <OutfitStack
                          modelImageUrl={modelImageUrl} 
                          outfitHistory={outfitHistory}
                          onRemoveLastGarment={handleRemoveLastGarment}
                        />
                        <WardrobePanel
                          onGarmentSelect={handleGarmentSelect}
                          activeGarmentIds={activeGarmentIds}
                          isLoading={isLoading}
                          wardrobe={wardrobe}
                        />
                      </div>
                  </aside>
                </main>
                <AnimatePresence>
                  {isLoading && isMobile && (
                    <motion.div
                      className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Spinner />
                      {loadingMessage && (
                        <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          );
      }
  };

  return (
    <div className="font-sans bg-gray-50 min-h-screen">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main>
        <AnimatePresence mode="wait">
          {isModelLoading ? (
              <div className="w-full min-h-[calc(100vh-4rem)] flex items-center justify-center">
                  <Spinner />
              </div>
          ) : (
            <motion.div
                key={currentPage}
                className={cn(
                    // Base container styles
                    'w-full',
                    // Conditional layout styles
                    currentPage === 'try-on'
                    ? 'h-[calc(100vh-4rem)]' // Full-height container for the main app
                    : 'min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex items-center justify-center' // Padded, centered container for content pages
                )}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
                {renderPageContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <UserModelProvider>
    <AppContent />
  </UserModelProvider>
);

export default App;
