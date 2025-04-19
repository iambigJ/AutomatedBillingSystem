import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_KEY');
        if (!secret) {
          throw new Error('JWT_KEY is not defined in environment variables');
        }
        return {
          secret,
          signOptions: { expiresIn: '24h' },
          global: true,
        };
      },
    }),
  ],
  exports: [JwtModule],
})
export class JWTModule {}
