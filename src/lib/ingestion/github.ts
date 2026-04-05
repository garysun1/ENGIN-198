import { Octokit } from 'octokit';
import type { RawDocument } from '@/types';

let _octokit: Octokit | null = null;

function getOctokit(): Octokit {
  if (_octokit) return _octokit;
  _octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return _octokit;
}

const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

// ─── PRs ─────────────────────────────────────────────────────────────────────

async function fetchPRs(owner: string, repo: string): Promise<RawDocument[]> {
  const octokit = getOctokit();
  const docs: RawDocument[] = [];

  for await (const res of octokit.paginate.iterator(octokit.rest.pulls.list, {
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: 100,
  })) {
    for (const pr of res.data) {
      if (pr.updated_at < THIRTY_DAYS_AGO) break;

      // Fetch review comments for richer context
      const { data: reviews } = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pr.number,
      });

      const reviewText = reviews
        .filter((r) => r.body)
        .map((r) => `Review by ${r.user?.login ?? 'unknown'}: ${r.body}`)
        .join('\n');

      const content = [
        `PR #${pr.number}: ${pr.title}`,
        pr.body ?? '',
        reviewText,
      ]
        .filter(Boolean)
        .join('\n\n');

      docs.push({
        source: 'github',
        sourceId: `pr-${pr.number}`,
        sourceUrl: pr.html_url,
        docType: 'pr',
        content,
        author: pr.user?.login ?? null,
        createdAt: new Date(pr.created_at),
      });
    }
  }

  return docs;
}

// ─── Issues ───────────────────────────────────────────────────────────────────

async function fetchIssues(owner: string, repo: string): Promise<RawDocument[]> {
  const octokit = getOctokit();
  const docs: RawDocument[] = [];

  for await (const res of octokit.paginate.iterator(octokit.rest.issues.list, {
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    since: THIRTY_DAYS_AGO,
    per_page: 100,
  })) {
    for (const issue of res.data) {
      // issues.list returns PRs too — skip them
      if ('pull_request' in issue) continue;

      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issue.number,
        per_page: 50,
      });

      const commentText = comments
        .map((c) => `${c.user?.login ?? 'unknown'}: ${c.body}`)
        .join('\n');

      const content = [
        `Issue #${issue.number}: ${issue.title}`,
        issue.body ?? '',
        commentText,
      ]
        .filter(Boolean)
        .join('\n\n');

      docs.push({
        source: 'github',
        sourceId: `issue-${issue.number}`,
        sourceUrl: issue.html_url,
        docType: 'issue',
        content,
        author: issue.user?.login ?? null,
        createdAt: new Date(issue.created_at),
      });
    }
  }

  return docs;
}

// ─── Commits ──────────────────────────────────────────────────────────────────

async function fetchCommits(owner: string, repo: string): Promise<RawDocument[]> {
  const octokit = getOctokit();
  const { data: commits } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    since: THIRTY_DAYS_AGO,
    per_page: 100,
  });

  return commits.map((c) => ({
    source: 'github' as const,
    sourceId: `commit-${c.sha.slice(0, 7)}`,
    sourceUrl: c.html_url,
    docType: 'commit' as const,
    content: `Commit ${c.sha.slice(0, 7)}: ${c.commit.message}`,
    author: c.author?.login ?? c.commit.author?.name ?? null,
    createdAt: new Date(c.commit.author?.date ?? Date.now()),
  }));
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchGitHubDocuments(owner: string, repo: string): Promise<RawDocument[]> {
  console.log(`  Fetching PRs from ${owner}/${repo}...`);
  const prs = await fetchPRs(owner, repo);

  console.log(`  Fetching issues from ${owner}/${repo}...`);
  const issues = await fetchIssues(owner, repo);

  console.log(`  Fetching commits from ${owner}/${repo}...`);
  const commits = await fetchCommits(owner, repo);

  return [...prs, ...issues, ...commits];
}

// ─── Recent items for polling (since a given date) ────────────────────────────

export async function fetchRecentGitHubDocs(
  owner: string,
  repo: string,
  since: Date
): Promise<RawDocument[]> {
  const octokit = getOctokit();
  const sinceStr = since.toISOString();
  const docs: RawDocument[] = [];

  // Recent PRs
  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: 20,
  });

  for (const pr of prs) {
    if (new Date(pr.updated_at) <= since) continue;
    docs.push({
      source: 'github',
      sourceId: `pr-${pr.number}`,
      sourceUrl: pr.html_url,
      docType: 'pr',
      content: `PR #${pr.number}: ${pr.title}\n\n${pr.body ?? ''}`,
      author: pr.user?.login ?? null,
      createdAt: new Date(pr.created_at),
    });
  }

  // Recent issues
  const { data: issues } = await octokit.rest.issues.list({
    owner,
    repo,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    since: sinceStr,
    per_page: 20,
  });

  for (const issue of issues) {
    if ('pull_request' in issue) continue;
    docs.push({
      source: 'github',
      sourceId: `issue-${issue.number}`,
      sourceUrl: issue.html_url,
      docType: 'issue',
      content: `Issue #${issue.number}: ${issue.title}\n\n${issue.body ?? ''}`,
      author: issue.user?.login ?? null,
      createdAt: new Date(issue.created_at),
    });
  }

  // Recent commits
  const { data: commits } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    since: sinceStr,
    per_page: 20,
  });

  for (const c of commits) {
    const commitDate = new Date(c.commit.author?.date ?? Date.now());
    if (commitDate <= since) continue;
    docs.push({
      source: 'github',
      sourceId: `commit-${c.sha.slice(0, 7)}`,
      sourceUrl: c.html_url,
      docType: 'commit',
      content: `Commit ${c.sha.slice(0, 7)}: ${c.commit.message}`,
      author: c.author?.login ?? c.commit.author?.name ?? null,
      createdAt: commitDate,
    });
  }

  return docs;
}
