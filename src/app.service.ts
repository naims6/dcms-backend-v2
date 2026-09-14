import { Injectable } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@Injectable()
export class AppService {
  @SkipThrottle()
  getHello(): string {
    return 'Hello World!';
  }
}
