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

2. Create a `.env` file in the `backend` directory (if it doesn't exist) and add:
   ```bash
   STRAPI_API_TOKEN=your_token_here
   ```

   Alternatively, you can set it as an environment variable:
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
- **Maximum retries**: 3 total attempts per operation (1 initial attempt + 2 retries)
- **Retry delays**: 2s, 5s delays between retries (exponential backoff)
- Failed files are tracked and reported at the end

**Note:** These values are defined by the `MAX_RETRIES` and `RETRY_DELAYS` constants in `src/scripts/migrate-audio-files.ts` (lines 51-52). Update the documentation if these constants are modified.

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

## Server Configuration (Coolify/Traefik)

If you're using Coolify with Traefik and experiencing 504 Gateway Timeout errors with large files, you need to configure Traefik timeouts.

### Option 1: Configure Traefik EntryPoint Timeouts in Coolify (Recommended)

In Coolify, you need to configure Traefik at the proxy/entrypoint level:

1. **Go to your Server Settings** → **Proxy Settings** (or Traefik configuration)
2. **Add these command arguments** to increase timeouts:

```yaml
command:
  - "--entrypoints.web.transport.respondingTimeouts.readTimeout=10m"
  - "--entrypoints.web.transport.respondingTimeouts.writeTimeout=10m"
  - "--entrypoints.web.transport.respondingTimeouts.idleTimeout=5m"
  - "--entrypoints.websecure.transport.respondingTimeouts.readTimeout=10m"
  - "--entrypoints.websecure.transport.respondingTimeouts.writeTimeout=10m"
  - "--entrypoints.websecure.transport.respondingTimeouts.idleTimeout=5m"
```

**Or if using HTTPS entrypoint:**
```yaml
command:
  - "--entrypoints.https.transport.respondingTimeouts.readTimeout=10m"
  - "--entrypoints.https.transport.respondingTimeouts.writeTimeout=10m"
  - "--entrypoints.https.transport.respondingTimeouts.idleTimeout=5m"
```

**Note:** 
- `readTimeout`: Time Traefik waits for response from backend (10 minutes)
- `writeTimeout`: Time Traefik waits to write request to backend (10 minutes)  
- `idleTimeout`: Time to keep connection alive (5 minutes)

After adding these, restart Traefik in Coolify.

### Option 2: Traefik Dynamic Configuration File

If you have access to Traefik's configuration directory, create or edit `traefik.yml` or add to your dynamic configuration:

```yaml
http:
  middlewares:
    strapi-timeout:
      forwardAuth:
        address: ""
      # Or use buffering middleware
      buffering:
        maxRequestBodyBytes: 5368709120  # 5GB
        maxResponseBodyBytes: 5368709120
        memRequestBodyBytes: 104857600  # 100MB
        memResponseBodyBytes: 104857600
        retryExpression: "IsNetworkError() && Attempts() < 3"
```

### Option 3: Traefik IngressRoute (Kubernetes) or Docker Labels

For Docker Compose or Kubernetes, add these labels to your Strapi service:

```yaml
labels:
  - "traefik.http.middlewares.strapi-timeout.forwardauth.address="
  - "traefik.http.middlewares.strapi-timeout.forwardauth.forwardauth.responseForward=true"
  - "traefik.http.routers.strapi.middlewares=strapi-timeout"
```

### Option 4: Coolify Environment Variables

In Coolify, you can also set these as environment variables on your Strapi service:
- `TRAEFIK_TIMEOUT_READ=600s`
- `TRAEFIK_TIMEOUT_WRITE=600s`

### Recommended Timeout Values

For large file uploads (50-100MB+), set:
- **Read timeout**: 600 seconds (10 minutes)
- **Write timeout**: 600 seconds (10 minutes)
- **Idle timeout**: 180 seconds (3 minutes)

### Verification

After applying the configuration:
1. Restart your Strapi service in Coolify
2. Check Traefik logs to confirm middleware is applied
3. Test with a large file upload
4. Monitor Traefik dashboard/metrics for timeout errors

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

### "HTTP 504 Gateway Timeout"
This error occurs when Traefik (reverse proxy) times out before the upload completes. This is common with large files (>50MB).

**Solution: Configure Traefik timeouts in Coolify**

If using Coolify with Traefik, you need to increase Traefik timeouts. Add the following labels to your Strapi service in Coolify:

```yaml
traefik.http.middlewares.strapi-timeout.forwardauth.address: ""
traefik.http.services.strapi.loadbalancer.server.port: "1337"
traefik.http.routers.strapi.middlewares: "strapi-timeout"
```

Or configure via Coolify's environment variables/annotations:
- `traefik.http.middlewares.strapi-timeout.forwardauth.address=""`
- Set Traefik timeout values (e.g., `traefik.http.middlewares.strapi-timeout.forwardauth.forwardauth.responseForward=true`)

Alternatively, configure Traefik directly in your `docker-compose.yml` or Coolify settings:
- Increase `traefik.http.middlewares.strapi-timeout.forwardauth.forwardauth.responseForward` timeout
- Set `traefik.http.services.strapi.loadbalancer.server.port` timeout to at least 600 seconds for large files

**Recommended Traefik timeout values for large file uploads:**
- `traefik.http.middlewares.strapi-timeout.forwardauth.forwardauth.responseForward`: 600s (10 minutes)
- Or use Traefik's `timeout` middleware with appropriate values

The script will automatically retry failed uploads, but persistent 504 errors indicate server-side timeout configuration is needed.

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

