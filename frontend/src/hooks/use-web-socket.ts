import { useEffect, useState, useCallback } from 'react';
import { websocketService } from '@/services/websocket';

interface UseWebSocketOptions {
  onJobUpdate?: (jobId: string, data: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(websocketService.isConnected);

  useEffect(() => {
    // Add handlers
    const messageHandler = (jobId: string, data: any) => {
      options.onJobUpdate?.(jobId, data);
    };
    
    const connectHandler = () => {
      setIsConnected(true);
      options.onConnect?.();
    };
    
    const disconnectHandler = () => {
      setIsConnected(false);
      options.onDisconnect?.();
    };
    
    websocketService.addMessageHandler(messageHandler);
    websocketService.addConnectHandler(connectHandler);
    websocketService.addDisconnectHandler(disconnectHandler);
    
    // Update initial state
    setIsConnected(websocketService.isConnected);
    
    // Cleanup
    return () => {
      websocketService.removeMessageHandler(messageHandler);
      websocketService.removeConnectHandler(connectHandler);
      websocketService.removeDisconnectHandler(disconnectHandler);
    };
  }, [options.onJobUpdate, options.onConnect, options.onDisconnect]);

  const subscribeToJobs = useCallback((jobIds: string[]) => {
    websocketService.subscribeToJobs(jobIds);
  }, []);

  const unsubscribeFromJobs = useCallback((jobIds: string[]) => {
    websocketService.unsubscribeFromJobs(jobIds);
  }, []);

  return {
    isConnected,
    subscribeToJobs,
    unsubscribeFromJobs,
  };
};