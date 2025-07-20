import type { AnnotationTag } from '@/types/annotation';

// API Response Types
export interface PredictionResponse {
  annotations: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    tag: AnnotationTag;
  }>;
  processing_time: number;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface ModelsResponse {
  models: ModelInfo[];
}

export interface HealthResponse {
  status: string;
}

// API Error Type
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}