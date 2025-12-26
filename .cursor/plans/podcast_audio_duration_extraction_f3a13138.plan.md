---
name: Podcast audio duration extraction
overview: Install music-metadata package and implement lifecycle hooks to automatically extract duration from podcast audio files during create and update operations.
todos:
  - id: install-music-metadata
    content: Add music-metadata to backend/package.json dependencies
    status: completed
  - id: create-lifecycles-file
    content: Create backend/src/api/podcast/content-types/podcast/lifecycles.ts with beforeCreate and beforeUpdate hooks
    status: cancelled
    dependencies:
      - install-music-metadata
  - id: implement-extract-duration
    content: Implement extractDuration helper function with file retrieval, path resolution, metadata extraction, and error handling
    status: completed
    dependencies:
      - create-lifecycles-file
---

# Podcast Audio Duration Extraction

## Overview

Implement automatic duration extraction for podcast audio files using Strapi lifecycle hooks. The duration will be extracted from audio file metadata and populated in the `duration` field when podcasts are created or updated.

## Implementation Plan

### Task 1: Install music-metadata Package

**File:** [`backend/package.json`](backend/package.json)

- Add `music-metadata` to the `dependencies` section
- Run `pnpm install` (since the project uses pnpm as package manager) to update lock file

### Task 2: Create Lifecycle Hooks

**File:** [`backend/src/api/podcast/content-types/podcast/lifecycles.ts`](backend/src/api/podcast/content-types/podcast/lifecycles.ts) (new file)Create lifecycle hooks with the following structure:

1. **Import dependencies:**

- `parseFile` from `music-metadata` for file-based metadata extraction
- `fs` for file system operations (checking file existence)
- `path` for secure path handling
- `strapi` instance access (available in lifecycle context)

2. **Implement `beforeCreate` hook:**

- Call shared duration extraction function
- Handle errors gracefully without blocking save operation

3. **Implement `beforeUpdate` hook:**

- Call shared duration extraction function
- Handle errors gracefully without blocking save operation

4. **Create `extractDuration` helper function:**

- Check if `event.params.data.file` exists (can be ID, documentId, or object)
- Query upload file record using `strapi.documents('plugin::upload.file').findOne()` with appropriate ID
- Extract file path from upload record:
    - Use `file.url` for relative URLs
    - Resolve against `strapi.dirs.public` or `strapi.dirs.static.public` for absolute path
    - Validate path is within public directory (security: prevent path traversal)
- Check if file exists using `fs.existsSync()`
- Use `music-metadata.parseFile()` to extract metadata
- Extract duration from `metadata.format.duration`
- Convert to integer seconds using `Math.round()`
- Set `event.params.data.duration` with extracted value
- Wrap entire logic in try-catch for error handling
- Log warnings/errors using `strapi.log` but allow save to proceed even if extraction fails

### Key Implementation Details

**File Access Pattern:**

- `event.params.data.file` may contain:
- File ID (number)
- Document ID (string)
- File object with `id` or `documentId`
- Handle all cases by checking type and extracting appropriate identifier

**Path Security:**

- Use `path.resolve()` to normalize paths
- Validate resolved path starts with public directory to prevent path traversal
- Use `path.join()` for safe path construction

**Error Handling:**

- Log extraction failures but don't throw errors
- Skip duration extraction if file is null/undefined
- Skip if file record not found
- Skip if file doesn't exist on filesystem
- Skip if metadata extraction fails
- Always allow save operation to proceed

**Duration Format:**

- Extract `duration` from `metadata.format.duration` (number in seconds, may be decimal)
- Convert to integer using `Math.round()` to match schema requirement (integer type)

## Files to Modify

1. `backend/package.json` - Add music-metadata dependency
2. `backend/src/api/podcast/content-types/podcast/lifecycles.ts` - Create new lifecycle hooks file

## Testing Considerations

- Test with valid audio files (MP3, etc.)
- Test with missing file attachment
- Test with invalid file IDs
- Test with files that don't exist on filesystem
- Test with corrupted audio files