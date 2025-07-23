import { create } from 'zustand';
import type { AnnotationTag, BoundingBox } from '@/types/annotation';

interface AnnotationState {
  selectedTag: AnnotationTag;
  boundingBoxes: BoundingBox[];
  highlightedAnnotationId: string | undefined;
  imageDimensions: { width: number; height: number } | null;
  annotationsPerImage: Record<string, BoundingBox[]>;
  
  setSelectedTag: (tag: AnnotationTag) => void;
  setBoundingBoxes: (boxes: BoundingBox[]) => void;
  setHighlightedAnnotationId: (id: string | undefined) => void;
  setImageDimensions: (dimensions: { width: number; height: number } | null) => void;
  setAnnotationsPerImage: (annotations: Record<string, BoundingBox[]>) => void;
  
  addBoundingBox: (box: Omit<BoundingBox, 'id'>) => void;
  deleteBoundingBox: (id: string) => void;
  updateBoundingBox: (id: string, updates: Partial<BoundingBox>) => void;
  addPredictions: (predictions: BoundingBox[]) => void;
  
  saveAnnotationsForImage: (imageName: string) => void;
  loadAnnotationsForImage: (imageName: string) => void;
  
  reset: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  selectedTag: 'button',
  boundingBoxes: [],
  highlightedAnnotationId: undefined,
  imageDimensions: null,
  annotationsPerImage: {},
  
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setBoundingBoxes: (boxes) => set({ boundingBoxes: boxes }),
  setHighlightedAnnotationId: (id) => set({ highlightedAnnotationId: id }),
  setImageDimensions: (dimensions) => set({ imageDimensions: dimensions }),
  setAnnotationsPerImage: (annotations) => set({ annotationsPerImage: annotations }),
  
  addBoundingBox: (box) => {
    const newBox: BoundingBox = {
      ...box,
      id: crypto.randomUUID()
    };
    set((state) => ({ boundingBoxes: [...state.boundingBoxes, newBox] }));
  },
  
  deleteBoundingBox: (id) => {
    set((state) => ({
      boundingBoxes: state.boundingBoxes.filter(box => box.id !== id)
    }));
  },
  
  updateBoundingBox: (id, updates) => {
    set((state) => ({
      boundingBoxes: state.boundingBoxes.map(box => 
        box.id === id ? { ...box, ...updates, source: 'user' } : box
      )
    }));
  },
  
  addPredictions: (predictions) => {
    set((state) => ({
      boundingBoxes: [...state.boundingBoxes, ...predictions]
    }));
  },
  
  saveAnnotationsForImage: (imageName) => {
    const { boundingBoxes, annotationsPerImage } = get();
    set({
      annotationsPerImage: {
        ...annotationsPerImage,
        [imageName]: boundingBoxes
      }
    });
  },
  
  loadAnnotationsForImage: (imageName) => {
    const { annotationsPerImage } = get();
    set({ boundingBoxes: annotationsPerImage[imageName] || [] });
  },
  
  reset: () => {
    set({
      boundingBoxes: [],
      imageDimensions: null,
      annotationsPerImage: {},
      highlightedAnnotationId: undefined
    });
  }
}));