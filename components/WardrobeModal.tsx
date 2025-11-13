import React, { useState, useMemo } from 'react';
import type { WardrobeItem, ItemCategory } from '../types';
import { UploadCloudIcon, CheckCircleIcon } from './icons';

interface WardrobePanelProps {
  onToggleGarment: (item: WardrobeItem) => void;
  onOpenUploadModal: () => void;
  selectedGarments: Partial<Record<ItemCategory, WardrobeItem>>;
  isLoading: boolean;
  wardrobe: WardrobeItem[];
}

const CATEGORIES: ItemCategory[] = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onToggleGarment, onOpenUploadModal, selectedGarments, isLoading, wardrobe }) => {
    const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>('all');
    
    const selectedGarmentIds = useMemo(() => {
        return Object.values(selectedGarments).filter(Boolean).map(item => item!.id);
    }, [selectedGarments]);

    const filteredWardrobe = useMemo(() => {
        if (activeCategory === 'all') return wardrobe;
        return wardrobe.filter(item => item.category === activeCategory);
    }, [wardrobe, activeCategory]);

    const handleGarmentClick = (item: WardrobeItem) => {
        if (isLoading) return;
        onToggleGarment(item);
    };

  return (
    <div className="pt-6 border-t border-gray-400/50">
        <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">Wardrobe</h2>

        <div className="flex flex-wrap gap-2 mb-4">
            <button 
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${activeCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
                All
            </button>
            {CATEGORIES.map(cat => (
                    <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors capitalize ${activeCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                    {cat}
                </button>
            ))}
        </div>
        
        <div className="grid grid-cols-3 gap-3">
            {filteredWardrobe.map((item) => {
            const isSelected = selectedGarmentIds.includes(item.id);
            return (
                <button
                key={item.id}
                onClick={() => handleGarmentClick(item)}
                disabled={isLoading}
                className="relative aspect-square border bg-white rounded-lg overflow-hidden transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 group disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label={`Select ${item.name}`}
                >
                <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-bold text-center p-1">{item.name}</p>
                </div>
                {isSelected && (
                    <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center ring-2 ring-offset-2 ring-gray-900 rounded-lg">
                        <CheckCircleIcon className="w-8 h-8 text-white" />
                    </div>
                )}
                </button>
            );
            })}
            <button onClick={onOpenUploadModal} disabled={isLoading} className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'hover:border-gray-400 hover:text-gray-600 cursor-pointer'}`}>
                <UploadCloudIcon className="w-6 h-6 mb-1"/>
                <span className="text-xs text-center">Upload</span>
            </button>
        </div>
        {filteredWardrobe.length === 0 && (
             <p className="text-center text-sm text-gray-500 mt-4">No items in this category. Try another filter or upload an item.</p>
        )}
    </div>
  );
};

export default WardrobePanel;