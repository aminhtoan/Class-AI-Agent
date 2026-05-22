import puppeteer from 'puppeteer-core';

async function testCookieFetch() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  console.log('Launching browser to get cookies...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('Loading chapter page...');
    await page.goto('https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for cookies to be set by JS
    await new Promise(r => setTimeout(r, 3000));

    // Get all cookies
    const cookies = await page.cookies();
    console.log('\nCookies from browser:');
    cookies.forEach(c => console.log(`  ${c.name}=${c.value.substring(0, 30)}...`));

    // Format cookies for fetch
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    await browser.close();

    // Now make the fetch request with browser cookies
    console.log('\nMaking API request with browser cookies...');
    const contentUrl = 'https://sangtacviet.app/index.php?bookid=1044603424&h=qidian&c=842086537&ngmar=readc&sajax=readchapter&sty=1&exts=800';

    const response = await fetch(contentUrl, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/',
        'Origin': 'https://sangtacviet.app',
        'Cookie': cookieString,
      },
      body: 'rescan=true&k=',
    });

    const text = await response.text();
    console.log('\nResponse length:', text.length);
    console.log('Response:', text.substring(0, 500));

    try {
      const json = JSON.parse(text);
      console.log('\nParsed:');
      console.log('  code:', json.code);
      if (json.data) {
        console.log('  HAS DATA! Length:', json.data.length);
        console.log('  Preview:', json.data.substring(0, 200));
      }
      if (json.err) {
        console.log('  Error:', json.err);
      }
    } catch {}

  } catch (e) {
    console.error('Error:', e);
    await browser.close();
  }
}

testCookieFetch().catch(console.error);
