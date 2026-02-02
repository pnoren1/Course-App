import { ViewingEvent } from './videoTrackingService';

import { authenticatedFetch } from '@/lib/utils/api-helpers';

export interface OptimizedEvent {
  event_type: string;
  timestamp_in_video: number;
  client_timestamp: string;
  is_tab_visible?: boolean;
  playback_rate?: number;
  volume_level?: number;
  additional_data?: any;
}

export interface EventBatch {
  events: OptimizedEvent[];
  compressed_size: number;
  original_size: number;
  compression_ratio: number;
}

export class VideoEventOptimizer {
  private readonly MAX_BATCH_SIZE = 50;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay

  /**
   * Batch events for efficient transmission
   */
  batchEvents(events: OptimizedEvent[], maxBatchSize: number = this.MAX_BATCH_SIZE): OptimizedEvent[][] {
    const batches: OptimizedEvent[][] = [];
    
    for (let i = 0; i < events.length; i += maxBatchSize) {
      batches.push(events.slice(i, i + maxBatchSize));
    }
    
    return batches;
  }

  /**
   * Compress event data using simple JSON optimization
   */
  compressEvents(events: OptimizedEvent[]): EventBatch {
    const originalData = JSON.stringify(events);
    const originalSize = new Blob([originalData]).size;

    // Optimize by removing redundant data and using shorter keys
    const optimizedEvents = events.map(event => {
      const optimized: any = {
        t: event.event_type,
        ts: event.timestamp_in_video,
        ct: event.client_timestamp
      };

      // Only include non-default values
      if (event.is_tab_visible !== undefined && event.is_tab_visible !== true) {
        optimized.v = event.is_tab_visible;
      }
      
      if (event.playback_rate !== undefined && event.playback_rate !== 1.0) {
        optimized.r = event.playback_rate;
      }
      
      if (event.volume_level !== undefined && event.volume_level !== 1.0) {
        optimized.vol = event.volume_level;
      }
      
      if (event.additional_data && Object.keys(event.additional_data).length > 0) {
        optimized.d = event.additional_data;
      }

      return optimized;
    });

    const compressedData = JSON.stringify(optimizedEvents);
    const compressedSize = new Blob([compressedData]).size;
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    return {
      events: optimizedEvents,
      compressed_size: compressedSize,
      original_size: originalSize,
      compression_ratio: compressionRatio
    };
  }

  /**
   * Decompress events back to original format
   */
  decompressEvents(compressedEvents: any[]): OptimizedEvent[] {
    return compressedEvents.map(event => ({
      event_type: event.t,
      timestamp_in_video: event.ts,
      client_timestamp: event.ct,
      is_tab_visible: event.v !== undefined ? event.v : true,
      playback_rate: event.r !== undefined ? event.r : 1.0,
      volume_level: event.vol !== undefined ? event.vol : 1.0,
      additional_data: event.d || {}
    }));
  }

  /**
   * Send events with retry logic
   */
  async sendEventsWithRetry(
    sessionToken: string,
    events: OptimizedEvent[],
    endpoint: string = '/api/video/events/batch'
  ): Promise<{ success: boolean; error?: string; retryCount: number }> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // Compress events before sending
        const compressed = this.compressEvents(events);
        
        const response = await authenticatedFetch(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            session_token: sessionToken,
            events: compressed.events,
            compression_info: {
              original_size: compressed.original_size,
              compressed_size: compressed.compressed_size,
              compression_ratio: compressed.compression_ratio
            }
          }),
        });

        if (response.ok) {
          return { success: true, retryCount: attempt };
        }

        // If it's a client error (4xx), don't retry
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({}));
          return { 
            success: false, 
            error: errorData.error || `Client error: ${response.status}`,
            retryCount: attempt 
          };
        }

        // Server error, prepare for retry
        lastError = new Error(`Server error: ${response.status}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
      }

      // Wait before retrying (exponential backoff)
      if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
        const delay = this.RETRY_DELAY_BASE * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { 
      success: false, 
      error: lastError?.message || 'Failed after all retry attempts',
      retryCount: this.MAX_RETRY_ATTEMPTS 
    };
  }

  /**
   * Optimize event queue by removing redundant events
   */
  optimizeEventQueue(events: OptimizedEvent[]): OptimizedEvent[] {
    if (events.length === 0) return events;

    const optimized: OptimizedEvent[] = [];
    let lastEvent: OptimizedEvent | null = null;

    // Sort events by timestamp to ensure proper order
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime()
    );

    for (const event of sortedEvents) {
      // Skip duplicate heartbeat events that are too close together
      if (event.event_type === 'heartbeat' && lastEvent?.event_type === 'heartbeat') {
        const timeDiff = new Date(event.client_timestamp).getTime() - 
                        new Date(lastEvent.client_timestamp).getTime();
        
        // Skip if heartbeats are less than 5 seconds apart
        if (timeDiff < 5000) {
          continue;
        }
      }

      // Skip redundant seek events (multiple seeks to same position)
      if (event.event_type === 'seek' && lastEvent?.event_type === 'seek') {
        if (Math.abs(event.timestamp_in_video - lastEvent.timestamp_in_video) < 1) {
          // Update the last seek event instead of adding a new one
          optimized[optimized.length - 1] = event;
          lastEvent = event;
          continue;
        }
      }

      optimized.push(event);
      lastEvent = event;
    }

    return optimized;
  }

  /**
   * Calculate optimal batch size based on network conditions
   */
  calculateOptimalBatchSize(
    averageEventSize: number,
    networkLatency: number,
    maxPayloadSize: number = 64 * 1024 // 64KB default
  ): number {
    // Adjust batch size based on network conditions
    let optimalSize = Math.floor(maxPayloadSize / averageEventSize);
    
    // Reduce batch size for high latency networks
    if (networkLatency > 500) {
      optimalSize = Math.floor(optimalSize * 0.7);
    } else if (networkLatency > 200) {
      optimalSize = Math.floor(optimalSize * 0.85);
    }

    // Ensure reasonable bounds
    return Math.max(5, Math.min(optimalSize, this.MAX_BATCH_SIZE));
  }

  /**
   * Estimate network latency based on recent requests
   */
  async estimateNetworkLatency(): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Make a lightweight request to estimate latency
      const response = await fetch('/api/video/ping', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const endTime = Date.now();
      return endTime - startTime;
    } catch (error) {
      // Return a conservative estimate if ping fails
      return 300;
    }
  }

  /**
   * Create a debounced event sender
   */
  createDebouncedSender(
    sessionToken: string,
    delay: number = 2000
  ): (events: OptimizedEvent[]) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let pendingEvents: OptimizedEvent[] = [];

    return (events: OptimizedEvent[]) => {
      pendingEvents.push(...events);

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        if (pendingEvents.length > 0) {
          const eventsToSend = [...pendingEvents];
          pendingEvents = [];
          
          const optimizedEvents = this.optimizeEventQueue(eventsToSend);
          await this.sendEventsWithRetry(sessionToken, optimizedEvents);
        }
      }, delay);
    };
  }
}