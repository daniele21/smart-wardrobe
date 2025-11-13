import React from 'react';
import { WardrobeItem, ItemCategory } from '../types';
import { Trash2Icon, XIcon, PlusIcon } from './icons';

interface CurrentOutfitPanelProps {
  selectedGarments: Partial<Record<ItemCategory, WardrobeItem>>;
  onFitOutfit: () => void;
  onClearSelection: () => void;
  onToggleGarment: (item: WardrobeItem) => void;
  isFitting: boolean;
}

const CurrentOutfitPanel: React.FC<CurrentOutfitPanelProps> = ({ selectedGarments, onFitOutfit, onClearSelection, onToggleGarment, isFitting }) => {
  const selectedItems = Object.values(selectedGarments).filter(Boolean) as WardrobeItem[];

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center border-b border-gray-400/50 pb-2 mb-3">
        <h2 className="text-xl font-serif tracking-wider text-gray-800">Selected for Fitting</h2>
        {selectedItems.length > 0 && (
          <button
            onClick={onClearSelection}
            className="text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
            disabled={isFitting}
          >
            Clear
          </button>
        )}
      </div>
      <div className="space-y-2 flex-grow">
        {selectedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-white/50 p-2 rounded-lg animate-fade-in border border-gray-200/80 shadow-sm"
          >
            <div className="flex items-center overflow-hidden">
              <img src={item.url} alt={item.name} className="flex-shrink-0 w-12 h-12 object-contain bg-white border rounded-md mr-3" />
              <div className="flex-grow overflow-hidden">
                <p className="font-semibold text-gray-800 truncate" title={item.name}>
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{item.category}</p>
              </div>
            </div>
            <button
              onClick={() => onToggleGarment(item)}
              className="flex-shrink-0 text-gray-500 hover:text-red-600 transition-colors p-2 rounded-md hover:bg-red-50"
              aria-label={`Remove ${item.name}`}
              disabled={isFitting}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
        {selectedItems.length === 0 && (
            <p className="text-center text-sm text-gray-500 pt-4">Select one item per category from your wardrobe to build an outfit.</p>
        )}
      </div>
       <button 
          onClick={onFitOutfit}
          disabled={isFitting || selectedItems.length === 0}
          className="mt-4 w-full flex items-center justify-center text-center bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-gray-700 active:scale-95 text-base disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
          Fit Outfit
      </button>
    </div>
  );
};

export default CurrentOutfitPanel;