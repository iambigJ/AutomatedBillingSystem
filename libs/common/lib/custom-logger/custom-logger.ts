import { ConsoleLogger } from '@nestjs/common';

export class MyLogger extends ConsoleLogger {
  constructor(context?: string) {
    super(context);
    this.setContext(context || 'Application');
  }

  log(message: string, ...optionalParams: any[]): void {
    if (optionalParams.length > 0) {
      super.log('📢 ' + message, ...optionalParams);
    } else {
      super.log('📢 ' + message);
    }
  }

  warn(message: string, ...optionalParams: any[]): void {
    if (optionalParams.length > 0) {
      super.warn('⚠️ ' + message, ...optionalParams);
    } else {
      super.warn('⚠️ ' + message);
    }
  }

  debug(message: string, ...optionalParams: any[]): void {
    if (optionalParams.length > 0) {
      super.debug('🔍 ' + message, ...optionalParams);
    } else {
      super.debug('🔍 ' + message);
    }
  }

  error(message: string, stack?: string, ...optionalParams: any[]): void {
    if (stack) {
      super.error('❌ ' + message, stack);
    } else if (optionalParams.length > 0) {
      super.error('❌ ' + message, ...optionalParams);
    } else {
      super.error('❌ ' + message);
    }
  }

  verbose(message: string, ...optionalParams: any[]): void {
    if (optionalParams.length > 0) {
      super.verbose('🔬 ' + message, ...optionalParams);
    } else {
      super.verbose('🔬 ' + message);
    }
  }
}
