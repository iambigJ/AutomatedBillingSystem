import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Config } from '../config/config.helper';
export const mongooseModule = () =>
  MongooseModule.forRootAsync({
    useFactory: (configService: ConfigService) => {
      const config =
        configService.get<Config['MONGO_General']>('MONGO_General');
      const url = config.url;
      const port = config.port;
      const user = config?.user;
      const pass = config?.password;
      const isAuthEnabled = user && pass;

      const uri = isAuthEnabled
        ? `mongodb://${user}:${pass}@${url}`
        : `mongodb://${url}:${port}`;

      return {
        uri: uri,
        heartbeatFrequencyMS: 30000,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 5000,
      };
    },
    inject: [ConfigService],
  });
