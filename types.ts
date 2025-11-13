import type { Crop, PixelCrop } from 'react-image-crop';

export type ItemCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory';

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: ItemCategory;
}

export interface OutfitLayer {
  garments: WardrobeItem[]; // Each layer is a full outfit
  // A map from pose instruction to the generated image URL for that pose with this outfit.
  poseImages: Record<string, string>;
}

export interface UserModel {
  id: 'currentUser';
  imageUrl: string;
}

export type { Crop, PixelCrop };