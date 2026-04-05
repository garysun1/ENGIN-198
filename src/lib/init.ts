import { startSlackListener } from './realtime/slack-listener';
import { startGitHubPoller } from './realtime/github-poller';

let initialized = false;

export async function initializeServices(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (process.env.SLACK_APP_TOKEN) {
    await startSlackListener();
  }

  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
    const [owner, repo] = process.env.GITHUB_REPO.split('/');
    startGitHubPoller(owner, repo);
  }
}
