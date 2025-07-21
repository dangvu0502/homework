import type { HealthResponse, ModelsResponse, PredictionResponse } from './types';
import { ApiError } from './types';

// API Configuration
const API_CONFIG = {
  baseUrl: import.meta.env.VITE_API_URL || '',
  timeout: 60000, // 60 seconds for predictions
  headers: {
    'Accept': 'application/json',
  },
};

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: HeadersInit;

  constructor(config = API_CONFIG) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
    this.defaultHeaders = config.headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch {
          // If response is not JSON, use default message
        }
        throw new ApiError(errorMessage, response.status, response.statusText);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw new Error(error.message);
      }
      
      throw new Error('An unknown error occurred');
    }
  }

  // Health check
  async healthCheck(): Promise<HealthResponse> {
    return this.request('/health');
  }

  // Get available models
  async getAvailableModels(): Promise<ModelsResponse> {
    return this.request('/api/v1/models');
  }

  // Predict UI elements
  async predictUIElements(
    imageFile: File,
    modelName: string
  ): Promise<PredictionResponse> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('model_name', modelName);

    return this.request('/api/v1/predict', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let browser set it with boundary for multipart
      headers: {},
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing or custom instances
export { ApiClient };