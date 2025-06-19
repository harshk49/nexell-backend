# Pagination and Filtering for Notes API

This document describes the pagination and filtering implementation for the Notes API in the Nexell backend.

## API Endpoints

The primary endpoint for fetching notes with pagination and filtering is:

`GET /api/notes`

## Query Parameters

### Pagination Parameters

- `page`: The page number to return (default: 1)
- `limit`: Number of results per page (default: 10)

### Filtering Parameters

- `folder`: Filter by folder ID
- `tag`: Filter by a specific tag
- `search`: Full-text search on title and content
- `sortBy`: Field to sort by (default: 'createdAt')
- `sortDirection`: Sort direction, either 'asc' or 'desc' (default: 'desc')

## Example Requests

### Basic Pagination

```
GET /api/notes?page=2&limit=20
```

Returns the second page with 20 notes per page.

### Filtering by Folder

```
GET /api/notes?folder=60d21b4667d0d8992e610c85
```

Returns notes in the specified folder.

### Filtering by Tag

```
GET /api/notes?tag=important
```

Returns notes with the 'important' tag.

### Search with Pagination

```
GET /api/notes?search=project&page=1&limit=10
```

Returns the first page of notes matching the search term 'project'.

### Sorting

```
GET /api/notes?sortBy=title&sortDirection=asc
```

Returns notes sorted alphabetically by title.

### Combined Filters

```
GET /api/notes?folder=60d21b4667d0d8992e610c85&tag=important&sortBy=updatedAt&sortDirection=desc
```

Returns notes in the specified folder with the 'important' tag, sorted by last updated date in descending order.

## Response Format

```json
{
  "status": "success",
  "data": {
    "notes": [
      {
        "_id": "60d21b4667d0d8992e610c86",
        "title": "Note Title",
        "content": "Note content",
        "user": "60d21b4667d0d8992e610c84",
        "folder": "60d21b4667d0d8992e610c85",
        "tags": ["important", "work"],
        "createdAt": "2023-06-22T15:30:45.123Z",
        "updatedAt": "2023-06-22T15:30:45.123Z"
      }
      // More notes...
    ],
    "pagination": {
      "totalCount": 45,
      "totalPages": 5,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

## Implementation Details

The pagination and filtering logic is implemented in the `getNotes` method of the `NoteService` class:

1. **Building the Filter**:

   - Base filter starts with user ID to ensure user only accesses their own notes
   - Additional filters (folder, tag) are added conditionally

2. **Note Search**:

   - When search parameter is provided, we use regex-based search on title and content
   - Searches are case-insensitive for better user experience

3. **Sorting**:

   - Default sorting is by creation date, newest first
   - Allows sorting by any note field

4. **Pagination**:

   - Uses MongoDB's `skip` and `limit` methods
   - Calculates total pages based on total matching documents

5. **Response Structure**:
   - Includes the note data
   - Provides pagination metadata (total count, total pages, current page, limit)

## Best Practices

1. Always include pagination to limit data transfer
2. Use indexes on fields commonly used for filtering (user, folder, tags)
3. Consider implementing cursor-based pagination for large datasets
4. Validate and sanitize query parameters
5. Apply reasonable defaults and limits
