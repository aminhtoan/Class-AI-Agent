import { httpClient } from './http.client';

const RETRYABLE_STATUS = [429, 500, 502, 503, 504];
const NON_RETRYABLE_STATUS = [404, 403, 400, 401];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  maxRetries = 3,
): Promise<string> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const res = await httpClient.get(url, { responseType: 'text' });
      return res.data;
    } catch (err: any) {
      const status = err.response?.status;

      if (NON_RETRYABLE_STATUS.includes(status)) {
        throw new Error(`NON_RETRYABLE: ${status} for ${url}`);
      }

      if (attempt === maxRetries) {
        throw new Error(
          `EXHAUSTED_RETRIES after ${maxRetries} attempts: ${url}`,
        );
      }

      // Handle 429 with Retry-After header
      if (status === 429) {
        const retryAfter = parseInt(
          err.response?.headers?.['retry-after'] || '5',
          10,
        );
        const waitMs = retryAfter * 1000;
        await sleep(waitMs);
        attempt++;
        continue;
      }

      // Exponential backoff with jitter
      const baseDelay = Math.pow(2, attempt) * 1000;
      const jitter = Math.random() * 500;
      const delay = baseDelay + jitter;

      await sleep(delay);
      attempt++;
    }
  }

  throw new Error(`Failed to fetch: ${url}`);
}

export async function politeDelay(): Promise<void> {
  const min = 300;
  const max = 1200;
  const delay = Math.floor(Math.random() * (max - min) + min);
  await sleep(delay);
}
