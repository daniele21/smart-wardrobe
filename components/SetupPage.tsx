import React from 'react';
import { useUserModel } from '../hooks/useUserModel';
import StartScreen from './StartScreen';
import Spinner from './Spinner';
import { CheckCircleIcon } from './icons';

interface SetupPageProps {
  poseInstructions: string[];
}

const SetupPage: React.FC<SetupPageProps> = ({ poseInstructions }) => {
  const { modelImageUrl, isLoading, deleteModel, saveModel } = useUserModel();

  const handleModelFinalized = async (url: string) => {
    await saveModel(url);
  };

  const handleStartOver = async () => {
    await deleteModel();
  };
  
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Spinner />
            <p className="mt-4 text-lg text-gray-600 font-serif">Loading your settings...</p>
        </div>
    );
  }

  if (modelImageUrl) {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left gap-8">
            <div className="flex-shrink-0 flex flex-col items-center">
                <h1 className="text-4xl font-serif font-bold text-gray-900">Your Current Model</h1>
                <p className="mt-2 text-gray-600">This photo is being used for your virtual try-ons.</p>
                <div className="mt-6 w-full max-w-sm aspect-[2/3] rounded-2xl overflow-hidden shadow-lg border">
                    <img src={modelImageUrl} alt="Current user model" className="w-full h-full object-cover" />
                </div>
                 <button
                    onClick={handleStartOver}
                    className="mt-8 px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
                >
                    Change or Remove Photo
                </button>
            </div>
            <div className="w-full mt-8 lg:mt-0">
                <div className="bg-white/80 p-6 rounded-xl border border-gray-200/80 shadow-sm">
                    <h2 className="text-2xl font-serif font-semibold text-gray-800">Available Poses</h2>
                    <p className="mt-1 text-sm text-gray-600">Once in the try-on, you can generate variations of your model in these poses.</p>
                    <ul className="mt-4 space-y-2">
                        {poseInstructions.map((pose, index) => (
                            <li key={index} className="flex items-start text-gray-700">
                               <CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-gray-500 flex-shrink-0" />
                                <span>{pose}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
  }

  return <StartScreen onModelFinalized={handleModelFinalized} />;
};

export default SetupPage;