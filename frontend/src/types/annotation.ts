export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tag: AnnotationTag;
  source?: 'user' | 'prediction';
}

export type AnnotationTag = 
  | 'button'
  | 'input'
  | 'radio'
  | 'dropdown'

export interface AnnotationProject {
  id: string;
  name: string;
  imageUrl: string;
  imageName: string;
  boundingBoxes: BoundingBox[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotationExport {
  project: {
    name: string;
    imageName: string;
    imageUrl: string;
  };
  annotations: Array<{
    id: string;
    tag: AnnotationTag;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    relativeCoordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  metadata: {
    totalAnnotations: number;
    tagCounts: Record<AnnotationTag, number>;
    createdAt: string;
    exportedAt: string;
  };
}