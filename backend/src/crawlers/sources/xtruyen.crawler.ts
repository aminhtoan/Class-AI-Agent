import * as cheerio from 'cheerio';
import {
  Crawler,
  CrawlerResult,
  TocEntry,
  ChapterData,
  StoryMetadata,
} from '../crawler.interface';

const SUPPORTED_HOSTS = ['xtruyen.vn', 'www.xtruyen.vn'];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

export class XtruyenCrawler implements Crawler {
  readonly name = 'xtruyen';
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
      const html = await this.fetchWithBrowser(storyUrl);
      const $ = cheerio.load(html);

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('.post-title h1').text().trim() ||
        $('title').text().split('–')[0].trim() ||
        'Unknown Title';

      const author =
        $('meta[property="book:author"]').attr('content')?.replace('https://xtruyen.vn/tacgia/', '').replace('/', '').replace(/-/g, ' ') ||
        $('.author-content a').text().trim() ||
        null;

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('.description-summary .summary__content p').text().trim() ||
        '';

      const coverUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('.summary_image img').attr('src') ||
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
      const html = await this.fetchWithBrowser(storyUrl, true);
      const $ = cheerio.load(html);

      const chapters: TocEntry[] = [];

      // Try to find chapters in the page
      $('.wp-manga-chapter a, .version-chap a, li.wp-manga-chapter a').each((i, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = $el.text().trim();

        if (href && title && href.includes('/chuong-')) {
          chapters.push({
            title,
            url: href,
            position: i + 1,
          });
        }
      });

      // If no chapters found via normal selectors, try alternative
      if (chapters.length === 0) {
        $('ul.main li a, .listing-chapters_wrap a').each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const title = $el.text().trim();

          if (href && title && href.includes('chuong')) {
            chapters.push({
              title,
              url: href,
              position: i + 1,
            });
          }
        });
      }

      // Reverse to get ascending order (first chapter first)
      chapters.reverse();

      // Re-assign positions
      chapters.forEach((ch, idx) => {
        ch.position = idx + 1;
      });

      if (chapters.length === 0) {
        // Try to extract from script or generate based on last chapter
        const lastChapterMatch = html.match(/chuong-(\d+)/g);
        if (lastChapterMatch) {
          const lastChapterNum = Math.max(
            ...lastChapterMatch.map((m) => parseInt(m.replace('chuong-', ''), 10))
          );

          const baseUrl = storyUrl.endsWith('/') ? storyUrl : storyUrl + '/';

          for (let i = 1; i <= lastChapterNum; i++) {
            chapters.push({
              title: `Chương ${i}`,
              url: `${baseUrl}chuong-${i}/`,
              position: i,
            });
          }
        }
      }

      if (chapters.length === 0) {
        return {
          success: false,
          error: {
            code: 'NO_CHAPTERS_FOUND',
            message: 'Could not find any chapters on this page',
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
    try {
      const html = await this.fetchWithBrowser(chapterUrl);
      const $ = cheerio.load(html);

      // Try multiple selectors for content
      let contentEl = $('.reading-content .text-left');
      if (contentEl.length === 0) contentEl = $('.entry-content');
      if (contentEl.length === 0) contentEl = $('.text-left');
      if (contentEl.length === 0) contentEl = $('#chapter-content');
      if (contentEl.length === 0) contentEl = $('.c-blog-post .entry-content');

      if (contentEl.length === 0) {
        return {
          success: false,
          error: {
            code: 'CONTENT_NOT_FOUND',
            message: 'Could not find chapter content on the page',
          },
        };
      }

      // Remove ads and unwanted elements
      contentEl.find('script, style, .ads, .advertisement, ins').remove();

      const contentHtml = contentEl.html() || '';
      const contentText = stripHtml(contentHtml);

      if (contentText.length < 100) {
        return {
          success: false,
          error: {
            code: 'CONTENT_TOO_SHORT',
            message: 'Chapter content appears to be too short or empty',
          },
        };
      }

      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('.c-breadcrumb-wrapper .active').text().trim() ||
        $('h1').first().text().trim() ||
        'Untitled Chapter';

      return {
        success: true,
        data: {
          title,
          contentHtml,
          contentText,
          wordCount: countWords(contentText),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: {
          code: 'FETCH_CHAPTER_FAILED',
          message: `Failed to fetch chapter content: ${message}`,
        },
      };
    }
  }

  private async fetchWithBrowser(url: string, waitForChapters = false): Promise<string> {
    const chromePath = await findChromePath();
    if (!chromePath) {
      throw new Error('Chrome/Chromium not found');
    }

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

      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for Cloudflare challenge if present
      await page.waitForFunction(
        '!document.body.innerText.includes("Checking your browser")',
        { timeout: 30000 }
      ).catch(() => {});

      if (waitForChapters) {
        // Wait for chapter list to load via AJAX
        await new Promise(r => setTimeout(r, 3000));

        // Try to click "load more" or expand chapters
        await page.evaluate(`
          (function() {
            var btn = document.querySelector('.chapter-readmore, .btn-chapter-more, [data-action="load-chapters"]');
            if (btn) btn.click();
          })()
        `);

        await new Promise(r => setTimeout(r, 2000));
      }

      const html = await page.content();
      return html;
    } finally {
      await browser.close();
    }
  }
}
