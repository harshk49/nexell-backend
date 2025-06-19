# Time Tracking System

This document outlines the design and implementation of the time tracking system in the Nexell backend.

## Data Model

### TimeLog Schema

The TimeLog entity has the following fields:

- **task**: Optional reference to Task - The task being worked on
- **user**: Reference to User (required) - The user tracking time
- **organization**: Optional reference to Organization - For organizational context
- **startTime**: Date (required) - When the timer was started
- **endTime**: Date - When the timer was stopped (null for active timers)
- **duration**: Number - Duration in seconds (calculated when timer stops)
- **note**: String - Additional notes about the time entry
- **tags**: Array of Strings - Labels to categorize time entries
- **isActive**: Boolean - Whether this is an active timer
- **timestamps**: createdAt, updatedAt - Automatically managed by Mongoose

## Core Functionality

### Timer Operation

The time tracking system supports two main modes of time entry:

1. **Timer-Based Tracking**: 
   - User starts a timer when beginning work
   - Timer runs until explicitly stopped
   - Duration is automatically calculated

2. **Manual Time Entry**:
   - User manually enters start and end times
   - For retroactive time tracking
   - System validates time ranges and calculates duration

### Timer Management Flow

1. **Starting a Timer**:
   - Check if user already has an active timer
   - If active timer exists, auto-stop it before starting new timer
   - Create new time log with start time
   - Mark as active

2. **Stopping a Timer**:
   - Find user's active timer
   - Set end time (current time or provided time)
   - Calculate duration in seconds
   - Mark as inactive
   - Apply any provided updates (notes, tags)

3. **Manual Time Entry**:
   - Validate start and end times (realistic range, start < end)
   - Calculate duration from provided times
   - Create time log marked as inactive

4. **Stale Timer Handling**:
   - Background job identifies active timers older than configurable threshold
   - Auto-stops stale timers with note indicating auto-stop
   - Provides cleanup method for admins to manually run

## Organization Integration

Time logs can be associated with an organization context:

1. **Organization Linking**:
   - Time logs can be linked to an organization
   - When tracking time on an org task, the org context is automatically set

2. **Permission Model**:
   - Users can view/edit their own time logs
   - Organization admins can view aggregated time reports for their org
   - Organization members can see their own time logs within the org

3. **Context Switching**:
   - Frontend can switch between personal and organizational context
   - API accepts org context in standard ways (header, query param)

## Filtering and Reporting

The system provides comprehensive filtering capabilities:

1. **Date Range Filtering**:
   - Filter by start date range
   - Example: `/api/time-logs?startDate=2023-06-01&endDate=2023-06-30`

2. **Task Filtering**:
   - Filter by specific task
   - Example: `/api/time-logs/task/{taskId}`

3. **Tag Filtering**:
   - Filter by specific tag
   - Example: `/api/time-logs?tag=meeting`

4. **Active Status Filtering**:
   - Filter by active/inactive status
   - Example: `/api/time-logs?active=true`

5. **Organization Filtering**:
   - Filter by organization context
   - Handled through standard org context middleware

## Statistics and Reporting

The system provides time statistics endpoints:

1. **Total Duration**:
   - Total tracked time within a date range

2. **Task Breakdown**:
   - Time spent per task
   - Helps identify resource allocation

3. **Daily Totals**:
   - Daily time tracking totals
   - For generating time charts

## Edge Cases and Safety Mechanisms

1. **Overlapping Timers Prevention**:
   - User can only have one active timer
   - Starting a new timer auto-stops any existing timer

2. **Auto-stopping Stale Timers**:
   - Timers active for longer than a threshold (e.g., 24 hours) are auto-stopped
   - Prevents erroneous long-duration logs from forgotten timers

3. **Validation Rules**:
   - End time must be after start time
   - Times cannot be in the future
   - Start time cannot be more than 1 year in the past
   - Note length is limited to prevent abuse
   - Maximum of 10 tags per time log

## API Endpoints

- **POST /api/time-logs/start**: Start a new timer
- **POST /api/time-logs/stop**: Stop the active timer
- **GET /api/time-logs/active**: Get the active timer
- **POST /api/time-logs/manual**: Create a manual time entry
- **GET /api/time-logs**: Get time logs with filtering
- **GET /api/time-logs/task/{taskId}**: Get time logs for a task
- **GET /api/time-logs/statistics**: Get time tracking statistics
- **PATCH /api/time-logs/{id}**: Update a time log
- **DELETE /api/time-logs/{id}**: Delete a time log
