export type ItemCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory';

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: ItemCategory;
}

export interface OutfitLayer {
  garment: WardrobeItem; // Each layer must have a garment
  // A map from pose instruction to the generated image URL for that pose with this garment.
  poseImages: Record<string, string>;
}

export interface UserModel {
  id: 'currentUser';
  imageUrl: string;
}
