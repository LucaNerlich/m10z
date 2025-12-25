# Audio Files Migration Guide

This document describes the process for migrating audio files from m10z.picnotes.de to Strapi CMS.

## Overview

The migration script (`src/scripts/migrate-audio-files.ts`) downloads 87 audio files from m10z.picnotes.de and uploads them to the Strapi CMS upload endpoint. Files are processed sequentially with retry logic and proper error handling.

## Prerequisites

1. **Node.js and pnpm**: Ensure Node.js ^22 and pnpm 10.15.1 are installed
2. **Strapi API Token**: Obtain an API token from Strapi admin panel:
   - Navigate to Settings > API Tokens
   - Create a new token with "Full access" permissions
   - Copy the token value

## Setup

1. Install dependencies:
   ```bash
   cd backend
   pnpm install
   ```

2. Set the environment variable:
   ```bash
   export STRAPI_API_TOKEN=your_token_here
   ```

   Or on Windows:
   ```cmd
   set STRAPI_API_TOKEN=your_token_here
   ```

3. **Important**: Before running the script, you must add the 87 audio file URLs to the `AUDIO_FILE_URLS` array in `src/scripts/migrate-audio-files.ts`.

## Running the Migration

Execute the migration script:

```bash
pnpm migrate:audio
```

## Expected Output

The script will:
1. Validate the environment and URL list
2. Create a temporary directory for downloaded files
3. Process each file sequentially:
   - Download from m10z.picnotes.de
   - Upload to Strapi CMS
   - Clean up temporary file
   - Wait 100-200ms before processing next file
4. Display progress logs for each file
5. Generate a final migration report

Example output:
```
[migrate-audio-files] Starting migration of 87 audio files...
[migrate-audio-files] Strapi endpoint: https://cms.m10z.de/api/upload
[migrate-audio-files] Temporary directory: /tmp/m10z-audio-migration-xxxxx
[migrate-audio-files] [1/87] Processing: episode-001.mp3
[migrate-audio-files] Downloaded: episode-001.mp3 (1234567 bytes)
[migrate-audio-files] Uploaded: episode-001.mp3 (ID: 42, URL: /uploads/episode_001_abc123.mp3)
...
[migrate-audio-files] ============================================================
[migrate-audio-files] Migration Report
[migrate-audio-files] ============================================================
[migrate-audio-files] Total files: 87
[migrate-audio-files] Successful: 87
[migrate-audio-files] Failed: 0
[migrate-audio-files] ============================================================
```

## Retry Logic

The script includes automatic retry logic for both downloads and uploads:
- **Maximum retries**: 3 attempts per operation
- **Exponential backoff**: 1s, 2s, 4s delays between retries
- Failed files are tracked and reported at the end

## Verification

After the migration completes:

1. **Check Strapi Admin Panel**:
   - Navigate to Media Library
   - Files should appear in the "API Uploads" folder
   - Verify all 87 files are present

2. **Review Migration Report**:
   - The script prints a summary at the end
   - Check for any failed files
   - Re-run the script for failed files if needed (after fixing issues)

## Troubleshooting

### "STRAPI_API_TOKEN environment variable is required"
- Ensure the token is set before running the script
- Verify the token is valid and has proper permissions

### "URL hostname does not match allowed domain"
- The script validates URLs to prevent SSRF attacks
- Ensure all URLs are from `m10z.picnotes.de`
- URLs must use HTTPS protocol

### "HTTP 401 Unauthorized"
- Check that the API token is correct
- Verify the token hasn't expired
- Ensure the token has upload permissions

### "HTTP 413 Payload Too Large"
- Check file sizes (Strapi has upload size limits)
- Review `backend/config/middlewares.ts` for configured limits

### Network Errors
- Check internet connectivity
- Verify m10z.picnotes.de is accessible
- Verify cms.m10z.de is accessible
- The script will retry automatically, but persistent failures may indicate network issues

## Security Notes

- The script validates URLs to prevent SSRF attacks (only allows m10z.picnotes.de)
- Temporary files are automatically cleaned up
- API tokens are never logged or exposed
- All URLs must use HTTPS

## Cleanup

After successful migration:
- The script and this documentation can be removed
- Temporary files are automatically cleaned up
- No manual cleanup is required

## Support

If you encounter issues:
1. Check the migration report for specific error messages
2. Verify environment variables are set correctly
3. Check Strapi logs for server-side errors
4. Review network connectivity and firewall settings

