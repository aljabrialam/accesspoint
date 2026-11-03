// Seedance 2.5 text-to-video via the official Higgsfield SDK (server-side only).
// Credentials: HF_CREDENTIALS="key-id:key-secret" in .env.local at the project root (git-ignored).
// Run: npm run generate:sample   (makes one billable generation request)
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, higgsfield } from '@higgsfield/client/v2';

const MODEL = 'bytedance/seedance-2.5/text-to-video';

const envFile = fileURLToPath(new URL('../../.env.local', import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const credentials = process.env.HF_CREDENTIALS;
if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) {
  console.error('HF_CREDENTIALS is missing or not in key-id:key-secret format. Add it to .env.local at the project root.');
  process.exit(1);
}
config({ credentials });

try {
  console.log(`Submitting ${MODEL} and waiting for the result...`);
  const result = await higgsfield.subscribe(MODEL, {
    input: {
      prompt: 'A cinematic scene at sunset',
      duration: 5,
      resolution: '720p',
      aspect_ratio: '16:9',
    },
    withPolling: true,
  });

  const status = result.status as string;
  const url = result.video?.url;
  if (status === 'completed' && url) {
    console.log(`Completed (request ${result.request_id}).`);
    console.log(`Video URL: ${url}`);
  } else {
    const reason =
      status === 'nsfw'
        ? 'was blocked by content moderation'
        : status === 'failed'
          ? 'failed'
          : status === 'canceled' || status === 'cancelled'
            ? 'was canceled'
            : status === 'completed'
              ? 'completed without a video URL'
              : `ended with status "${status}"`;
    console.error(`Generation ${reason} (request ${result.request_id}). No video was produced.`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
