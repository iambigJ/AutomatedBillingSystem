export interface MongoConfig {
  url: string;
  port: number;
  user?: string;
  password?: string;
}

export interface LogConfig {
  logLevel: string;
}

export interface MailerConfig {
  host: string;
  port: number;
  auth: boolean;
  username?: string;
  password?: string;
  from: string;
}

export interface RabbitMQConfig {
  url: string;
  queue: string;
  queueOptions: {
    durable: boolean;
  };
}

export interface RedisConfig {
  uri: string;
  port: number;
  user?: string;
  password?: string;
}

export interface Config {
  port: number;
  logLevel: string;
  JWT_KEY: string;
  MONGO_General: MongoConfig;
  Mailer: MailerConfig;
  RabbitMQ: RabbitMQConfig;
  Redis_General: RedisConfig;
}

// Default configurations for services
export const DEFAULT_CONFIGS = {
  RABBITMQ: {
    url: 'amqp://localhost:5672',
    queue: 'default_queue',
    queueOptions: { durable: true },
  },
  REDIS: {
    uri: 'localhost',
    port: 6379,
  },
  MONGO: {
    url: 'localhost',
    port: 27017,
  },
};
