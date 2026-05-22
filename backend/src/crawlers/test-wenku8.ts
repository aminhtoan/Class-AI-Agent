import { SangtacvietCrawler } from './sources/sangtacviet.crawler';

async function test() {
  const crawler = new SangtacvietCrawler();
  const url = 'https://sangtacviet.app/truyen/wenku8/1/4221/';

  console.log('Testing URL:', url);

  console.log('\n1. Fetching metadata...');
  const metadata = await crawler.fetchStoryMetadata(url);
  console.log('Metadata:', JSON.stringify(metadata, null, 2));

  console.log('\n2. Fetching TOC...');
  const toc = await crawler.fetchToc(url);
  console.log('TOC result:', JSON.stringify(toc, null, 2));
}

test().catch(console.error);
