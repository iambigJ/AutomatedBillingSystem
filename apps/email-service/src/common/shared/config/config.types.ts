export interface MongoConfig {
  url: string;
  port: number;
  user?: string;
  password?: string;
}

export interface RedisConfig {
  uri: string;
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

export interface GeneralConfig extends MongoConfig, LogConfig, MailerConfig {
  MONGO_General: MongoConfig;
  Redis_General: RedisConfig;
  Mailer: MailerConfig;
}

export interface Config {
  port: number;
  logLevel: string;
  JWT_KEY: string;
  MONGO_General: MongoConfig;
  Redis_General: RedisConfig;
  Mailer: MailerConfig;
  Telegram_Token?: string;
}
