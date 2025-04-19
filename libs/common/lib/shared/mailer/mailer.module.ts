import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerConfig } from '../config/config.helper';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: undefined,
      useFactory: (configService: ConfigService) => {
            const mailConfig = configService.get<MailerConfig>('Mailer');
        return {
          transport: {
            host: mailConfig.host,
            port: mailConfig.port,
            secure: false,
            auth: mailConfig.auth
              ? {
                  user: mailConfig.username,
                  pass: mailConfig.password,
                }
              : undefined,
            tls: {
              rejectUnauthorized: false,
            },
          },
          defaults: {
            from: mailConfig.from,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class MailModule {}
