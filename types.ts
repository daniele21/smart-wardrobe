export type ItemCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory';

export interface WardrobeItem {
  id: string;
  name: string;
  url: string;
  category: ItemCategory;
}

export interface OutfitLayer {
  garment: WardrobeItem; // Garment can no longer be null in the history
  poseImages: Record<string, string>; // Maps pose instruction to image URL
}

export interface UserModel {
    id: 'currentUser';
    imageUrl: string;
}
