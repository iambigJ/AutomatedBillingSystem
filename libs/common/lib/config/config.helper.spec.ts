import { DEFAULT_CONFIGS } from './config.helper';

describe('Config Helper', () => {
  describe('DEFAULT_CONFIGS', () => {
    it('should have default MongoDB config', () => {
      expect(DEFAULT_CONFIGS.MONGO).toBeDefined();
      expect(DEFAULT_CONFIGS.MONGO.url).toContain('localhost');
    });

    it('should have default Redis config', () => {
      expect(DEFAULT_CONFIGS.REDIS).toBeDefined();
      expect(DEFAULT_CONFIGS.REDIS.uri).toBeDefined();
    });

    it('should have default RabbitMQ config', () => {
      expect(DEFAULT_CONFIGS.RABBITMQ).toBeDefined();
      expect(DEFAULT_CONFIGS.RABBITMQ.url).toContain('amqp://');
    });
  });
});
