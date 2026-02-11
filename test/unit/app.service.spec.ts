import { AppService } from '@/app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  describe('getAppInfo', () => {
    it('should return application info', () => {
      const result = service.getAppInfo();

      expect(result).toEqual({
        name: 'COFAT Digital Recruitment Platform',
        version: '1.0.0',
        description: 'Backend API for psychotechnical testing platform',
      });
    });

    it('should return an object with name property', () => {
      const result = service.getAppInfo();
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });

    it('should return an object with version property', () => {
      const result = service.getAppInfo();
      expect(result.version).toBeDefined();
      expect(result.version).toMatch(/^\d+\.\d+\.\d+$/); // Semver format
    });

    it('should return an object with description property', () => {
      const result = service.getAppInfo();
      expect(result.description).toBeDefined();
      expect(typeof result.description).toBe('string');
    });
  });
});
