import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import SetupPage from './components/SetupPage';
import WardrobePage from './components/WardrobePage';
import ImageUploadModal from './components/ImageUploadModal';
import { UserModelProvider, useUserModel } from './hooks/useUserModel';
import { defaultWardrobe } from './wardrobe';
import { WardrobeItem, OutfitLayer, ItemCategory } from './types';
import { AnimatePresence, motion, Transition } from 'framer-motion';
import Canvas from './components/Canvas';
import CurrentOutfitPanel from './components/CurrentOutfitPanel';
import WardrobePanel from './components/WardrobeModal';
import { generateVirtualTryOnImage, generatePoseVariation } from './services/geminiService';
import { getFriendlyErrorMessage, urlToDataUrl, urlToFile } from './lib/utils';
import Spinner from './components/Spinner';
import * as wardrobeRepo from './db/wardrobeRepository';

export type Page = 'setup' | 'try-on' | 'wardrobe' | 'image-editor';

const POSE_INSTRUCTIONS = [
  "A relaxed standing pose, facing forward.",
  "Slightly turned, 3/4 view to the left.",
  "Walking towards the camera, mid-stride.",
  "Leaning casually against a plain wall.",
  "Side profile view, looking straight ahead.",
  "Hands in pockets, looking at the camera.",
];

const DEFAULT_MODEL_URL = "https://cdn.jsdelivr.net/gh/daniele21/smart-wardrobe@main/examples/stand-profile.png";

const TryOnView = ({ wardrobe, onOpenUploadModal, poseInstructions }: { wardrobe: WardrobeItem[], onOpenUploadModal: () => void, poseInstructions: string[] }) => {
    const { modelImageUrl: userModelImageUrl, isLoading: isModelLoading } = useUserModel();
    const [fittedOutfits, setFittedOutfits] = useState<OutfitLayer[]>([]);
    const [selectedGarments, setSelectedGarments] = useState<Partial<Record<ItemCategory, WardrobeItem>>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
    const [baseModelPoses, setBaseModelPoses] = useState<Record<string, string>>({});

    const modelImageUrl = userModelImageUrl || DEFAULT_MODEL_URL;

    useEffect(() => {
        if (modelImageUrl) {
            const firstPose = poseInstructions[0];

            // Immediately set the base pose with the original URL for display.
            setBaseModelPoses({ [firstPose]: modelImageUrl });

            // If it's an external URL, convert it to a data URL in the background
            // to prevent CORS issues for canvas operations like posing.
            if (!modelImageUrl.startsWith('data:')) {
                urlToDataUrl(modelImageUrl)
                    .then(dataUrl => {
                        // Once converted, update the state with the CORS-safe data URL.
                        setBaseModelPoses({ [firstPose]: dataUrl });
                    })
                    .catch(err => {
                        console.error("Failed to pre-convert model URL to data URL:", err);
                        setError("Could not prepare model for posing due to a network restriction (CORS). Display is available but pose changes may fail.");
                    });
            }
        }
    }, [modelImageUrl, poseInstructions]);


    const handleStartOver = () => {
        setFittedOutfits([]);
        setSelectedGarments({});
        setCurrentPoseIndex(0);
        setError(null);
        if (modelImageUrl) {
            setBaseModelPoses({ [poseInstructions[0]]: modelImageUrl });
        }
    };

    const handleToggleGarment = useCallback((item: WardrobeItem) => {
        setSelectedGarments(prev => {
            const currentSelection = prev[item.category];
            if (currentSelection?.id === item.id) {
                const { [item.category]: _, ...rest } = prev;
                return rest;
            } else {
                return { ...prev, [item.category]: item };
            }
        });
    }, []);

    const handleFitOutfit = async () => {
        const garmentsToFit = Object.values(selectedGarments).filter(Boolean) as WardrobeItem[];
        if (garmentsToFit.length === 0) {
            setError("Please select at least one garment to fit.");
            return;
        }

        setError(null);
        setIsLoading(true);
        setLoadingMessage(`Styling your new look...`);

        try {
            const garmentFiles = await Promise.all(
                garmentsToFit.map(item => urlToFile(item.url, item.name))
            );
            
            const currentPoseInstruction = poseInstructions[currentPoseIndex];
            const baseImageForFitting = fittedOutfits.length > 0
                ? fittedOutfits[fittedOutfits.length - 1].poseImages[currentPoseInstruction]
                : baseModelPoses[currentPoseInstruction] ?? modelImageUrl;

            const newImageUrl = await generateVirtualTryOnImage(baseImageForFitting, garmentFiles);
            
            const newLayer: OutfitLayer = {
                garments: garmentsToFit,
                // The new outfit is generated in the current pose.
                poseImages: { [currentPoseInstruction]: newImageUrl },
            };
            setFittedOutfits(prev => [...prev, newLayer]);
            setSelectedGarments({});
            // Don't reset pose index, keep the current pose.
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to apply garments'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleClearSelection = () => {
        setSelectedGarments({});
    };

    const handleSelectPose = useCallback(async (poseIndex: number) => {
        const newPoseInstruction = poseInstructions[poseIndex];

        // Case 1: Posing the base model
        if (fittedOutfits.length === 0) {
            if (baseModelPoses[newPoseInstruction]) {
                setCurrentPoseIndex(poseIndex);
                return;
            }
            setError(null);
            setIsLoading(true);
            setLoadingMessage(`Changing pose to: ${newPoseInstruction}`);
            try {
                const baseModelImage = baseModelPoses[poseInstructions[0]];
                if (!baseModelImage) throw new Error("Base model image not found.");

                const newImageUrl = await generatePoseVariation(baseModelImage, newPoseInstruction);
                setBaseModelPoses(prev => ({ ...prev, [newPoseInstruction]: newImageUrl }));
                setCurrentPoseIndex(poseIndex);
            } catch (err) {
                setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
            }
            return;
        }

        // Case 2: Posing a fitted outfit
        const topLayer = fittedOutfits[fittedOutfits.length - 1];
        if (topLayer.poseImages[newPoseInstruction]) {
            setCurrentPoseIndex(poseIndex);
            return;
        }

        setError(null);
        setIsLoading(true);
        setLoadingMessage(`Changing pose to: ${poseInstructions[poseIndex]}`);
        
        try {
            // Generate new pose from the outfit's first generated image to maintain consistency
            const basePoseKey = Object.keys(topLayer.poseImages)[0];
            const basePoseImage = topLayer.poseImages[basePoseKey];
            const newImageUrl = await generatePoseVariation(basePoseImage, newPoseInstruction);
            
            setFittedOutfits(prev => {
                const newHistory = [...prev];
                const lastLayer = newHistory[newHistory.length - 1];
                lastLayer.poseImages[newPoseInstruction] = newImageUrl;
                return newHistory;
            });
            setCurrentPoseIndex(poseIndex);
        } catch (err) {
            setError(getFriendlyErrorMessage(err, 'Failed to change pose'));
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [fittedOutfits, poseInstructions, baseModelPoses]);
    
    if (isModelLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Spinner />
                <p className="mt-4 text-lg text-gray-600 font-serif">Loading your model...</p>
            </div>
        );
    }
        
    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const displayImageUrl = fittedOutfits.length > 0
        ? fittedOutfits[fittedOutfits.length - 1].poseImages[currentPoseInstruction] ?? Object.values(fittedOutfits[fittedOutfits.length - 1].poseImages)[0]
        : baseModelPoses[currentPoseInstruction] ?? modelImageUrl;
        
    const availablePoseKeys = fittedOutfits.length > 0
        ? Object.keys(fittedOutfits[fittedOutfits.length - 1].poseImages)
        : Object.keys(baseModelPoses);

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
                    isPoseChangeEnabled={!!modelImageUrl}
                />
            </div>
            <div className="w-full h-full flex flex-col gap-6 overflow-y-auto bg-white/60 backdrop-blur-sm p-4 rounded-lg border border-gray-200/80">
                <CurrentOutfitPanel
                    selectedGarments={selectedGarments}
                    onFitOutfit={handleFitOutfit}
                    onClearSelection={handleClearSelection}
                    onToggleGarment={handleToggleGarment}
                    isFitting={isLoading}
                />
                <WardrobePanel
                    onToggleGarment={handleToggleGarment}
                    onOpenUploadModal={onOpenUploadModal}
                    selectedGarments={selectedGarments}
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>([]);
  const [isWardrobeLoading, setIsWardrobeLoading] = useState(true);

  useEffect(() => {
    const loadWardrobe = async () => {
      try {
        setIsWardrobeLoading(true);
        let items = await wardrobeRepo.getWardrobe();
        if (items.length === 0) {
          // First time load, seed with default items
          await wardrobeRepo.saveMultipleWardrobeItems(defaultWardrobe);
          items = defaultWardrobe;
        }
        setWardrobe(items);
      } catch (error) {
        console.error("Failed to load wardrobe from IndexedDB", error);
        // Fallback to default wardrobe in memory if DB fails
        setWardrobe(defaultWardrobe);
      } finally {
        setIsWardrobeLoading(false);
      }
    };
    loadWardrobe();
  }, []);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
  };
  
  const handleOpenUploadModal = () => setIsUploadModalOpen(true);
  const handleCloseUploadModal = () => setIsUploadModalOpen(false);

  const handleSaveNewItem = async (newItem: WardrobeItem) => {
    try {
        await wardrobeRepo.saveWardrobeItem(newItem);
        setWardrobe(prev => [...prev, newItem]);
        handleCloseUploadModal();
    } catch (error) {
        console.error("Failed to save new wardrobe item", error);
        // Here you might want to show an error message to the user
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };

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
        return <TryOnView wardrobe={wardrobe} onOpenUploadModal={handleOpenUploadModal} poseInstructions={POSE_INSTRUCTIONS} />;
      case 'wardrobe':
        return <WardrobePage wardrobe={wardrobe} setWardrobe={setWardrobe} onOpenUploadModal={handleOpenUploadModal} isLoading={isWardrobeLoading} />;
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
         <AnimatePresence>
          {isUploadModalOpen && (
            <ImageUploadModal 
              onClose={handleCloseUploadModal}
              onSave={handleSaveNewItem}
            />
          )}
        </AnimatePresence>
      </div>
    </UserModelProvider>
  );
}

export default App;