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
  image_dimensions: {
    width: number;
    height: number;
  };
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

// Job-related types for async processing
export interface JobResponse {
  task_id: string;
  status: string;
  message: string;
  created_at: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobStatusResponse {
  task_id: string;
  status: JobStatus;
  progress?: string;
  message?: string;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  processing_time?: number;
}

export interface JobResultResponse {
  task_id: string;
  image: string;
  analysis: {
    annotations: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
      tag?: AnnotationTag;
      confidence?: number;
      text?: string;
    }>;
    image_dimensions?: {
      width: number;
      height: number;
    };
    ui_elements: string[];
    total_elements: number;
  };
  model_used: string;
  processing_time: number;
  completed_at: string;
}

// API Error Type
export class ApiError extends Error {
  status?: number;
  statusText?: string;

  constructor(message: string, status?: number, statusText?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
  }
}