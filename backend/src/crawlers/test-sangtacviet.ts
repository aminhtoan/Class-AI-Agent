import { SangtacvietCrawler } from './sources/sangtacviet.crawler';

async function testCrawler() {
  const crawler = new SangtacvietCrawler();
  const storyUrl = 'https://sangtacviet.app/truyen/qidian/1/1044603424/';

  console.log('=== Testing Sangtacviet Crawler ===\n');
  console.log('Story URL:', storyUrl);

  // Test 1: Fetch metadata
  console.log('\n--- Test 1: Fetch Story Metadata ---');
  const metadataResult = await crawler.fetchStoryMetadata(storyUrl);
  console.log('Result:', JSON.stringify(metadataResult, null, 2));

  // Test 2: Fetch TOC
  console.log('\n--- Test 2: Fetch TOC ---');
  const tocResult = await crawler.fetchToc(storyUrl);
  console.log('Success:', tocResult.success);
  if (tocResult.success && tocResult.data) {
    console.log('Total chapters found:', tocResult.data.length);
    console.log('First 5 chapters:');
    tocResult.data.slice(0, 5).forEach((ch, i) => {
      console.log(`  ${i + 1}. ${ch.title} - ${ch.url}`);
    });
  } else {
    console.log('Error:', tocResult.error);
  }

  // Test 3: Fetch first chapter content
  if (tocResult.success && tocResult.data && tocResult.data.length > 0) {
    console.log('\n--- Test 3: Fetch First Chapter Content ---');
    const firstChapter = tocResult.data[0];
    console.log('Chapter URL:', firstChapter.url);
    const chapterResult = await crawler.fetchChapter(firstChapter.url);
    console.log('Success:', chapterResult.success);
    if (chapterResult.success && chapterResult.data) {
      console.log('Title:', chapterResult.data.title);
      console.log('Word count:', chapterResult.data.wordCount);
      console.log('Content preview (first 500 chars):');
      console.log(chapterResult.data.contentText.substring(0, 500));
    } else {
      console.log('Error:', chapterResult.error);
    }
  }
}

testCrawler().catch(console.error);
