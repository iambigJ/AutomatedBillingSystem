import { DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQConfig, DEFAULT_CONFIGS } from '../config/config.helper';

export function createRabbitMQClientModule(options: {
  name: string;
  defaultQueue: string;
}): DynamicModule {
  return ClientsModule.registerAsync([
    {
      name: options.name,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const rabbitConfig = configService.get<RabbitMQConfig>('rabbitmq');

        return {
          transport: Transport.RMQ,
          options: {
            urls: [rabbitConfig?.url || DEFAULT_CONFIGS.RABBITMQ.url],
            queue: rabbitConfig?.queue || options.defaultQueue,
            queueOptions:
              rabbitConfig?.queueOptions ||
              DEFAULT_CONFIGS.RABBITMQ.queueOptions,
          },
        };
      },
      inject: [ConfigService],
    },
  ]);
}
