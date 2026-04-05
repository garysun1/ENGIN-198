import { EventEmitter } from 'events';
import type { GraphUpdateEvent } from '@/types';

class GraphEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // support many simultaneous SSE clients
  }

  emitUpdate(event: GraphUpdateEvent): void {
    this.emit('graph-update', event);
  }

  onUpdate(listener: (event: GraphUpdateEvent) => void): this {
    return this.on('graph-update', listener);
  }

  offUpdate(listener: (event: GraphUpdateEvent) => void): this {
    return this.off('graph-update', listener);
  }
}

// Module-level singleton so all server code shares the same bus
export const eventBus = new GraphEventBus();
