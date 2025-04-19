import { ConsoleLogger } from '@nestjs/common';

export class MyLogger extends ConsoleLogger {
  constructor(context?: string) {
    super();
    this.setLogLevels(['log', 'error', 'warn', 'debug', 'verbose']);
    this.setContext(context);
  }
  log(message: string, ...optionalParams: [...any]) {
    if (optionalParams.length > 0) {
      super.log('📢 ' + message, optionalParams);
    } else {
      super.log('📢 ' + message);
    }
  }

  warn(message: string, ...optionalParams: [...any]) {
    if (optionalParams.length > 0) {
      super.warn('📢 ' + message, optionalParams);
    } else {
      super.warn('📢 ' + message);
    }
  }
  debug(message: string, ...optionalParams: [...any]) {
    if (optionalParams.length > 0) {
      super.debug('📢 ' + message, optionalParams);
    } else {
      super.debug('📢 ' + message);
    }
  }

  error(message: string, ...optionalParams: any[]) {
    if (optionalParams.length > 0) {
      super.error('📢 ' + message, optionalParams);
    } else {
      super.error('📢 ' + message);
    }
  }
}
