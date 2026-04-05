import { fetchRecentGitHubDocs } from '@/lib/ingestion/github';
import { processRawDocument } from '@/lib/extraction/pipeline';
import { getLatestTimestamp } from '@/lib/neo4j';
import { eventBus } from '@/lib/event-bus';

const POLL_INTERVAL_MS = 60_000;

export function startGitHubPoller(owner: string, repo: string): void {
  const poll = async () => {
    try {
      const since = await getLatestTimestamp('github');
      console.log(`[github] Polling since ${since.toISOString()}`);
      const docs = await fetchRecentGitHubDocs(owner, repo, since);
      console.log(`[github] Found ${docs.length} new doc(s)`);

      for (const doc of docs) {
        const result = await processRawDocument(doc);
        console.log(`[github] ${doc.sourceId}: +${result.nodesCreated} nodes, +${result.edgesCreated} edges`);
        if (result.nodesCreated > 0) {
          eventBus.emitUpdate({ ...result, source: 'github', timestamp: new Date().toISOString() });
        }
      }
    } catch (err) {
      console.error('[github] Poller error:', err);
    }
  };

  setInterval(poll, POLL_INTERVAL_MS);
  console.log(`[github] Poller started for ${owner}/${repo} (every ${POLL_INTERVAL_MS / 1000}s)`);
}
