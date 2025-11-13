import React, { useState, useEffect } from 'react';
import { WardrobeItem, ItemCategory } from '../types';
import { XIcon } from './icons';
import { motion } from 'framer-motion';

const CATEGORIES: ItemCategory[] = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];

// Mapping from English category keys to Italian display names.
const ITALIAN_CATEGORIES: Record<ItemCategory, string> = {
  top: 'Parte Superiore',
  bottom: 'Pantaloni e Gonne',
  outerwear: 'Capispalla',
  shoes: 'Scarpe',
  accessory: 'Accessori',
};

interface EditWardrobeItemModalProps {
  item: WardrobeItem;
  onSave: (updatedItem: WardrobeItem) => void;
  onClose: () => void;
}

const EditWardrobeItemModal: React.FC<EditWardrobeItemModalProps> = ({ item, onSave, onClose }) => {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<ItemCategory>(item.category);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...item, name, category });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-item-title"
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 p-1">
          <XIcon className="w-6 h-6" />
        </button>
        <h2 id="edit-item-title" className="text-2xl font-serif font-bold text-gray-800 mb-4">Edit Item</h2>
        <div className="flex justify-center mb-4">
          <img src={item.url} alt={item.name} className="w-32 h-32 object-cover rounded-lg border" />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Item Name</label>
              <input
                type="text"
                id="itemName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700">Category</label>
              <select
                id="itemCategory"
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{ITALIAN_CATEGORIES[cat]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-md hover:bg-gray-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditWardrobeItemModal;
