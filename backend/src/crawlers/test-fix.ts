import { SangtacvietCrawler } from './sources/sangtacviet.crawler';

async function testFix() {
  const crawler = new SangtacvietCrawler();
  const storyUrl = 'https://sangtacviet.app/truyen/qidian/1/1044603424/';

  console.log('=== Testing Sangtacviet Crawler Fix ===\n');

  // Test 1: Fetch story metadata
  console.log('1. Testing fetchStoryMetadata...');
  const metadata = await crawler.fetchStoryMetadata(storyUrl);
  if (metadata.success && metadata.data) {
    console.log('   ✓ Metadata fetched successfully');
    console.log('   Title:', metadata.data.title);
    console.log('   Author:', metadata.data.author);
  } else if (!metadata.success && metadata.error) {
    console.log('   ✗ Failed:', metadata.error.message);
  }

  // Test 2: Fetch table of contents
  console.log('\n2. Testing fetchToc...');
  const toc = await crawler.fetchToc(storyUrl);
  if (toc.success && toc.data) {
    console.log('   ✓ TOC fetched successfully');
    console.log('   Total chapters:', toc.data.length);
    console.log('   First chapter:', toc.data[0]?.title);
    console.log('   First chapter URL:', toc.data[0]?.url);

    // Test 3: Fetch a chapter
    console.log('\n3. Testing fetchChapter...');
    const chapterUrl = toc.data[0]?.url;
    if (chapterUrl) {
      console.log('   Fetching:', chapterUrl);

      const chapter = await crawler.fetchChapter(chapterUrl);
      if (chapter.success && chapter.data) {
        console.log('   ✓ Chapter fetched successfully');
        console.log('   Title:', chapter.data.title);
        console.log('   Word count:', chapter.data.wordCount);
        console.log('   Content preview:', chapter.data.contentText.substring(0, 200) + '...');
      } else if (!chapter.success && chapter.error) {
        console.log('   ✗ Failed:', chapter.error.code);
        console.log('   Message:', chapter.error.message);
      }
    }
  } else if (!toc.success && toc.error) {
    console.log('   ✗ Failed:', toc.error.message);
  }

  console.log('\n=== Test Complete ===');
}

testFix().catch(console.error);
