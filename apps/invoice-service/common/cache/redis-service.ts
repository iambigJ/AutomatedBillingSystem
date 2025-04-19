import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export class CacheService {
  private context: string;
  private readonly logger: Logger;

  constructor(private cacheManager: Redis) {
    this.logger = new Logger(CacheService.name);
  }

  setContext(context: string) {
    this.context = context;
  }

  /**
   * Retrieves a value from cache
   * @param item The cache key
   * @returns The parsed value or null if not found/invalid
   */
  async get<T = any>(item: string): Promise<T | null> {
    const key = `${this.context}.${item}`;
    return await this.cacheManager.get(key).then((res) => {
      if (!res) return null;
      try {
        return JSON.parse(res) as T;
      } catch (e) {
        this.logger.error('Error parsing JSON from cache', e);
        return null;
      }
    });
  }

  /**
   * Sets a value in cache
   * @param item The cache key
   * @param value The value to store
   * @param ttl Time to live in seconds (optional)
   * @returns Promise<'OK'> if successful
   */
  async set<T>(item: string, value: T, ttl?: number): Promise<'OK' | null> {
    console.log(this.cacheManager)
    try {
      const key = `${this.context}.${item}`;
      const stringValue =
        typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl) {
        return await this.cacheManager.set(key, stringValue, 'EX', ttl);
      }
      return await this.cacheManager.set(key, stringValue);
    } catch (e) {
      this.logger.error('Error setting cache', e);
      throw e;
    }
  }

  /**
   * Deletes a value from cache
   * @param item The cache key
   * @returns Promise<number> Number of keys removed
   */
  async delete(item: string): Promise<number> {
    const key = `${this.context}.${item}`;
    return await this.cacheManager.del(key);
  }
}
