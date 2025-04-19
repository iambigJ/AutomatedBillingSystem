import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Creates a dynamic global config module that finds and loads the appropriate config.yaml
 * file for each application.
 */
@Global()
@Module({})
export class GlobalConfigModule {
  /**
   * Create the config module with a specific config path
   * @param configPath - Optional explicit path to config.yaml file
   */
  static forRoot(configPath?: string): DynamicModule {
    // Try to intelligently find the config file if not provided
    const filePath = configPath || findConfigFile();

    // Read and parse the YAML config
    const configYaml = readConfigFile(filePath);

    return {
      module: GlobalConfigModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => configYaml],
        }),
      ],
      exports: [ConfigModule],
    };
  }
}

/**
 * Find the config.yaml file by looking in various directories
 */
function findConfigFile(): string {
  if (!process.env['APP_NAME'])
    throw new Error('APP_NAME environment variable is not set');

  const location = path.join(
    process.cwd(),
    'apps',
    process.env['APP_NAME'],
    'config.yaml',
  );

  if (fs.existsSync(location)) {
    console.log(`Using config file: ${location}`);
    return location;
  }

  throw new Error(
    'Cannot find config.yaml file. Please specify a path or ensure it exists in the standard locations.',
  );
}

/**
 * Read and parse the YAML config file
 */
function readConfigFile(filePath: string): Record<string, any> {
  try {
    return yaml.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
  } catch (error) {
    console.error(`Error reading config file at ${filePath}:`, error);
    throw new Error(`Failed to read or parse config file at ${filePath}`);
  }
}
