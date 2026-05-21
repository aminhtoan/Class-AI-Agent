import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { buildSuccessResponse } from "./common/api-response";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello() {
    return buildSuccessResponse({ message: this.appService.getHello() });
  }

  @Get("health")
  getHealth() {
    return buildSuccessResponse({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  }
}
