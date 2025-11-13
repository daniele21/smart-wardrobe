import React from 'react';
import { OutfitLayer } from '../types';
import { Trash2Icon } from './icons';

interface OutfitStackProps {
  modelImageUrl: string | null;
  outfitHistory: OutfitLayer[];
  onRemoveLastGarment: () => void;
}

const OutfitStack: React.FC<OutfitStackProps> = ({ modelImageUrl, outfitHistory, onRemoveLastGarment }) => {
  // Create a display-only array that includes the base model layer.
  const displayLayers: (OutfitLayer | { garment: null, poseImages: { base: string } })[] = [
    { garment: null, poseImages: { base: modelImageUrl || '' } },
    ...outfitHistory
  ];

  return (
    <div className="flex flex-col">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 border-b border-gray-400/50 pb-2 mb-3">Outfit Stack</h2>
      <div className="space-y-2">
        {displayLayers.map((layer, index) => {
          // FIX: The OutfitLayer type has a `garments` array, not a single `garment`.
          // We will derive display properties from this array.
          const garments = 'garments' in layer ? layer.garments : null;
          const firstGarment = garments?.[0];
          const layerName = garments?.map(g => g.name).join(', ');

          return (
            <div
              // FIX: Generate key from garment IDs or use 'base' for the base layer.
              key={garments ? garments.map(g => g.id).join('-') : 'base'}
              className="flex items-center justify-between bg-white/50 p-2 rounded-lg animate-fade-in border border-gray-200/80"
            >
              <div className="flex items-center overflow-hidden">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 mr-3 text-xs font-bold text-gray-600 bg-gray-200 rounded-full">
                    {index + 1}
                  </span>
                  {/* FIX: Display the image of the first garment in the layer. */}
                  {firstGarment && (
                      <img src={firstGarment.url} alt={firstGarment.name} className="flex-shrink-0 w-12 h-12 object-cover rounded-md mr-3" />
                  )}
                  {/* FIX: Display a comma-separated list of garment names or 'Base Model'. */}
                  <span className="font-semibold text-gray-800 truncate" title={layerName || 'Base Model'}>
                    {layerName || 'Base Model'}
                  </span>
              </div>
              {index > 0 && index === displayLayers.length - 1 && (
                 <button
                  onClick={onRemoveLastGarment}
                  className="flex-shrink-0 text-gray-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50"
                  // FIX: Use the generated layer name for the aria-label.
                  aria-label={`Remove ${layerName}`}
                >
                  <Trash2Icon className="w-5 h-5" />
                </button>
              )}
            </div>
          );
        })}
        {displayLayers.length === 1 && (
            <p className="text-center text-sm text-gray-500 pt-4">Your stacked items will appear here. Select an item from the wardrobe below.</p>
        )}
      </div>
    </div>
  );
};

export default OutfitStack;
