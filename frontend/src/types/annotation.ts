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
  | 'text'
  | 'image'
  | 'link'
  | 'checkbox'
  | 'label'
  | 'icon'
  | 'card'
  | 'navbar'
  | 'footer'
  | 'sidebar'

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
  imageName: string;
  imageDimensions: {
    width: number;
    height: number;
  };
  annotations: Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    tag: AnnotationTag;
    source: 'user' | 'prediction';
  }>;
  metadata: {
    totalAnnotations: number;
    exportedAt: string;
  };
}