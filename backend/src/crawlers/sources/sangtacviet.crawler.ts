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
    // First try simple HTML fetch - content is often rendered server-side
    try {
      const result = await this.fetchChapterFromHtml(chapterUrl);
      if (result.success) {
        return result;
      }
    } catch {
      // Fall through to browser-based approach
    }

    // Fall back to browser-based approach if HTML fetch fails
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

    return this.fetchChapterWithBrowser(chapterUrl);
  }

  private async fetchChapterFromHtml(chapterUrl: string): Promise<CrawlerResult<ChapterData>> {
    const html = await fetchHtml(chapterUrl);
    const $ = cheerio.load(html);

    // Get chapter title
    const title =
      $('h1.chuong-title').text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim() ||
      'Untitled';

    // Try multiple selectors for content
    const contentSelectors = [
      '#chapter-content',
      '#noidung',
      '.chapter-content',
      '.noi-dung',
      '#content',
      '.content-chapter',
      'article.chapter',
      '#maincontent',
    ];

    let contentHtml = '';

    for (const selector of contentSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        const text = el.text().trim();
        // Check for actual content: substantial length, has Vietnamese chars, no loading placeholders
        const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
        const isPlaceholder = text.includes('Nhấp vào để tải') || text.includes('loading') || text.includes('try{');
        if (text.length > 200 && hasVietnamese && !isPlaceholder) {
          contentHtml = el.html() || '';
          break;
        }
      }
    }

    // If no content found with selectors, try finding by class pattern
    if (!contentHtml) {
      $('div').each((_, el) => {
        const $el = $(el);
        const className = $el.attr('class') || '';
        const id = $el.attr('id') || '';

        if (
          className.includes('content') ||
          className.includes('noidung') ||
          className.includes('chapter') ||
          id.includes('content') ||
          id.includes('noidung')
        ) {
          const text = $el.text().trim();
          const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
          const isPlaceholder = text.includes('Nhấp vào để tải') || text.includes('loading') || text.includes('try{');
          if (text.length > 500 && hasVietnamese && !isPlaceholder) {
            contentHtml = $el.html() || '';
            return false; // break
          }
        }
      });
    }

    if (!contentHtml || contentHtml.length < 200) {
      return {
        success: false,
        error: {
          code: 'NO_CONTENT',
          message: 'Could not find chapter content in HTML',
        },
      };
    }

    // Clean up the content
    const contentText = stripHtml(contentHtml);

    if (contentText.length < 100) {
      return {
        success: false,
        error: {
          code: 'CONTENT_TOO_SHORT',
          message: 'Chapter content appears to be empty or too short',
        },
      };
    }

    return {
      success: true,
      data: {
        title,
        contentHtml,
        contentText,
        wordCount: countWords(contentText),
      },
    };
  }

  private async fetchChapterWithBrowser(chapterUrl: string): Promise<CrawlerResult<ChapterData>> {
    const chromePath = await findChromePath();
    if (!chromePath) {
      return {
        success: false,
        error: {
          code: 'NO_BROWSER',
          message: 'Chrome/Chromium not found. Install Chrome to fetch chapter content.',
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
        await page.evaluateOnNewDocument('Object.defineProperty(navigator, "webdriver", { get: () => false })');
        await page.setUserAgent(USER_AGENT);
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        });

        await page.goto(chapterUrl, {
          waitUntil: 'networkidle0',
          timeout: 45000,
        });

        // Wait for content to load - the site loads content dynamically
        // Try waiting for specific content selectors
        try {
          await page.waitForFunction(
            () => {
              const doc = (globalThis as any).document;
              const el = doc.querySelector('#contentChap') ||
                         doc.querySelector('#chapter-content') ||
                         doc.querySelector('#noidung');
              if (el) {
                const text = el.textContent?.trim() || '';
                return text.length > 200 && !text.includes('Nhấp vào để tải');
              }
              return false;
            },
            { timeout: 15000 }
          );
        } catch {
          // Content might already be there or loaded differently
        }

        // Additional wait for any animations/transitions
        await new Promise(r => setTimeout(r, 2000));

        // Try to get content from DOM
        const result = await page.evaluate(() => {
          const doc = (globalThis as any).document;

          // Priority selectors for sangtacviet
          const selectors = [
            '#contentChap',
            '#chapter-content',
            '#noidung',
            '.chapter-content',
            '.noi-dung',
            '#content',
            '#maincontent',
          ];

          for (const selector of selectors) {
            const el = doc.querySelector(selector);
            if (el) {
              const text = el.textContent?.trim() || '';
              // Make sure it's actual content, not a loading message
              if (text.length > 200 && !text.includes('Nhấp vào để tải') && !text.includes('loading')) {
                return {
                  html: el.innerHTML,
                  text: text,
                };
              }
            }
          }

          // Try finding any div with substantial Vietnamese text
          const divs = doc.querySelectorAll('div');
          for (const div of divs) {
            const text = div.textContent?.trim() || '';
            // Look for Vietnamese text patterns (common Vietnamese characters)
            const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
            if (text.length > 500 && hasVietnamese) {
              const className = div.className || '';
              const id = div.id || '';
              if (
                className.includes('content') ||
                className.includes('noidung') ||
                className.includes('chap') ||
                id.includes('content') ||
                id.includes('noidung') ||
                id.includes('chap')
              ) {
                return {
                  html: div.innerHTML,
                  text: text,
                };
              }
            }
          }

          return null;
        });

        if (result && result.text.length > 100) {
          const title = await page.$eval(
            'h1.chuong-title, meta[property="og:title"]',
            (el: any) => el.textContent?.trim() || el.getAttribute('content')
          ).catch(() => 'Untitled');

          return {
            success: true,
            data: {
              title: title || 'Untitled',
              contentHtml: result.html,
              contentText: stripHtml(result.html),
              wordCount: countWords(result.text),
            },
          };
        }

        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Could not find chapter content on page. Content may require VIP access.',
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
