import {
  Logger,
  UnprocessableEntityException,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getEnv } from "./config/env";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger("Bootstrap");

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) =>
        new UnprocessableEntityException({
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: errors.map((error) => ({
            field: error.property,
            constraints: error.constraints,
            value: error.value,
          })),
        }),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Story to PDF API")
    .setDescription("API for converting stories to PDF")
    .setVersion("0.1.0")
    .addServer("/api/v1")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  // Enable CORS
  app.enableCors();

  // Start server
  const { PORT: port } = getEnv();
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `API documentation available at: http://localhost:${port}/api-docs`,
  );
}

bootstrap();
