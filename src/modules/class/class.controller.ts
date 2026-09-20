import { Controller, Get } from '@nestjs/common';
import { ClassService } from './class.service.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Controller('classes')
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  /**
   * GET /classes
   * Fetch all academic classes.
   */
  @Public()
  @Get()
  @ResponseMessage('Classes retrieved successfully')
  findAll() {
    return this.classService.findAll();
  }
}
