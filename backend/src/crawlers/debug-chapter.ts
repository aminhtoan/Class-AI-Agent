async function debugChapter() {
  // Chapter URL format: https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/
  const chapterUrl = 'https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/';

  console.log('Fetching chapter page...');
  console.log('URL:', chapterUrl);

  const response = await fetch(chapterUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });

  const html = await response.text();
  console.log('\nHTML length:', html.length);

  // Look for content patterns
  const patterns = [
    /id="contentbox"/i,
    /id="chapter-content"/i,
    /class="chapter-content"/i,
    /id="content"/i,
    /noidung/i,
    /truyen-content/i,
  ];

  console.log('\n=== Content patterns ===');
  patterns.forEach(pattern => {
    const match = html.match(pattern);
    console.log(`${pattern}: ${match ? 'FOUND' : 'not found'}`);
  });

  // Save for inspection
  const fs = await import('fs');
  fs.writeFileSync('debug-chapter.html', html);
  console.log('\nHTML saved to debug-chapter.html');

  // Try to find the content div
  const contentMatch = html.match(/<div[^>]*id="contentbox"[^>]*>([\s\S]*?)<\/div>/i);
  if (contentMatch) {
    console.log('\n=== Content preview (first 500 chars) ===');
    console.log(contentMatch[1].substring(0, 500));
  }

  // Look for AJAX content loading
  const ajaxPatterns = html.match(/sajax=getchaptercontent|loadchapter|getcontent/gi);
  if (ajaxPatterns) {
    console.log('\n=== Found AJAX patterns ===');
    console.log(ajaxPatterns);
  }
}

debugChapter().catch(console.error);
