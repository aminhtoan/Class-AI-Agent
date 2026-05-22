import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const jobs = await prisma.crawlJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { story: true },
  });

  for (const job of jobs) {
    console.log('Job:', job.id);
    console.log('  Status:', job.status);
    console.log('  Progress:', job.progressDone + '/' + job.progressTotal);
    console.log('  Error:', job.errorCode, job.errorMessage);
    console.log('  Story sourceUrl:', job.story.sourceUrl);
    console.log('  Story sourceHost:', job.story.sourceHost);
    console.log('---');
  }

  await prisma.$disconnect();
}

check().catch(console.error);
