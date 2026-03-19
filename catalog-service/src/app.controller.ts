import { Controller } from '@nestjs/common';
import { AppService } from './app.service';
import { Logger } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @MessagePattern('health')
  healthCheck(): { status: string; timestamp: string } {
    this.logger.log('Health check requested');
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

}
