import * as cheerio from 'cheerio';
import {
  Crawler,
  CrawlerResult,
  TocEntry,
  ChapterData,
  StoryMetadata,
} from '../crawler.interface';

const SUPPORTED_HOSTS = ['sangtacviet.app', 'www.sangtacviet.app'];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

interface ChapterApiResponse {
  code?: string | number;
  bookname?: string;
  chaptername?: string;
  data?: string;
  err?: string;
}

interface ChromeCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
}

async function findChromePath(): Promise<string | null> {
  const fs = await import('fs');
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const path of chromePaths) {
    if (path && fs.existsSync(path)) {
      return path;
    }
  }
  return null;
}

async function getChromeCookiesForDomain(domain: string): Promise<ChromeCookie[]> {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  let cookiesPath = '';
  const platform = os.platform();

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      cookiesPath = path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Network', 'Cookies');
      if (!fs.existsSync(cookiesPath)) {
        cookiesPath = path.join(localAppData, 'Google', 'Chrome', 'User Data', 'Default', 'Cookies');
      }
    }
  } else if (platform === 'darwin') {
    cookiesPath = path.join(os.homedir(), 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cookies');
  } else {
    cookiesPath = path.join(os.homedir(), '.config', 'google-chrome', 'Default', 'Cookies');
  }

  if (!fs.existsSync(cookiesPath)) {
    return [];
  }

  try {
    // Copy cookies file to temp location since it might be locked by Chrome
    const tempDir = os.tmpdir();
    const tempCookies = path.join(tempDir, `chrome_cookies_${Date.now()}.db`);
    fs.copyFileSync(cookiesPath, tempCookies);

    // Use better-sqlite3 or similar to read cookies
    // For now, return empty since we can't decrypt Chrome cookies without the encryption key
    // The encryption makes it infeasible to extract cookies programmatically
    fs.unlinkSync(tempCookies);
    return [];
  } catch {
    return [];
  }
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.text();
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(text: string): number {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

interface StoryUrlParts {
  host: string;
  bookId: string;
  baseUrl: string;
}

function parseStoryUrl(storyUrl: string): StoryUrlParts | null {
  const match = storyUrl.match(/\/truyen\/([^/]+)\/\d+\/(\d+)/);
  if (!match) return null;

  return {
    host: match[1],
    bookId: match[2],
    baseUrl: new URL(storyUrl).origin,
  };
}

function parseChapterUrl(chapterUrl: string): { host: string; bookId: string; chapterId: string; baseUrl: string } | null {
  const match = chapterUrl.match(/\/truyen\/([^/]+)\/\d+\/(\d+)\/(\d+)/);
  if (!match) return null;

  return {
    host: match[1],
    bookId: match[2],
    chapterId: match[3],
    baseUrl: new URL(chapterUrl).origin,
  };
}

export class SangtacvietCrawler implements Crawler {
  readonly name = 'sangtacviet';
  readonly supportedHosts = SUPPORTED_HOSTS;

  supports(host: string): boolean {
    const normalizedHost = host.toLowerCase();
    return SUPPORTED_HOSTS.some(
      (supported) =>
        normalizedHost === supported ||
        normalizedHost.endsWith(`.${supported}`),
    );
  }

  async fetchStoryMetadata(storyUrl: string): Promise<CrawlerResult<StoryMetadata>> {
    try {
      const html = await fetchHtml(storyUrl);
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:novel:book_name"]').attr('content') ||
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().split('-')[0].trim() ||
        'Unknown Title';

      const author =
        $('meta[property="og:novel:author"]').attr('content') ||
        null;

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        '';

      const coverUrl =
        $('meta[property="og:image"]').attr('content') ||
        undefined;

      return {
        success: true,
        data: {
          title: title.trim(),
          author: author?.trim() || null,
          description: description.trim(),
          coverUrl,
          language: 'vi',
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'FETCH_METADATA_FAILED',
          message: `Failed to fetch story metadata: ${message}`,
        },
      };
    }
  }

  async fetchToc(storyUrl: string): Promise<CrawlerResult<TocEntry[]>> {
    try {
      const urlParts = parseStoryUrl(storyUrl);
      if (!urlParts) {
        return {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Could not parse story URL. Expected format: /truyen/{host}/1/{bookId}/',
          },
        };
      }

      const apiUrl = `${urlParts.baseUrl}/index.php?ngmar=chapterlist&h=${urlParts.host}&bookid=${urlParts.bookId}&sajax=getchapterlist`;

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json, text/plain, */*',
          'Referer': storyUrl,
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const json = await response.json() as { code?: number; data?: string };

      if (json.code !== 1 || !json.data) {
        return {
          success: false,
          error: {
            code: 'API_ERROR',
            message: 'Chapter list API returned an error',
          },
        };
      }

      const chaptersRaw = json.data.split('-//-');
      const chapters: TocEntry[] = [];

      for (let i = 0; i < chaptersRaw.length; i++) {
        const parts = chaptersRaw[i].split('-/-');
        if (parts.length >= 3) {
          const chapterId = parts[1].trim();
          const title = parts[2].trim();

          if (chapterId && title) {
            chapters.push({
              title,
              url: `${urlParts.baseUrl}/truyen/${urlParts.host}/1/${urlParts.bookId}/${chapterId}/`,
              position: i + 1,
            });
          }
        }
      }

      if (chapters.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_CHAPTERS_FOUND',
            message: 'Could not parse any chapters from API response',
          },
        };
      }

      return {
        success: true,
        data: chapters,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'FETCH_TOC_FAILED',
          message: `Failed to fetch table of contents: ${message}`,
        },
      };
    }
  }

  async fetchChapter(chapterUrl: string): Promise<CrawlerResult<ChapterData>> {
    const urlParts = parseChapterUrl(chapterUrl);
    if (!urlParts) {
      return {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Could not parse chapter URL',
        },
      };
    }

    // Use browser-based approach for sangtacviet due to anti-bot protection
    return this.fetchChapterWithBrowser(chapterUrl, urlParts);
  }

  private async fetchChapterWithBrowser(
    chapterUrl: string,
    urlParts: { host: string; bookId: string; chapterId: string; baseUrl: string },
  ): Promise<CrawlerResult<ChapterData>> {
    const chromePath = await findChromePath();
    if (!chromePath) {
      return {
        success: false,
        error: {
          code: 'NO_BROWSER',
          message: 'Chrome/Chromium not found. Install Chrome to fetch chapter content from sangtacviet.',
        },
      };
    }

    try {
      const puppeteer = await import('puppeteer-core');

      const browser = await puppeteer.default.launch({
        executablePath: chromePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      try {
        const page = await browser.newPage();

        // Evade detection - hide webdriver property
        await page.evaluateOnNewDocument('Object.defineProperty(navigator, "webdriver", { get: () => false })');

        await page.setUserAgent(USER_AGENT);
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        });

        let capturedContent: ChapterApiResponse | null = null;
        let capturedError: ChapterApiResponse | null = null;

        // Intercept API responses
        page.on('response', async response => {
          const url = response.url();
          if (url.includes('sajax=readchapter') && url.includes('ngmar=readc')) {
            try {
              const text = await response.text();
              const json: ChapterApiResponse = JSON.parse(text);
              if (json.code === '0' || json.code === 0) {
                capturedContent = json;
              } else {
                capturedError = json;
              }
            } catch {
              // Ignore parse errors
            }
          }
        });

        // Navigate to chapter page and wait for network to settle
        await page.goto(chapterUrl, {
          waitUntil: 'networkidle0',
          timeout: 45000,
        });

        // Wait for async content loading
        await new Promise(r => setTimeout(r, 3000));

        // If content wasn't captured automatically, try triggering the API call manually
        if (!capturedContent) {
          const manualResult = await page.evaluate((params: { host: string; bookId: string; chapterId: string }) => {
            return new Promise<string>((resolve) => {
              // @ts-ignore - XMLHttpRequest exists in browser context
              const xhr = new (window as any).XMLHttpRequest();
              const apiUrl = `/index.php?bookid=${params.bookId}&h=${params.host}&c=${params.chapterId}&ngmar=readc&sajax=readchapter&sty=1&exts=800`;
              xhr.open('POST', apiUrl, true);
              xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  resolve(xhr.responseText);
                }
              };
              xhr.send('rescan=true&k=');
            });
          }, urlParts);

          if (manualResult) {
            try {
              const json: ChapterApiResponse = JSON.parse(manualResult);
              if (json.code === '0' || json.code === 0) {
                capturedContent = json;
              } else {
                capturedError = json;
              }
            } catch {
              // Ignore
            }
          }
        }

        // If still no content, try triggering the page's own function
        if (!capturedContent) {
          await page.evaluate(() => {
            // @ts-ignore
            if (typeof window.gotox === 'function') window.gotox();
            // @ts-ignore
            if (typeof window.loadChapter === 'function') window.loadChapter();
          });
          await new Promise(r => setTimeout(r, 5000));
        }

        if (capturedContent && capturedContent.data) {
          const contentHtml = capturedContent.data;
          const contentText = stripHtml(contentHtml);
          return {
            success: true,
            data: {
              title: capturedContent.chaptername || 'Untitled',
              contentHtml,
              contentText,
              wordCount: countWords(contentText),
            },
          };
        }

        // Handle specific error codes
        if (capturedError) {
          const errorCode = String(capturedError.code);
          const errorMessage = capturedError.err || 'Unknown API error';

          if (errorMessage.includes('4002')) {
            return {
              success: false,
              error: {
                code: 'VIP_CONTENT',
                message: 'This chapter requires VIP/premium access or login on sangtacviet.app. Please login in your browser first, then try again. Error: ' + errorMessage,
              },
            };
          }

          if (errorCode === '5') {
            return {
              success: false,
              error: {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required. Please login to sangtacviet.app in your Chrome browser first. Error: ' + errorMessage,
              },
            };
          }

          return {
            success: false,
            error: {
              code: 'API_ERROR',
              message: `API error (code ${errorCode}): ${errorMessage}`,
            },
          };
        }

        // Try to get content from the DOM as last resort
        const domContent = await page.evaluate(() => {
          // @ts-ignore - document exists in browser context
          const contentEl = (window as any).document.querySelector('#maincontent');
          if (contentEl) {
            const text = contentEl.textContent || '';
            if (text.length > 500 && !text.includes('Nhấp vào để tải') && !text.includes('loading')) {
              return {
                html: contentEl.innerHTML,
                text: text,
              };
            }
          }
          return null;
        });

        if (domContent && domContent.text.length > 500) {
          const titleEl = await page.$eval('meta[property="og:title"]', el => el.getAttribute('content')).catch(() => 'Untitled');
          return {
            success: true,
            data: {
              title: titleEl || 'Untitled',
              contentHtml: domContent.html,
              contentText: stripHtml(domContent.html),
              wordCount: countWords(domContent.text),
            },
          };
        }

        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_LOADED',
            message: 'Could not load chapter content. The chapter may require VIP access on sangtacviet.app.',
          },
        };
      } finally {
        await browser.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'BROWSER_ERROR',
          message: `Browser automation failed: ${message}`,
        },
      };
    }
  }
}

// Export the standalone function for backward compatibility
export async function fetchChapterWithBrowser(
  chapterUrl: string,
): Promise<CrawlerResult<ChapterData>> {
  const crawler = new SangtacvietCrawler();
  return crawler.fetchChapter(chapterUrl);
}
