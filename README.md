# Careera - Microservices Platform

A modern microservices application built with NestJS, MongoDB, RabbitMQ, and Redis. The platform consists of specialized services for handling invoicing and email communications.

## Services

### Invoice Service
A microservice responsible for handling invoice generation, processing, and management.

### Email Service
A microservice responsible for email delivery, notifications, and communications.

## Technology Stack

- **Framework**: NestJS
- **Database**: MongoDB
- **Message Broker**: RabbitMQ
- **Caching**: Redis
- **Containerization**: Docker
- **Monorepo Management**: Nx

## Getting Started

### Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
   ```
   cd careera
   ```

2. Install dependencies:
   ```
   npm install
   ```

### Development

Start both services in development mode:
```
npm run dev:all
```

Or start individual services:
```
npm run dev:invoice  # Start invoice service in dev mode
npm run dev:email    # Start email service in dev mode
```

#### Using Nx Commands with APP_NAME

You can use the APP_NAME environment variable to dynamically specify which service to serve or build:

```bash
# Serve a service in development mode
APP_NAME=invoice-service nx serve $APP_NAME
APP_NAME=email-service nx serve $APP_NAME

# Serve with watch mode enabled
APP_NAME=invoice-service nx serve $APP_NAME --watch
```

### Production

Build all services:
```
npm run build
```

Or build individual services:
```
npm run build:invoice
npm run build:email
```

#### Building with Nx and APP_NAME

You can use the APP_NAME environment variable to dynamically build any service:

```bash
# serve a specific service
APP_NAME=$APP_NAME nx serve $APP_NAME

# Build with production configuration
nx build $APP_NAME--configuration=$environment
```


## Docker Deployment

The project includes Docker configurations for easy deployment.

Build the Docker images:
```
npm run docker:build
```

Start all containers:
```
npm run docker:up
```

Stop all containers:
```
npm run docker:down
```

View logs:
```
npm run docker:logs
```

## Project Structure

```
careera/
├── apps/
│   ├── invoice-service/   # Invoice management service
│   └── email-service/     # Email communication service
├── libs/                  # Shared libraries
├── docker-compose.yml     # Docker composition file
└── package.json           # Project dependencies and scripts
```

## Configuration

Each service has its own configuration file (`config.yaml`) with environment-specific settings. Environment variables can be used to override these configurations.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
