import { SocketModeClient } from '@slack/socket-mode';
import { messageToRawDoc } from '@/lib/ingestion/slack';
import { processRawDocument } from '@/lib/extraction/pipeline';
import { eventBus } from '@/lib/event-bus';

export async function startSlackListener(): Promise<void> {
  const socketClient = new SocketModeClient({
    appToken: process.env.SLACK_APP_TOKEN!,
    logLevel: 'error' as any,
  });

  socketClient.on('message', async ({ event, ack }: any) => {
    await ack();

    // Skip edits, deletions, bot messages
    if (event.subtype || !event.user || !event.text) return;

    try {
      const rawDoc = await messageToRawDoc({
        user: event.user,
        text: event.text,
        ts: event.ts,
        thread_ts: event.thread_ts,
        channel: event.channel,
      });

      const result = await processRawDocument(rawDoc);
      const label = rawDoc.content.split('\n')[0].slice(0, 80);
      eventBus.emitUpdate({ ...result, source: 'slack', timestamp: new Date().toISOString(), label });
      console.log(`[slack] Processed ${rawDoc.sourceId}: +${result.nodesCreated} nodes`);
    } catch (err) {
      console.error('[slack] Error processing message:', err);
    }
  });

  socketClient.on('error', (err: Error) => {
    console.error('[slack] Socket error:', err.message);
  });

  socketClient.on('unable_to_socket_mode_start', (err: Error) => {
    console.error('[slack] Unable to start Socket Mode:', err.message);
  });

  // Suppress unhandled disconnect events — the client reconnects automatically
  socketClient.on('disconnect', () => {
    console.log('[slack] Disconnected, reconnecting...');
  });

  await socketClient.start();
  console.log('[slack] Socket Mode listener started');
}
