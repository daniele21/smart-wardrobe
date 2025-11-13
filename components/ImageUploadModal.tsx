import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactCrop, { type Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { XIcon, UploadCloudIcon, Wand2Icon, CropIcon } from './icons';
import { WardrobeItem, ItemCategory } from '../types';
import { removeImageBackground } from '../services/geminiService';
import { canvasPreview } from '../lib/utils';
import Spinner from './Spinner';

interface ImageUploadModalProps {
  onClose: () => void;
  onSave: (newItem: WardrobeItem) => void;
}

const CATEGORIES: ItemCategory[] = ['top', 'bottom', 'outerwear', 'shoes', 'accessory'];
const ITALIAN_CATEGORIES: Record<ItemCategory, string> = {
  top: 'Parte Superiore', bottom: 'Pantaloni e Gonne', outerwear: 'Capispalla', shoes: 'Scarpe', accessory: 'Accessori',
};

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Edit
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('top');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); // Makes crop preview update between images.
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
        const fileName = e.target.files?.[0].name.split('.').slice(0, -1).join('.') || 'New Item';
        setItemName(fileName);
        setStep(2);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height
    );
    setCrop(initialCrop);
  }

  const handleRemoveBackground = async () => {
    if (!imgSrc) return;
    setIsLoading(true);
    setLoadingMessage('Removing background...');
    setError(null);
    try {
      const resultDataUrl = await removeImageBackground(imgSrc);
      setImgSrc(resultDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove background');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
        setError('Could not process the image. Please try again.');
        return;
    }
    
    setIsLoading(true);
    setLoadingMessage('Saving item...');
    
    await canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop);
    const finalDataUrl = previewCanvasRef.current.toDataURL('image/png');

    const newItem: WardrobeItem = {
      id: `custom-${Date.now()}`,
      name: itemName,
      url: finalDataUrl,
      category: itemCategory,
    };
    onSave(newItem);
    setIsLoading(false);
  };
  
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl relative flex flex-col"
        style={{ height: 'min(90vh, 800px)' }}
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
      >
        <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-serif font-bold text-gray-800">Add New Wardrobe Item</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><XIcon className="w-6 h-6" /></button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center h-full">
              <label htmlFor="upload-input" className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <UploadCloudIcon className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-lg font-semibold text-gray-600">Click to upload or drag & drop</p>
                <p className="text-sm text-gray-500">PNG, JPG, WEBP, etc.</p>
              </label>
              <input id="upload-input" type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
            </div>
          )}

          {step === 2 && imgSrc && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-gray-100 rounded-lg p-2 flex items-center justify-center">
                 {isLoading && <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-10 rounded-lg"><Spinner /><p className="mt-2">{loadingMessage}</p></div>}
                 <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    className="max-h-[450px]"
                 >
                    <img ref={imgRef} alt="Crop preview" src={imgSrc} onLoad={onImageLoad} className="object-contain max-h-[450px]" />
                 </ReactCrop>
              </div>
              <div className="space-y-4">
                  <div>
                      <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Item Name</label>
                      <input type="text" id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} className="mt-1 block w-full input input-bordered" required/>
                  </div>
                  <div>
                      <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700">Category</label>
                      <select id="itemCategory" value={itemCategory} onChange={(e) => setItemCategory(e.target.value as ItemCategory)} className="mt-1 block w-full select select-bordered">
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{ITALIAN_CATEGORIES[cat]}</option>)}
                      </select>
                  </div>
                  <div className="pt-4 space-y-2">
                      <button onClick={handleRemoveBackground} disabled={isLoading} className="w-full btn btn-outline flex items-center justify-center gap-2">
                          <Wand2Icon className="w-4 h-4" /> Remove Background
                      </button>
                      <button onClick={() => setStep(1)} disabled={isLoading} className="w-full btn btn-ghost">Use different image</button>
                  </div>
              </div>
            </div>
          )}
          {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        </div>

        <div className="p-4 border-t flex justify-end">
            <button type="button" onClick={onClose} className="btn btn-ghost mr-2">Cancel</button>
            <button type="button" onClick={handleSaveItem} className="btn btn-neutral" disabled={step !== 2 || isLoading || !completedCrop}>
                {isLoading ? 'Saving...' : 'Add to Wardrobe'}
            </button>
        </div>
        
        {/* Hidden canvas for processing the crop */}
        <canvas ref={previewCanvasRef} style={{ display: 'none', width: 0, height: 0, objectFit: 'contain' }} />
      </motion.div>
    </motion.div>
  );
};

export default ImageUploadModal;
