import puppeteer from 'puppeteer-core';

async function testNetwork() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let chapterContent: any = null;

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Intercept network responses
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('sajax=readchapter') && url.includes('ngmar=readc')) {
        console.log('\n=== FOUND CHAPTER CONTENT REQUEST ===');
        console.log('URL:', url);
        try {
          const text = await response.text();
          console.log('Response length:', text.length);
          const json = JSON.parse(text);
          if (json.data) {
            chapterContent = json;
            console.log('Got chapter content!');
            console.log('Book:', json.bookname);
            console.log('Chapter:', json.chaptername);
            console.log('Content preview:', json.data.substring(0, 300));
          }
        } catch (e) {
          console.log('Failed to parse response');
        }
      }
    });

    console.log('Going to chapter page...');
    await page.goto('https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/', {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    console.log('Page loaded, waiting for content request...');
    await new Promise(r => setTimeout(r, 10000));

    if (chapterContent) {
      console.log('\n=== SUCCESS ===');
      console.log('Got chapter content via network intercept!');
    } else {
      console.log('\n=== NO CONTENT ===');
      console.log('Chapter content request was not captured');
    }

  } finally {
    await browser.close();
  }
}

testNetwork().catch(console.error);
