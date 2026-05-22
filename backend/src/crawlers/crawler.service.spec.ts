import { Test, TestingModule } from '@nestjs/testing';
import { CrawlerService } from './crawler.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CrawlerService', () => {
  let service: CrawlerService;

  const mockPrismaService = {
    crawlJob: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    story: {
      update: jest.fn(),
    },
    tocItem: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    chapter: {
      upsert: jest.fn(),
    },
    chapterContent: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CrawlerService>(CrawlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCrawlerForHost', () => {
    it('should return sangtacviet crawler for sangtacviet.app', () => {
      const crawler = service.getCrawlerForHost('sangtacviet.app');
      expect(crawler).toBeDefined();
      expect(crawler?.name).toBe('sangtacviet');
    });

    it('should return sangtacviet crawler for www.sangtacviet.app', () => {
      const crawler = service.getCrawlerForHost('www.sangtacviet.app');
      expect(crawler).toBeDefined();
      expect(crawler?.name).toBe('sangtacviet');
    });

    it('should return null for unsupported host', () => {
      const crawler = service.getCrawlerForHost('unknown.com');
      expect(crawler).toBeNull();
    });
  });

  describe('getSupportedHosts', () => {
    it('should return array of supported hosts', () => {
      const hosts = service.getSupportedHosts();
      expect(hosts).toContain('sangtacviet.app');
      expect(hosts).toContain('www.sangtacviet.app');
    });
  });
});
