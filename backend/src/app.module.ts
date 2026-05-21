import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { validateEnv } from "./config/env";
import { StoriesModule } from "./stories/stories.module";
import { ChaptersModule } from "./chapters/chapters.module";
import { CrawlJobsModule } from "./crawl-jobs/crawl-jobs.module";
import { PdfJobsModule } from "./pdf-jobs/pdf-jobs.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    StoriesModule,
    ChaptersModule,
    CrawlJobsModule,
    PdfJobsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
