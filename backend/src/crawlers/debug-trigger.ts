import puppeteer from 'puppeteer-core';

async function testTrigger() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox'],
  });

  let capturedContent: any = null;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Intercept all XHR/fetch
    await page.setRequestInterception(true);
    page.on('request', request => {
      request.continue();
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('readchapter')) {
        try {
          const text = await response.text();
          if (text.includes('"data"')) {
            const json = JSON.parse(text);
            if (json.data && json.data.length > 100) {
              capturedContent = json;
              console.log('CAPTURED content!', json.chaptername);
            }
          }
        } catch {}
      }
    });

    console.log('Navigating...');
    await page.goto('https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for page scripts to initialize
    await new Promise(r => setTimeout(r, 3000));

    // Try to manually trigger the content load
    console.log('Triggering content load...');
    await page.evaluate(() => {
      // Find and execute the chapter fetcher code
      const script = `
        var chapterfetcher = new XMLHttpRequest();
        chapterfetcher.open('POST', '/index.php?bookid=1044603424&h=qidian&c=842086537&ngmar=readc&sajax=readchapter&sty=1&exts=800', false);
        chapterfetcher.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        chapterfetcher.send('rescan=true&k=');
        return chapterfetcher.responseText;
      `;
      try {
        const result = eval(script);
        console.log('Direct XHR result:', result?.substring(0, 100));
        // Store in window for retrieval
        (window as any).__chapterResult = result;
      } catch(e) {
        console.log('Eval error:', e);
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    // Get the result
    const directResult = await page.evaluate(() => (window as any).__chapterResult);
    if (directResult) {
      console.log('\n=== Direct XHR Result ===');
      console.log('Length:', directResult.length);
      console.log('Preview:', directResult.substring(0, 500));
      try {
        const json = JSON.parse(directResult);
        console.log('Code:', json.code);
        if (json.data) {
          console.log('Has content:', json.data.length);
        }
      } catch {}
    }

    if (capturedContent) {
      console.log('\n=== Captured via Response ===');
      console.log(capturedContent);
    }

  } finally {
    await browser.close();
  }
}

testTrigger().catch(console.error);
