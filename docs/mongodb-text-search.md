# Note Search Implementation

This document explains how we've implemented search functionality for notes in the Nexell backend.

## Regex-based Search

We have implemented a regex-based search approach for notes which provides flexibility without requiring special indexes:

```typescript
// Build filter with regular expression search
if (search) {
  const searchRegex = new RegExp(search, 'i'); // case-insensitive search
  filter.$or = [{ title: searchRegex }, { content: searchRegex }];
}
```

## Key Features

1. **Case-insensitive Matching**:

   - The `i` flag in the RegExp constructor makes the search case-insensitive
   - This ensures searches match regardless of letter case

2. **Multiple Field Search**:

   - Search is performed on both title and content fields using MongoDB's `$or` operator
   - This allows matching on either field

3. **Implementation in Queries**:
   - The search is implemented in the `getNotes` method in the NoteService
   - Results are sorted based on the specified sort field (default: createdAt)

## Using the Search Feature

To use the search feature, clients can make a GET request to `/api/notes` with the following query parameters:

- `search`: The text to search for across note titles and content
- `page`: For pagination (defaults to 1)
- `limit`: Number of results per page (defaults to 10)

Example: `GET /api/notes?search=meeting&page=1&limit=10`

## Performance Considerations

- Regular expression searches can be slower than indexed text searches for large datasets
- MongoDB will utilize standard indexes on title and content fields when available
- For optimal performance with large datasets, consider standard indexes on commonly searched fields

## Future Enhancements

1. Implement more advanced search filters (date ranges, tag combinations)
2. Consider implementing fuzzy search for better matching
3. Add search highlighting capabilities
4. For large scale applications, evaluate dedicated search solutions like Elasticsearch
