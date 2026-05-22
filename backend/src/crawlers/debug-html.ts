async function debugHtml() {
  const storyUrl = 'https://sangtacviet.app/truyen/qidian/1/1044603424/';

  const response = await fetch(storyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });

  const html = await response.text();

  console.log('=== HTML Length:', html.length, '===\n');

  // Look for chapter-related patterns
  const patterns = [
    /chapter/gi,
    /chuong/gi,
    /chương/gi,
    /<a[^>]*href="[^"]*\d+[^"]*"[^>]*>/gi,
    /list-chapter/gi,
    /chapter-list/gi,
    /muc-luc/gi,
    /danh-sach/gi,
  ];

  console.log('=== Pattern matches ===');
  patterns.forEach(pattern => {
    const matches = html.match(pattern);
    console.log(`${pattern}: ${matches ? matches.length : 0} matches`);
  });

  // Save HTML to file for inspection
  const fs = await import('fs');
  fs.writeFileSync('debug-sangtacviet.html', html);
  console.log('\n=== HTML saved to debug-sangtacviet.html ===');

  // Print a section of the HTML to find chapter links
  console.log('\n=== Looking for href patterns with numbers ===');
  const hrefMatches = html.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi);
  if (hrefMatches) {
    const chapterLike = hrefMatches.filter(m =>
      m.includes('/truyen/') ||
      m.includes('chuong') ||
      m.includes('chapter') ||
      /\/\d+\/?/.test(m)
    );
    console.log('Found', chapterLike.length, 'chapter-like links:');
    chapterLike.slice(0, 20).forEach(m => console.log('  ', m.substring(0, 150)));
  }
}

debugHtml().catch(console.error);
