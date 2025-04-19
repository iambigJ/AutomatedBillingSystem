import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

const configFilePath = path.join(__dirname, '../../../config.yaml');
const configYaml = yaml.parse(fs.readFileSync(configFilePath, 'utf8'));

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => configYaml],
    }),
  ],
})
export class GlobalConfigModule {}
