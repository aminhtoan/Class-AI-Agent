async function debugWithCookies() {
  const chapterPageUrl = 'https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/';

  console.log('Step 1: Fetch chapter page to get cookies...');

  const pageResponse = await fetch(chapterPageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  const html = await pageResponse.text();

  // Extract cookies from HTML (they're set via JavaScript)
  const gacMatch = html.match(/document\.cookie="_gac=([^"]+)"/);
  const acMatch = html.match(/document\.cookie="_ac=([^"]+)"/);

  console.log('_gac cookie:', gacMatch ? gacMatch[1].substring(0, 50) + '...' : 'not found');
  console.log('_ac cookie:', acMatch ? acMatch[1] : 'not found');

  // Also get set-cookie headers
  const setCookieHeaders = pageResponse.headers.getSetCookie?.() || [];
  console.log('Set-Cookie headers:', setCookieHeaders);

  if (!gacMatch || !acMatch) {
    console.log('Could not extract cookies from page');
    return;
  }

  const cookies = `_gac=${gacMatch[1]}; _ac=${acMatch[1]}`;
  console.log('\nUsing cookies:', cookies.substring(0, 100) + '...');

  // Step 2: Fetch content with cookies
  console.log('\nStep 2: Fetch chapter content with cookies...');
  const contentUrl = 'https://sangtacviet.app/index.php?bookid=1044603424&h=qidian&c=842086537&ngmar=readc&sajax=readchapter&sty=1&exts=800';

  const contentResponse = await fetch(contentUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': chapterPageUrl,
      'Cookie': cookies,
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
    console.log('Keys:', Object.keys(json));
    console.log('code:', json.code);
    if (json.bookname) console.log('Book name:', json.bookname);
    if (json.chaptername) console.log('Chapter name:', json.chaptername);
    if (json.data) {
      console.log('\nContent length:', json.data.length);
      console.log('Content preview (first 500 chars):');
      console.log(json.data.substring(0, 500));
    }
  } catch (e) {
    console.log('Parse error:', e);
  }
}

debugWithCookies().catch(console.error);
