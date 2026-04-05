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
      eventBus.emitUpdate(result);
      console.log(`[slack] Processed ${rawDoc.sourceId}: +${result.nodesCreated} nodes`);
    } catch (err) {
      console.error('[slack] Error processing message:', err);
    }
  });

  await socketClient.start();
  console.log('[slack] Socket Mode listener started');
}
