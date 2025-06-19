# Nexell Backend

Backend for a productivity platform combining time tracking, notes, and team collaboration.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT-based authentication
- Role-based access control (Admin/Member)

## Project Structure

```
nexell-backend/
├── src/
│   ├── config/        # Configuration files
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Custom middleware
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── utils/         # Utility functions
│   └── index.ts       # Application entry point
├── .env               # Environment variables
├── .eslintrc.js       # ESLint configuration
├── .prettierrc        # Prettier configuration
├── package.json       # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## Core Modules

- User/Auth: Registration, login, profile, password reset
- Notes: User-scoped CRUD, folders, tags, pagination
- Tasks: Kanban-style CRUD with status, priority, due dates
- TimeLogs: Start/stop/manual entries for time tracking
- Orgs/Teams: Organization and team management
- Reporting: Time aggregation and exports
- Activity Feed: Log of key actions

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the provided template
4. Start the development server:
   ```
   npm run dev
   ```

### Available Scripts

- `npm run dev`: Start development server with hot-reloading
- `npm run build`: Build for production
- `npm start`: Run production build
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier
- `npm test`: Run tests (when implemented)

## API Documentation

Once implemented, API documentation will be available at `/api-docs` endpoint using Swagger/OpenAPI.

## License

ISC
