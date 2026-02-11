import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  describe('getAppInfo', () => {
    it('should return application info from service', () => {
      const expectedResult = {
        name: 'COFAT Digital Recruitment Platform',
        version: '1.0.0',
        description: 'Backend API for psychotechnical testing platform',
      };

      jest.spyOn(service, 'getAppInfo').mockReturnValue(expectedResult);

      const result = controller.getAppInfo();

      expect(result).toEqual(expectedResult);
      expect(service.getAppInfo).toHaveBeenCalled();
    });

    it('should call service.getAppInfo', () => {
      const spy = jest.spyOn(service, 'getAppInfo');

      controller.getAppInfo();

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
