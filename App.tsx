import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import SetupPage from './components/SetupPage';
import WardrobePage from './components/WardrobePage';
import { UserModelProvider, useUserModel } from './hooks/useUserModel';
import { defaultWardrobe } from './wardrobe';
import { WardrobeItem, OutfitLayer } from './types';
// FIX: Import Transition type from framer-motion.
import { AnimatePresence, motion, Transition } from 'framer-motion';
import Canvas from './components/Canvas';
import CurrentOutfitPanel from './components/CurrentOutfitPanel';
import WardrobePanel from './components/WardrobeModal';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';

export type Page = 'setup' | 'try-on' | 'wardrobe';

const POSE_INSTRUCTIONS = [
  "A relaxed standing pose, facing forward.",
  "Slightly turned, 3/4 view to the left.",
  "Walking towards the camera, mid-stride.",
  "Leaning casually against a plain wall.",
  "Side profile view, looking straight ahead.",
  "Hands in pockets, looking at the camera.",
];

const DEFAULT_MODEL_URL = "https://raw.githubusercontent.com/daniele21/smart-wardrobe/refs/heads/main/examples/stand-profile.png";

const TryOnView = ({ wardrobe, poseInstructions }: { wardrobe: WardrobeItem[], poseInstructions: string[] }) => {
    const { modelImageUrl: userModelImageUrl, isLoading: isModelLoading } = useUserModel();
    const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);

    // Use the user's model if it exists, otherwise fall back to the default.
    const modelImageUrl = userModelImageUrl || DEFAULT_MODEL_URL;

    const handleStartOver = () => {
        setOutfitHistory([]);
        setCurrentPoseIndex(0);
        setError(null);
    };

    const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
        setError(null);
        setIsLoading(true);
        setLoadingMessage(`Styling your new look with ${garmentInfo.name}...`);

        try {
            const currentTryOnImage = outfitHistory.length > 0 ? outfitHistory[outfitHistory.length - 1].poseImages[poseInstructions[0]] : modelImageUrl;
            const newImageUrl = await generateVirtualTryOnImage(currentTryOnImage, garmentFile);
            const newLayer: OutfitLayer = {
                garment: garmentInfo,
                poseImages: { [poseInstructions[0]]: newImageUrl },
            };
            setOutfitHistory(prev => [...prev, newLayer]);
            setCurrentPoseIndex(0); // Reset to default pose on new garment
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to apply garment'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [modelImageUrl, outfitHistory, poseInstructions]);
    
    const handleRemoveLastGarment = () => {
        setOutfitHistory(prev => prev.slice(0, -1));
        setCurrentPoseIndex(0); // Reset pose when removing garment
    };

    const handleSelectPose = useCallback(async (poseIndex: number) => {
        const topLayer = outfitHistory[outfitHistory.length - 1];
        if (!topLayer || topLayer.poseImages[poseInstructions[poseIndex]]) {
            setCurrentPoseIndex(poseIndex);
            return;
        }

        setError(null);
        setIsLoading(true);
        setLoadingMessage(`Changing pose to: ${poseInstructions[poseIndex]}`);
        
        try {
            // Generate new pose from the default pose image of the current layer for consistency
            const basePoseImage = topLayer.poseImages[poseInstructions[0]];
            const newImageUrl = await generatePoseVariation(basePoseImage, poseInstructions[poseIndex]);
            
            setOutfitHistory(prev => {
                const newHistory = [...prev];
                const lastLayer = newHistory[newHistory.length - 1];
                lastLayer.poseImages[poseInstructions[poseIndex]] = newImageUrl;
                return newHistory;
            });
            setCurrentPoseIndex(poseIndex);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [outfitHistory, poseInstructions]);
    
    if (isModelLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Spinner />
                <p className="mt-4 text-lg text-gray-600 font-serif">Loading your model...</p>
            </div>
        );
    }
        
    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const displayImageUrl = outfitHistory.length > 0
        ? outfitHistory[outfitHistory.length - 1].poseImages[currentPoseInstruction] ?? outfitHistory[outfitHistory.length - 1].poseImages[poseInstructions[0]]
        : modelImageUrl;
        
    const displayOutfitStack: (OutfitLayer | { garment: null })[] = [{ garment: null }, ...outfitHistory];
    const activeGarmentIds = outfitHistory.map(l => l.garment.id);

    // Get keys of generated poses for the current outfit layer
    const availablePoseKeys = outfitHistory.length > 0
        ? Object.keys(outfitHistory[outfitHistory.length - 1].poseImages)
        : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full h-full max-w-7xl mx-auto animate-fade-in">
            <div className="lg:col-span-2 w-full h-full flex items-center justify-center">
                <Canvas
                    displayImageUrl={displayImageUrl}
                    onStartOver={handleStartOver}
                    isLoading={isLoading}
                    loadingMessage={loadingMessage}
                    onSelectPose={handleSelectPose}
                    poseInstructions={poseInstructions}
                    currentPoseIndex={currentPoseIndex}
                    availablePoseKeys={availablePoseKeys}
                    isPoseChangeEnabled={outfitHistory.length > 0}
                />
            </div>
            <div className="w-full h-full flex flex-col gap-6 overflow-y-auto bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-gray-200/80">
                <CurrentOutfitPanel
                    outfitHistory={displayOutfitStack}
                    onRemoveLastGarment={handleRemoveLastGarment}
                    onAddGarment={() => { /* Scroll to wardrobe or open modal in future */ }}
                />
                <WardrobePanel
                    onGarmentSelect={handleGarmentSelect}
                    activeGarmentIds={activeGarmentIds}
                    isLoading={isLoading}
                    wardrobe={wardrobe}
                />
                {error && <p className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded-md">{error}</p>}
            </div>
        </div>
    );
};


function App() {
  const [currentPage, setCurrentPage] = useState<Page>('try-on');
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(() => {
    try {
      const savedWardrobe = localStorage.getItem('wardrobe');
      return savedWardrobe ? JSON.parse(savedWardrobe) : defaultWardrobe;
    } catch (error) {
      console.error("Could not parse wardrobe from localStorage", error);
      return defaultWardrobe;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wardrobe', JSON.stringify(wardrobe));
    } catch (error) {
      console.error("Could not save wardrobe to localStorage", error);
    }
  }, [wardrobe]);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

  // FIX: Explicitly type `pageTransition` to avoid type inference issues with framer-motion.
  const pageTransition: Transition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'setup':
        return <SetupPage poseInstructions={POSE_INSTRUCTIONS} />;
      case 'try-on':
        return <TryOnView wardrobe={wardrobe} poseInstructions={POSE_INSTRUCTIONS} />;
      case 'wardrobe':
        return <WardrobePage wardrobe={wardrobe} setWardrobe={setWardrobe} />;
      default:
        return <SetupPage poseInstructions={POSE_INSTRUCTIONS} />;
    }
  };

  return (
    <UserModelProvider>
      <div className="min-h-screen bg-base-300 font-sans text-base-content flex flex-col">
        <Navbar currentPage={currentPage} onNavigate={handleNavigate} />
        <main className="flex-grow w-full p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full h-full"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </UserModelProvider>
  );
}

export default App;