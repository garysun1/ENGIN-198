import { eventBus } from '@/lib/event-bus';
import type { GraphUpdateEvent } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: GraphUpdateEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeat every 30 s to keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\n\n'));
      }, 30_000);

      eventBus.onUpdate(send);

      // Return cleanup fn (called when client disconnects)
      return () => {
        eventBus.offUpdate(send);
        clearInterval(heartbeat);
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
