async function debugFullSession() {
  const chapterPageUrl = 'https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/';

  console.log('Step 1: Fetch chapter page to get cookies...');

  const pageResponse = await fetch(chapterPageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  const html = await pageResponse.text();

  // Get set-cookie headers
  const setCookieHeaders = pageResponse.headers.getSetCookie?.() || [];
  console.log('Set-Cookie headers:', setCookieHeaders);

  // Parse cookies from headers
  const headerCookies = setCookieHeaders.map(c => c.split(';')[0]).join('; ');
  console.log('Header cookies:', headerCookies);

  // Extract JS-set cookies
  const gacMatch = html.match(/document\.cookie="_gac=([^;]+)/);
  const acMatch = html.match(/document\.cookie="_ac=([^;]+)/);

  const jsCookies = [];
  if (gacMatch) jsCookies.push(`_gac=${gacMatch[1]}`);
  if (acMatch) jsCookies.push(`_ac=${acMatch[1]}`);

  const allCookies = [headerCookies, ...jsCookies].filter(Boolean).join('; ');
  console.log('\nAll cookies:', allCookies.substring(0, 150) + '...');

  // Step 2: Fetch content with all cookies
  console.log('\nStep 2: Fetch chapter content with cookies...');
  const contentUrl = 'https://sangtacviet.app/index.php?bookid=1044603424&h=qidian&c=842086537&ngmar=readc&sajax=readchapter&sty=1&exts=800';

  const contentResponse = await fetch(contentUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': chapterPageUrl,
      'Origin': 'https://sangtacviet.app',
      'Cookie': allCookies,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: '',
  });

  const contentText = await contentResponse.text();
  console.log('\nResponse length:', contentText.length);
  console.log('\nFirst 2000 chars:');
  console.log(contentText.substring(0, 2000));

  try {
    const json = JSON.parse(contentText);
    console.log('\n\n=== Parsed JSON ===');
    console.log('code:', json.code);
    if (json.data) {
      console.log('Has data: YES');
      console.log('Content preview:', json.data.substring(0, 300));
    }
  } catch (e) {
    console.log('Parse error:', e);
  }
}

debugFullSession().catch(console.error);
