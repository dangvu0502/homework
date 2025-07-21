import { create } from 'zustand';

interface ImageState {
  imageFiles: File[];
  currentImageIndex: number;
  imageUrl: string;
  completedImages: number;
  
  setImageFiles: (files: File[]) => void;
  setCurrentImageIndex: (index: number) => void;
  setImageUrl: (url: string) => void;
  setCompletedImages: (count: number) => void;
  
  getCurrentImageFile: () => File | null;
  navigateToImage: (index: number) => void;
  incrementCompletedImages: () => void;
  
  reset: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  imageFiles: [],
  currentImageIndex: 0,
  imageUrl: '',
  completedImages: 0,
  
  setImageFiles: (files) => set({ imageFiles: files }),
  setCurrentImageIndex: (index) => set({ currentImageIndex: index }),
  setImageUrl: (url) => set({ imageUrl: url }),
  setCompletedImages: (count) => set({ completedImages: count }),
  
  getCurrentImageFile: () => {
    const { imageFiles, currentImageIndex } = get();
    return imageFiles[currentImageIndex] || null;
  },
  
  navigateToImage: (index) => {
    const { imageFiles, imageUrl: oldUrl } = get();
    if (index < 0 || index >= imageFiles.length) return;
    
    // Release the previous blob URL to prevent memory leaks
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }
    
    set({ currentImageIndex: index });
    const newFile = imageFiles[index];
    const url = URL.createObjectURL(newFile);
    set({ imageUrl: url });
  },
  
  incrementCompletedImages: () => {
    set((state) => ({ completedImages: state.completedImages + 1 }));
  },
  
  reset: () => {
    const { imageUrl } = get();
    
    // Release the blob URL to prevent memory leaks
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    
    set({
      imageFiles: [],
      currentImageIndex: 0,
      imageUrl: '',
      completedImages: 0
    });
  }
}));