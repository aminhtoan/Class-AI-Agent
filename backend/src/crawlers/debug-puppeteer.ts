import puppeteer from 'puppeteer-core';

async function testPuppeteer() {
  console.log('Looking for Chrome...');

  // Common Chrome paths on Windows
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
  ];

  let chromePath = '';
  for (const path of chromePaths) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(path)) {
        chromePath = path;
        break;
      }
    } catch {}
  }

  if (!chromePath) {
    console.log('Chrome not found. Trying Edge...');
    const edgePaths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    ];
    for (const path of edgePaths) {
      try {
        const fs = await import('fs');
        if (fs.existsSync(path)) {
          chromePath = path;
          break;
        }
      } catch {}
    }
  }

  if (!chromePath) {
    console.log('No browser found!');
    return;
  }

  console.log('Using browser:', chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('\nNavigating to chapter page...');
    await page.goto('https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('Waiting for content to load...');
    await page.waitForSelector('#maincontent', { timeout: 15000 });

    // Check if there's a "click to load" message
    const needsClick = await page.evaluate(() => {
      const el = document.querySelector('#maincontent');
      return el?.textContent?.includes('Nhấp vào để tải') || el?.textContent?.includes('tải chương');
    });

    if (needsClick) {
      console.log('Content needs interaction to load...');

      // Try calling gotox() which should reload the content
      await page.evaluate(() => {
        // @ts-ignore
        if (typeof window.gotox === 'function') {
          console.log('Calling gotox()');
          // @ts-ignore
          window.gotox();
        }
      });

      // Wait for network and content
      await new Promise(r => setTimeout(r, 10000));

      // Log any console messages
      const logs = await page.evaluate(() => {
        const el = document.querySelector('#maincontent');
        return {
          content: el?.innerHTML?.substring(0, 200) || 'empty',
          hasSpinner: el?.innerHTML?.includes('spinner') || false,
        };
      });
      console.log('After gotox:', logs);
    }

    // Wait for actual content (not the "loading" message)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('#maincontent');
        return el && !el.textContent?.includes('Nhấp vào để tải') && el.textContent!.length > 1000;
      },
      { timeout: 20000 }
    ).catch(() => console.log('Timeout waiting for content'));

    const content = await page.evaluate(() => {
      const el = document.querySelector('#maincontent');
      return {
        html: el?.innerHTML || '',
        text: el?.textContent || '',
      };
    });

    console.log('\n=== Content Found ===');
    console.log('HTML length:', content.html.length);
    console.log('Text length:', content.text.length);
    console.log('\nText preview (first 500 chars):');
    console.log(content.text.substring(0, 500));

  } finally {
    await browser.close();
  }
}

testPuppeteer().catch(console.error);
