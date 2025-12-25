---
name: Audio Files Migration Script
overview: Create a migration script to download 87 audio files from m10z.picnotes.de and upload them to Strapi CMS, with proper error handling, retry logic, and documentation.
todos:
  - id: setup-dependencies
    content: Add formdata-node (production) and tsx (dev) dependencies to backend/package.json
    status: completed
  - id: add-env-docs
    content: Document STRAPI_API_TOKEN environment variable in backend/README.md
    status: completed
  - id: create-script-dir
    content: Create backend/src/scripts/ directory structure
    status: completed
  - id: implement-interfaces
    content: Define TypeScript interfaces for file processing status tracking
    status: completed
    dependencies:
      - create-script-dir
  - id: implement-download
    content: Implement file download logic with retry and temporary file handling
    status: completed
    dependencies:
      - implement-interfaces
  - id: implement-upload
    content: Implement Strapi upload logic with formdata-node and retry logic
    status: completed
    dependencies:
      - implement-download
  - id: implement-error-handling
    content: Add error handling, cleanup, and final migration report
    status: completed
    dependencies:
      - implement-upload
  - id: add-npm-script
    content: Add 'migrate:audio' npm script to backend/package.json
    status: completed
    dependencies:
      - implement-error-handling
  - id: create-migration-docs
    content: Create migration documentation in backend/MIGRATION.md or update README.md
    status: completed
    dependencies:
      - add-npm-script
---

# Audio Files Migration Script Implementation

## Overview

This plan implements a migration script to download 87 audio files from m10z.picnotes.de and upload them to Strapi CMS at `https://cms.m10z.de/api/upload`. The script includes retry logic, error handling, progress tracking, and proper cleanup.

## Implementation Details

### Task 1: Dependencies and Environment Configuration

**Files to modify:**

- `backend/package.json` - Add dependencies and npm script
- `backend/README.md` - Document environment variable

**Changes:**

1. Add `formdata-node` to `dependencies` section
2. Add `tsx` to `devDependencies` section  
3. Add `STRAPI_API_TOKEN` documentation to README.md with usage instructions

**Note:** The script will read `STRAPI_API_TOKEN` from `process.env` directly (Node.js standard), not using Strapi's `env()` helper since this is a standalone script, not a Strapi config file.

### Task 2: Core Migration Script

**New file:** `backend/src/scripts/migrate-audio-files.ts`**Script structure:**

- TypeScript interfaces for file processing status tracking
- Hardcoded array of 87 file URLs (placeholder to be filled)
- Sequential processing with delays (100-200ms between requests)
- Retry logic with exponential backoff (3 attempts)
- Temporary file management with cleanup
- Progress logging and final migration report

**Key implementation details:**

1. **File Download:**

- Use Node.js built-in `fetch` API
- Create temporary directory with `fs.mkdtemp()` using `os.tmpdir()`
- Extract filename from URL using `URL` constructor and `path.basename()`
- Preserve file extension
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 4s delays)

2. **Strapi Upload:**

- Use `formdata-node` to construct FormData
- POST to `https://cms.m10z.de/api/upload`
- Bearer token authentication: `Authorization: Bearer ${process.env.STRAPI_API_TOKEN}`
- Content-Type header: `multipart/form-data` (set automatically by FormData)
- Retry logic: 3 attempts with exponential backoff
- Handle Strapi response (returns array of uploaded files)

3. **Error Handling:**

- Track failed files with error messages
- Use try-catch-finally to ensure cleanup
- Delete temporary files after successful upload
- Log final migration report with success/failure counts

4. **Processing Flow:**
```mermaid
flowchart TD
    Start([Start Script]) --> CheckEnv{Check STRAPI_API_TOKEN}
    CheckEnv -->|Missing| Error1[Log Error and Exit]
    CheckEnv -->|Present| CreateTemp[Create Temp Directory]
    CreateTemp --> ProcessFiles[For Each File URL]
    ProcessFiles --> Download[Download File with Retry]
    Download -->|Success| Upload[Upload to Strapi with Retry]
    Download -->|Failed| TrackFail[Track Failure]
    Upload -->|Success| Cleanup[Delete Temp File]
    Upload -->|Failed| TrackFail
    Cleanup --> Delay[Wait 100-200ms]
    Delay --> NextFile{More Files?}
    NextFile -->|Yes| ProcessFiles
    NextFile -->|No| Report[Generate Final Report]
    TrackFail --> NextFile
    Report --> CleanupTemp[Cleanup Temp Directory]
    CleanupTemp --> End([End])
```




### Task 3: Script Execution and Documentation

**Files to modify:**

- `backend/package.json` - Add npm script
- `backend/README.md` or create `backend/MIGRATION.md` - Document migration process

**Changes:**

1. Add script: `"migrate:audio": "tsx src/scripts/migrate-audio-files.ts"`
2. Document:

- How to set `STRAPI_API_TOKEN` environment variable
- Expected output format
- Verification steps in Strapi admin panel
- Note that files appear in "API Uploads" folder
- Note that script can be removed after migration

## Security Considerations

- Validate URLs to prevent SSRF (ensure URLs are from m10z.picnotes.de domain)
- Never log the API token
- Use secure file handling for temporary files
- Clean up temporary files even on failure

## Implementation Notes

- The script processes files sequentially (one at a time) to avoid overwhelming the server
- Retry delays use exponential backoff: 1s, 2s, 4s
- Between-file delays: random 100-200ms to avoid rate limiting