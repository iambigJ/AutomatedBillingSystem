# Common Library

A shared library containing common utilities for Careara services.

## Usage

### Installation

This library is part of an NX workspace, so it's already available within the monorepo.

### Using in NestJS Applications

1. Import the library in your application module:

```typescript
// In your app.module.ts
import { CommonLogger, GlobalExceptionFilter } from '@carearra/common';
```

2. Use the components in your application:

```typescript
// In your main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { CommonLogger, GlobalExceptionFilter } from '@carearra/common';

async function bootstrap() {
  // Create custom logger
  const logger = new CommonLogger('Bootstrap');

  // Create application with custom logger
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  // Apply global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Start server
  const port = 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
```

### Using in Docker Environment

When running in Docker, you need to build the library first and make sure it's included in your Docker image.

1. Build the common library:

```bash
nx build common
```

2. Update your Dockerfile to include the library:

```dockerfile
# Copy the common library
COPY libs/common ./libs/common
COPY dist/libs/common ./dist/libs/common
```

3. Make sure your services have the library as a dependency in their package.json:

```json
"dependencies": {
  "@carearra/common": "0.0.1"
}
```
