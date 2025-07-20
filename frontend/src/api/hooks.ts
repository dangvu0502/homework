import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PredictionResponse } from './types';

// Query Keys
export const apiKeys = {
  all: ['api'] as const,
  models: () => [...apiKeys.all, 'models'] as const,
  health: () => [...apiKeys.all, 'health'] as const,
};

// Hook to get available models
export function useModels() {
  return useQuery({
    queryKey: apiKeys.models(),
    queryFn: () => apiClient.getAvailableModels(),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

// Hook to predict UI elements
export function usePredictUIElements() {
  return useMutation<
    PredictionResponse,
    Error,
    { imageFile: File; modelName: string }
  >({
    mutationFn: ({ imageFile, modelName }) =>
      apiClient.predictUIElements(imageFile, modelName),
  });
}

// Hook for health check
export function useHealthCheck() {
  return useQuery({
    queryKey: apiKeys.health(),
    queryFn: () => apiClient.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    retry: 1,
  });
}