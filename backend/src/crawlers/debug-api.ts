async function debugApi() {
  // From the HTML: /index.php?ngmar=chapterlist&h=qidian&bookid=1044603424&sajax=getchapterlist
  const apiUrl = 'https://sangtacviet.app/index.php?ngmar=chapterlist&h=qidian&bookid=1044603424&sajax=getchapterlist';

  console.log('Fetching chapter list from API...');
  console.log('URL:', apiUrl);

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://sangtacviet.app/truyen/qidian/1/1044603424/',
    },
  });

  const text = await response.text();
  console.log('\nResponse length:', text.length);
  console.log('\nFirst 2000 chars:');
  console.log(text.substring(0, 2000));

  try {
    const json = JSON.parse(text);
    console.log('\n\n=== Parsed JSON ===');
    console.log('Keys:', Object.keys(json));
    if (json.data) {
      const chapters = json.data.split('-//-');
      console.log('Total chapters:', chapters.length);
      console.log('\nFirst 5 chapters:');
      chapters.slice(0, 5).forEach((ch: string, i: number) => {
        const parts = ch.split('-/-');
        console.log(`  ${i + 1}. Parts:`, parts);
      });
    }
  } catch (e) {
    console.log('Not JSON:', e);
  }
}

debugApi().catch(console.error);
