/**
 * WebSocket service for managing a single connection instance
 */

type MessageHandler = (jobId: string, data: any) => void;
type ConnectionHandler = () => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscribedJobs: Set<string> = new Set();
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private isConnecting = false;
  private shouldReconnect = true;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws`;
    
    console.log('WebSocket connecting to:', wsUrl);
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      
      // Re-subscribe to any jobs we were tracking
      if (this.subscribedJobs.size > 0) {
        const jobIds = Array.from(this.subscribedJobs);
        console.log('Re-subscribing to jobs:', jobIds);
        this.ws!.send(JSON.stringify({
          type: 'subscribe',
          job_ids: jobIds
        }));
      }
      
      // Notify handlers
      this.connectHandlers.forEach(handler => handler());
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message:', message);
        
        if (message.type === 'job_update' && message.job_id && message.data) {
          // Notify all registered handlers
          this.messageHandlers.forEach(handler => {
            handler(message.job_id, message.data);
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
    };
    
    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.isConnecting = false;
      
      // Notify handlers
      this.disconnectHandlers.forEach(handler => handler());
      
      // Attempt to reconnect after 3 seconds
      if (this.shouldReconnect) {
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        this.reconnectTimeout = setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.connect();
        }, 3000);
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribeToJobs(jobIds: string[]) {
    jobIds.forEach(id => this.subscribedJobs.add(id));
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Subscribing to jobs:', jobIds);
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        job_ids: jobIds
      }));
    }
  }

  unsubscribeFromJobs(jobIds: string[]) {
    jobIds.forEach(id => this.subscribedJobs.delete(id));
    
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        job_ids: jobIds
      }));
    }
  }

  addMessageHandler(handler: MessageHandler) {
    this.messageHandlers.add(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.messageHandlers.delete(handler);
  }

  addConnectHandler(handler: ConnectionHandler) {
    this.connectHandlers.add(handler);
  }

  removeConnectHandler(handler: ConnectionHandler) {
    this.connectHandlers.delete(handler);
  }

  addDisconnectHandler(handler: ConnectionHandler) {
    this.disconnectHandlers.add(handler);
  }

  removeDisconnectHandler(handler: ConnectionHandler) {
    this.disconnectHandlers.delete(handler);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Auto-connect when the module is loaded
if (typeof window !== 'undefined') {
  websocketService.connect();
}