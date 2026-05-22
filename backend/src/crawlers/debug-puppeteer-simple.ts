import puppeteer from 'puppeteer-core';

async function testSimple() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false, // Show browser for debugging
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Listen for console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('Going to chapter page...');
    await page.goto('https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    console.log('Page loaded, waiting 15 seconds for JS to execute...');
    await new Promise(r => setTimeout(r, 15000));

    // Get the content
    const result = await page.evaluate(() => {
      const mainContent = document.querySelector('#maincontent');
      return {
        innerHTML: mainContent?.innerHTML?.substring(0, 500) || 'NOT FOUND',
        textLength: mainContent?.textContent?.length || 0,
        hasRealContent: mainContent?.textContent?.includes('Kiệt minh') || false,
      };
    });

    console.log('\n=== Result ===');
    console.log('Text length:', result.textLength);
    console.log('Has real content:', result.hasRealContent);
    console.log('Preview:', result.innerHTML);

  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
  }
}

testSimple().catch(console.error);
