import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo(): { name: string; version: string; description: string } {
    return {
      name: 'COFAT Digital Recruitment Platform',
      version: '1.0.0',
      description: 'Backend API for psychotechnical testing platform',
    };
  }
}
