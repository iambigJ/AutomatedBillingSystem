import { Module, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisConfig } from '../../shared/config/config.types';
import { CacheService } from './redis-service';
import Redis, { RedisOptions } from 'ioredis';
import { Logger } from '@nestjs/common';

const RedisClientProvider: Provider = {
  provide: 'RedisCacheService',
  useFactory: (configService: ConfigService) => {
    const logger = new Logger('RedisClient');
    const redisConfig = configService.get<RedisConfig>('Redis_General');
    console.log(redisConfig);
    const redisOptions: RedisOptions = {
      host: redisConfig?.uri,
      port: redisConfig?.port,
      password: redisConfig?.password,
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 3000); // Max 3 seconds
        logger.log(
          `Redis connection lost. Attempting reconnection in ${delay}ms...`,
        );
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    const redisClient = new Redis(redisOptions);

    redisClient.on('connect', () => {
      logger.log('Redis connection established');
    });

    redisClient.on('ready', () => {
      logger.log('Redis client is ready');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis client error: ${err.message}`, err.stack);
    });

    redisClient.on('reconnecting', (delay) => {
      logger.log(`Redis client reconnecting in ${delay}ms`);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    const store = new CacheService(redisClient);
    return store;
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisClientProvider],
  exports: [RedisClientProvider],
})
export class RedisCacheModule {}
