import { fetchRecentGitHubDocs } from '@/lib/ingestion/github';
import { processRawDocument } from '@/lib/extraction/pipeline';
import { getLatestTimestamp } from '@/lib/neo4j';
import { eventBus } from '@/lib/event-bus';

const POLL_INTERVAL_MS = 60_000;

export function startGitHubPoller(owner: string, repo: string): void {
  const poll = async () => {
    try {
      const since = await getLatestTimestamp('github');
      const docs = await fetchRecentGitHubDocs(owner, repo, since);

      for (const doc of docs) {
        const result = await processRawDocument(doc);
        const label = doc.content.replace(/^Commit [a-f0-9]+:\s*/i, '').split('\n')[0].slice(0, 80);
        if (result.nodesCreated > 0) {
          console.log(`[github] Processed ${doc.sourceId}: +${result.nodesCreated} nodes, +${result.edgesCreated} edges`);
        }
        // Always emit so the activity log captures every picked-up doc
        eventBus.emitUpdate({ ...result, source: 'github', timestamp: new Date().toISOString(), label });
      }
    } catch (err) {
      console.error('[github] Poller error:', err);
    }
  };

  setInterval(poll, POLL_INTERVAL_MS);
  console.log(`[github] Poller started for ${owner}/${repo}`);
}
