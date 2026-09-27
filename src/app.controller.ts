import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ResponseMessage } from './common/decorators/response-message.decorator.js';
import { Public } from './common/decorators/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ResponseMessage('App welcome message fetched successfully')
  getHello(): string {
    return this.appService.getHello();
  }
}
