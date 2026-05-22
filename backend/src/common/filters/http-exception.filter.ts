import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    // Check if headers already sent (e.g., SSE streams)
    if (response.headersSent) {
      this.logger.error('Headers already sent, cannot send error response:', exception);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === "string") {
        return response.status(status).json({
          success: false,
          error: {
            code: "HTTP_ERROR",
            message: payload,
          },
        });
      }

      const body = payload as Record<string, unknown>;
      const code = typeof body.code === "string" ? body.code : "HTTP_ERROR";
      const message =
        typeof body.message === "string"
          ? body.message
          : exception.message || "Request failed";

      return response.status(status).json({
        success: false,
        error: {
          code,
          message,
          details: body.details,
        },
      });
    }

    this.logger.error(exception);

    return response.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    });
  }
}
