import React, { useState, useMemo } from 'react';
import { WardrobeItem, ItemCategory } from '../types';
import { UploadCloudIcon, Trash2Icon, EditIcon } from './icons';
import EditWardrobeItemModal from './EditWardrobeItemModal';
import { AnimatePresence } from 'framer-motion';
import * as wardrobeRepo from '../db/wardrobeRepository';
import Spinner from './Spinner';

interface WardrobePageProps {
  wardrobe: WardrobeItem[];
  setWardrobe: React.Dispatch<React.SetStateAction<WardrobeItem[]>>;
  onOpenUploadModal: () => void;
  isLoading: boolean;
}

// Mapping from English category keys to Italian display names.
const ITALIAN_CATEGORIES: Record<ItemCategory, string> = {
  top: 'Parte Superiore',
  bottom: 'Pantaloni e Gonne',
  outerwear: 'Capispalla',
  shoes: 'Scarpe',
  accessory: 'Accessori',
};

const WardrobePage: React.FC<WardrobePageProps> = ({ wardrobe, setWardrobe, onOpenUploadModal, isLoading }) => {
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);

  // Group items by their category for rendering.
  const groupedWardrobe = useMemo(() => {
    const categoryOrder = Object.values(ITALIAN_CATEGORIES);
    
    const groups = wardrobe.reduce((acc, item) => {
      const categoryName = ITALIAN_CATEGORIES[item.category] || 'Altro'; // Fallback to 'Altro' (Other)
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, WardrobeItem[]>);

    // Sort the groups based on the predefined category order
    const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
    });

    return sortedGroups;

  }, [wardrobe]);

  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
        try {
            await wardrobeRepo.deleteWardrobeItem(itemId);
            setWardrobe(prev => prev.filter(item => item.id !== itemId));
        } catch (error) {
            console.error("Failed to delete item", error);
            // You might want to show an error to the user here
        }
    }
  };

  const handleSaveItem = async (updatedItem: WardrobeItem) => {
    try {
        await wardrobeRepo.updateWardrobeItem(updatedItem);
        setWardrobe(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        setEditingItem(null);
    } catch (error) {
        console.error("Failed to update item", error);
        // You might want to show an error to the user here
    }
  };

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Spinner />
            <p className="mt-4 text-lg text-gray-600 font-serif">Loading your wardrobe...</p>
        </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-4xl font-serif font-bold text-gray-900">Personal Wardrobe</h1>
            <p className="mt-1 text-gray-600">Manage your saved and uploaded items.</p>
        </div>
        <button 
          onClick={onOpenUploadModal}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-md cursor-pointer hover:bg-gray-700 transition-colors"
        >
            <UploadCloudIcon className="w-5 h-5 mr-2" />
            Add New Item
        </button>
      </div>
      
      {wardrobe.length > 0 ? (
        <div className="space-y-10">
          {groupedWardrobe.map(([categoryName, items]) => (
            <section key={categoryName}>
              <h2 className="text-2xl font-serif font-semibold text-gray-800 border-b pb-2 mb-4">
                {categoryName}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="relative group aspect-square border rounded-lg overflow-hidden bg-white"
                  >
                    <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-bold text-center">{item.name}</p>
                       <div className="absolute top-2 right-2 flex flex-col gap-2">
                          <button
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 bg-white/20 rounded-full text-white hover:bg-blue-500 transition-colors"
                              aria-label={`Edit ${item.name}`}
                          >
                              <EditIcon className="w-4 h-4" />
                          </button>
                          <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1.5 bg-white/20 rounded-full text-white hover:bg-red-500 transition-colors"
                              aria-label={`Delete ${item.name}`}
                          >
                              <Trash2Icon className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold text-gray-700">Your wardrobe is empty.</h3>
            <p className="text-gray-500 mt-2">Upload your first item to get started!</p>
        </div>
      )}

      <AnimatePresence>
        {editingItem && (
            <EditWardrobeItemModal 
              item={editingItem}
              onSave={handleSaveItem}
              onClose={() => setEditingItem(null)}
            />
        )}
      </AnimatePresence>
    </div>
  );
};

export default WardrobePage;