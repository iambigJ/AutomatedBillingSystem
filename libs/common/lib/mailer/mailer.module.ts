import { ConfigService } from '@nestjs/config';
import { Module, DynamicModule } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { MailerConfig } from '../config/config.helper';

@Module({})
export class MailModule {
  static forRoot(): DynamicModule {
    return {
      module: MailModule,
      imports: [
        NestMailerModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const mailConfig = configService.get<MailerConfig>('Mailer');
            return {
              transport: {
                host: mailConfig?.host || 'localhost',
                port: mailConfig?.port || 587,
                secure: false,
                auth: mailConfig?.auth
                  ? {
                      user: mailConfig.username || '',
                      pass: mailConfig.password || '',
                    }
                  : undefined,
                tls: {
                  rejectUnauthorized: false,
                },
              },
              defaults: {
                from: mailConfig?.from || 'noreply@example.com',
              },
            };
          },
        }),
      ],
      exports: [NestMailerModule],
    };
  }
}
