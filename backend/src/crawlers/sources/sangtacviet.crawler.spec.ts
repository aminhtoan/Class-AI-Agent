import { SangtacvietCrawler } from './sangtacviet.crawler';

describe('SangtacvietCrawler', () => {
  let crawler: SangtacvietCrawler;

  beforeEach(() => {
    crawler = new SangtacvietCrawler();
  });

  describe('supports', () => {
    it('should support sangtacviet.app', () => {
      expect(crawler.supports('sangtacviet.app')).toBe(true);
    });

    it('should support www.sangtacviet.app', () => {
      expect(crawler.supports('www.sangtacviet.app')).toBe(true);
    });

    it('should not support other domains', () => {
      expect(crawler.supports('google.com')).toBe(false);
      expect(crawler.supports('truyenfull.vn')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(crawler.supports('SANGTACVIET.APP')).toBe(true);
      expect(crawler.supports('SangTacViet.App')).toBe(true);
    });
  });

  describe('name', () => {
    it('should have correct name', () => {
      expect(crawler.name).toBe('sangtacviet');
    });
  });

  describe('supportedHosts', () => {
    it('should include sangtacviet.app', () => {
      expect(crawler.supportedHosts).toContain('sangtacviet.app');
    });
  });
});
