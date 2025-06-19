# Nexell Backend

Backend for a productivity platform combining notes, task management, and team collaboration with organization-based sharing.

## Tech Stack

- Node.js
- Express
- TypeScript
- MongoDB with Mongoose
- JWT-based authentication
- Role-based access control

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
│   ├── validators/    # Request validation rules
│   ├── utils/         # Utility functions
│   └── index.ts       # Application entry point
├── docs/              # Project documentation
├── .env               # Environment variables
├── .eslintrc.js       # ESLint configuration
├── .prettierrc        # Prettier configuration
├── package.json       # Project dependencies
└── tsconfig.json      # TypeScript configuration
```

## Core Modules

- **User/Auth**: Registration, login, profile, password reset
- **Notes**: CRUD operations, rich text, folders, tags, pagination, search
- **Tasks**: Kanban-style task management with status, priority, due dates, assignees
- **Organizations**: Multi-member workspaces with role-based permissions
- **Folders**: Organizing notes with organization-aware sharing
- **Time Tracking**: Timer-based and manual time tracking, linked to tasks and organizations

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

## Documentation

The following documentation is available in the docs folder:

- [Task Management](./docs/task-management.md): Details on the kanban task system implementation
- [Organization Integration](./docs/organization-integration.md): How organization context works across modules
- [Notes Pagination & Filtering](./docs/notes-pagination-filtering.md): Notes API pagination and filter options
- [Password Reset Flow](./docs/password-reset-flow.md): Implementation of secure password reset
- [Time Tracking](./docs/time-tracking.md): Time tracking system design and implementation

## API Routes

### Authentication

- `POST /api/auth/register`: Create a new user account
- `POST /api/auth/login`: Authenticate and receive JWT token
- `POST /api/auth/forgot-password`: Request password reset email
- `POST /api/auth/reset-password`: Reset password with token
- `GET /api/auth/me`: Get current user profile

### Notes

- `GET /api/notes`: List notes with filtering and pagination
- `POST /api/notes`: Create a new note
- `GET /api/notes/:id`: Get a note by ID
- `PATCH /api/notes/:id`: Update a note
- `DELETE /api/notes/:id`: Delete a note

### Folders

- `GET /api/folders`: List all folders
- `POST /api/folders`: Create a new folder
- `GET /api/folders/:id`: Get a folder by ID
- `PATCH /api/folders/:id`: Update a folder
- `DELETE /api/folders/:id`: Delete a folder

### Tasks

- `GET /api/tasks`: List tasks with filtering
- `POST /api/tasks`: Create a new task
- `GET /api/tasks/:id`: Get a task by ID
- `PATCH /api/tasks/:id`: Update a task
- `PATCH /api/tasks/:id/order`: Update a task's order position
- `POST /api/tasks/rebalance`: Rebalance task order indices
- `DELETE /api/tasks/:id`: Delete a task

### Organizations

- `GET /api/organizations`: List user's organizations
- `POST /api/organizations`: Create a new organization
- `GET /api/organizations/:id`: Get organization details
- `PATCH /api/organizations/:id`: Update organization details
- `DELETE /api/organizations/:id`: Delete an organization
- `POST /api/organizations/join`: Join an organization with invite code
- `POST /api/organizations/:id/invite`: Generate/regenerate invite code
- `GET /api/organizations/:id/members`: List organization members
- `PATCH /api/organizations/:id/members/:userId`: Update member role
- `DELETE /api/organizations/:id/members/:userId`: Remove member

### Time Tracking

- `POST /api/time-logs/start`: Start a new timer
- `POST /api/time-logs/stop`: Stop the active timer
- `GET /api/time-logs/active`: Get the user's active timer
- `POST /api/time-logs/manual`: Create a manual time entry
- `GET /api/time-logs`: List time logs with filtering and pagination
- `GET /api/time-logs/task/:taskId`: Get time logs for a specific task
- `GET /api/time-logs/statistics`: Get time tracking statistics
- `PATCH /api/time-logs/:id`: Update a time log
- `DELETE /api/time-logs/:id`: Delete a time log

## License

ISC
