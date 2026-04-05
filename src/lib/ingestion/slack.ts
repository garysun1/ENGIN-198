import { WebClient } from '@slack/web-api';
import type { RawDocument } from '@/types';

let _client: WebClient | null = null;

function getClient(): WebClient {
  if (_client) return _client;
  _client = new WebClient(process.env.SLACK_BOT_TOKEN);
  return _client;
}

// ─── User resolution ──────────────────────────────────────────────────────────

const userCache = new Map<string, string>();

async function resolveUser(userId: string): Promise<string> {
  if (userCache.has(userId)) return userCache.get(userId)!;

  try {
    const res = await getClient().users.info({ user: userId });
    const name =
      res.user?.profile?.display_name ||
      res.user?.profile?.real_name ||
      res.user?.name ||
      userId;
    userCache.set(userId, name);
    return name;
  } catch {
    userCache.set(userId, userId);
    return userId;
  }
}

// ─── Channel resolution ───────────────────────────────────────────────────────

const channelCache = new Map<string, string>();

async function resolveChannel(channelId: string): Promise<string> {
  if (channelCache.has(channelId)) return channelCache.get(channelId)!;

  try {
    const res = await getClient().conversations.info({ channel: channelId });
    const name = res.channel?.name ?? channelId;
    channelCache.set(channelId, name);
    return name;
  } catch {
    channelCache.set(channelId, channelId);
    return channelId;
  }
}

// ─── Thread fetching ──────────────────────────────────────────────────────────

async function fetchThread(channelId: string, threadTs: string): Promise<string[]> {
  const replies: string[] = [];
  let cursor: string | undefined;

  do {
    const res = await getClient().conversations.replies({
      channel: channelId,
      ts: threadTs,
      cursor,
      limit: 200,
    });

    for (const msg of res.messages ?? []) {
      if (msg.text && msg.user) {
        const userName = await resolveUser(msg.user);
        replies.push(`${userName}: ${msg.text}`);
      }
    }

    cursor = res.response_metadata?.next_cursor ?? undefined;
  } while (cursor);

  return replies;
}

// ─── Main fetch function ──────────────────────────────────────────────────────

const THIRTY_DAYS_AGO = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

export async function fetchSlackDocuments(channelIds: string[]): Promise<RawDocument[]> {
  const docs: RawDocument[] = [];
  const client = getClient();

  for (const channelId of channelIds) {
    console.log(`  Fetching channel ${channelId}...`);
    const channelName = await resolveChannel(channelId);

    let cursor: string | undefined;
    const threadsSeen = new Set<string>();

    do {
      const res = await client.conversations.history({
        channel: channelId,
        oldest: String(THIRTY_DAYS_AGO),
        cursor,
        limit: 200,
      });

      for (const msg of res.messages ?? []) {
        if (!msg.ts || !msg.user) continue;
        // Skip bot messages and system subtypes
        if (msg.subtype) continue;

        const author = await resolveUser(msg.user);
        const createdAt = new Date(parseFloat(msg.ts) * 1000);
        const sourceUrl = `https://slack.com/archives/${channelId}/p${msg.ts.replace('.', '')}`;

        if (msg.thread_ts && msg.thread_ts !== msg.ts) {
          // This message is a reply inside a thread — will be captured with the parent
          continue;
        }

        if (msg.reply_count && msg.reply_count > 0) {
          // Parent message of a thread — fetch full thread
          if (threadsSeen.has(msg.ts)) continue;
          threadsSeen.add(msg.ts);

          const lines = await fetchThread(channelId, msg.ts);
          docs.push({
            source: 'slack',
            sourceId: `${channelId}-${msg.ts}`,
            sourceUrl,
            docType: 'thread',
            content: lines.join('\n'),
            author,
            channel: channelName,
            createdAt,
          });
        } else {
          // Standalone message
          docs.push({
            source: 'slack',
            sourceId: `${channelId}-${msg.ts}`,
            sourceUrl,
            docType: 'message',
            content: msg.text ?? '',
            author,
            channel: channelName,
            createdAt,
          });
        }
      }

      cursor = res.response_metadata?.next_cursor ?? undefined;
    } while (cursor);
  }

  return docs;
}

// ─── Single message → RawDocument (for real-time listener) ───────────────────

export async function messageToRawDoc(event: {
  user: string;
  text: string;
  ts: string;
  thread_ts?: string;
  channel: string;
}): Promise<RawDocument> {
  const author = await resolveUser(event.user);
  const channelName = await resolveChannel(event.channel);

  return {
    source: 'slack',
    sourceId: `${event.channel}-${event.ts}`,
    sourceUrl: `https://slack.com/archives/${event.channel}/p${event.ts.replace('.', '')}`,
    docType: event.thread_ts ? 'thread' : 'message',
    content: event.text,
    author,
    channel: channelName,
    createdAt: new Date(parseFloat(event.ts) * 1000),
  };
}
