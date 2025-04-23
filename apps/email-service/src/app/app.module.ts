import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { GlobalConfigModule, MailModule } from '@mytest/common';
import { EmailController } from './controllers/email.controller';

@Module({
  imports: [
    GlobalConfigModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailModule.forRoot(),
  ],
  controllers: [EmailController],
  providers: [EmailService],
})
export class AppModule {}
