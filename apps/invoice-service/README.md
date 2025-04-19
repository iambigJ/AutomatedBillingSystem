# Invoice Management System

A NestJS-based invoice management system with automated daily sales reports sent via RabbitMQ.

## Features

- Create and manage invoices
- Filter invoices by date range
- Automatically generate daily sales reports at 12:00 PM
- Send reports to email through RabbitMQ

## System Architecture

The system consists of two microservices:

1. **Invoice Service**: Manages invoice CRUD operations and generates daily sales reports
2. **Email Service**: Consumes reports from RabbitMQ and sends emails

## Prerequisites

- Node.js (v16+)
- MongoDB (local or cloud)
- RabbitMQ (local or cloud)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure environment variables in `.env` file:
   ```
   MONGODB_URI=mongodb://localhost/invoice-system
   RABBITMQ_URL=amqp://localhost:5672
   ```
4. Start the services:
   ```
   # Start both services
   npm run start:all
   
   # Start in development mode with hot-reload
   npm run dev:all
   
   # Start services individually
   npm run start:invoice
   npm run start:email
   ```

## API Endpoints

### Invoice Service

- **POST /invoices** - Create a new invoice
  ```json
  {
    "customer": "Company A",
    "amount": 1250.50,
    "reference": "INV-2023-001",
    "items": [
      { "sku": "PROD-001", "qt": 5 },
      { "sku": "PROD-002", "qt": 3 }
    ]
  }
  ```

- **GET /invoices/:id** - Get invoice by ID

- **GET /invoices** - Get all invoices
  - Query parameters:
    - `startDate`: Filter by start date (ISO format)
    - `endDate`: Filter by end date (ISO format)

- **GET /invoices/report/generate** - Manually trigger daily sales report

## Daily Sales Report

Sales reports are automatically generated at 12:00 PM daily and include:
- Total sales amount
- Number of invoices
- Per-item sales summary (SKU, quantity sold)

## Running Tests

```
npm test
``` 