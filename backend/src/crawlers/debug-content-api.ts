async function debugContentApi() {
  // POST /index.php?bookid=1044603424&h=qidian&c=842086537&ngmar=readc&sajax=readchapter
  const apiUrl = 'https://sangtacviet.app/index.php?bookid=1044603424&h=qidian&c=842086537&ngmar=readc&sajax=readchapter&sty=1&exts=800';

  console.log('Fetching chapter content from API...');
  console.log('URL:', apiUrl);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': 'https://sangtacviet.app/truyen/qidian/1/1044603424/842086537/',
    },
    body: '',
  });

  const text = await response.text();
  console.log('\nResponse length:', text.length);
  console.log('\nFirst 2000 chars:');
  console.log(text.substring(0, 2000));

  try {
    const json = JSON.parse(text);
    console.log('\n\n=== Parsed JSON ===');
    console.log('Keys:', Object.keys(json));
    if (json.bookname) console.log('Book name:', json.bookname);
    if (json.chaptername) console.log('Chapter name:', json.chaptername);
    if (json.data) {
      console.log('\nContent preview (first 1000 chars):');
      console.log(json.data.substring(0, 1000));
    }
  } catch (e) {
    console.log('Parse error:', e);
  }
}

debugContentApi().catch(console.error);
