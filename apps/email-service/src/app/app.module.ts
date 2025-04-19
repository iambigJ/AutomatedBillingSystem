import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './services/email.service';
import { GlobalConfigModule } from '@carearra/common';

@Module({
  imports: [
    GlobalConfigModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [EmailService],
})
export class AppModule {}
