import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { PredictionResponse } from './types';

// Query Keys
export const apiKeys = {
  all: ['api'] as const,
  health: () => [...apiKeys.all, 'health'] as const,
};

// Hook to predict UI elements
export function usePredictUIElements() {
  return useMutation<
    PredictionResponse,
    Error,
    { imageFile: File }
  >({
    mutationFn: ({ imageFile }) =>
      apiClient.predictUIElements(imageFile),
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