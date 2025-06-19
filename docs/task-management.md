# Task Management System

This document outlines the design and implementation of the task management system in the Nexell backend.

## Data Model

### Task Schema

The Task entity has the following fields:

- **title**: String (required) - The title of the task
- **description**: String - Detailed description of the task
- **status**: Enum - Current status of the task (todo, in-progress, review, done, archived)
- **priority**: Enum - Priority level (low, medium, high, urgent)
- **dueDate**: Date - When the task is due
- **assignedTo**: Array of User IDs - Users assigned to the task
- **createdBy**: User ID (required) - User who created the task
- **orderIndex**: Number - Position in the kanban board for drag-and-drop ordering
- **tags**: Array of Strings - Labels to categorize tasks
- **organization**: Organization ID - Future field for organization context
- **timestamps**: createdAt, updatedAt - Automatically managed by Mongoose

## Kanban Board Implementation

### Order Index Strategy

The task system uses an `orderIndex` field to maintain the order of tasks within each status column:

1. **Initialization**:

   - When a task is created, it receives an `orderIndex` value that's 1000 higher than the highest existing index in its status
   - This creates even spacing between tasks to facilitate later reordering

2. **Reordering Within Same Status**:

   - When a task is moved within the same status column, we adjust the orderIndex values of tasks between the old and new positions
   - For moving up (lower orderIndex), we increment affected tasks
   - For moving down (higher orderIndex), we decrement affected tasks

3. **Moving Between Statuses**:

   - When a task changes status, we make space at the destination position
   - We also close the gap at the source position
   - All operations are wrapped in a MongoDB transaction to ensure consistency

4. **Rebalancing Strategy**:
   - Over time, with many reordering operations, the gap between consecutive tasks may become too small
   - A dedicated rebalance endpoint redistributes all orderIndex values with even spacing (1000 units apart)
   - This can be called periodically or when the frontend detects potential issues

### Frontend-Backend Coordination

1. **Drag and Drop Operations**:

   - Frontend captures drag start position (status + index)
   - Frontend calculates drop position (status + index)
   - Frontend calls API with task ID, new status, and new orderIndex

2. **Optimistic Updates**:

   - Frontend can update the UI immediately for a smoother experience
   - If the backend operation fails, frontend reverts to the previous state

3. **Conflict Resolution**:
   - If multiple users reorder simultaneously, the backend's transaction system ensures consistency
   - Frontend should periodically refresh to get the latest order from the server

## Filtering and Searching

The task system supports comprehensive filtering:

1. **Status Filtering**:

   - Filter by one or multiple statuses
   - Example: `/api/tasks?status=todo,in-progress`

2. **Assignment Filtering**:

   - Filter by tasks assigned to a specific user
   - Example: `/api/tasks?assignedTo=user_id`

3. **Due Date Filtering**:

   - Filter by due date range
   - Example: `/api/tasks?dueDateStart=2023-06-01&dueDateEnd=2023-06-30`

4. **Priority Filtering**:

   - Filter by one or multiple priorities
   - Example: `/api/tasks?priority=high,urgent`

5. **Tag Filtering**:

   - Filter by specific tag
   - Example: `/api/tasks?tag=bugfix`

6. **Search**:

   - Search within title and description fields
   - Case-insensitive regex-based search
   - Example: `/api/tasks?search=reporting`

7. **Combined Filters**:
   - All filter parameters can be combined
   - Example: `/api/tasks?status=todo&priority=high&dueDateEnd=2023-07-01`

## Data Validation and Security

1. **Input Validation**:

   - Express-validator used for all inputs
   - Custom validators for complex validations like assignedTo users existence

2. **User Assignment Validation**:

   - When tasks are assigned to users, we verify those users exist
   - Both frontend and backend validation enforced

3. **Permission System**:

   - Users can only see tasks they created or are assigned to
   - Organization context will be added in future phases

4. **Data Sanitization**:
   - Input is properly escaped to prevent XSS attacks
   - Tags are trimmed and converted to lowercase for consistency

## Organization Context (Future Implementation)

1. **Organization Model**:

   - Tasks will belong to an organization
   - Users will have relationships with organizations (members, roles, permissions)

2. **Access Control**:

   - Users will only see tasks from organizations they belong to
   - Various permission levels will control who can create, update, or delete tasks

3. **Middleware Implementation**:
   - The `orgContextMiddleware.ts` provides a foundation for this functionality
   - Currently, it's a placeholder that will be expanded when the Organization model is implemented
