#!/usr/bin/env node

/**
 * Audio Files Migration Script
 *
 * Downloads 87 audio files from m10z.picnotes.de and uploads them to Strapi CMS.
 * Files are processed sequentially with retry logic and proper error handling.
 *
 * Usage:
 *   pnpm migrate:audio
 *
 * Environment variables can be set in .env file or as environment variables:
 *   STRAPI_API_TOKEN=your_token
 */

import {config} from 'dotenv';
import {File, FormData} from 'formdata-node';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// Load environment variables from .env file
config();

// ============================================================================
// Types and Interfaces
// ============================================================================

interface FileProcessingStatus {
    url: string;
    filename: string;
    status: 'pending' | 'downloading' | 'uploading' | 'success' | 'failed';
    error?: string;
    uploadedFileId?: number;
}

interface MigrationReport {
    total: number;
    successful: number;
    failed: number;
    files: FileProcessingStatus[];
}

// ============================================================================
// Configuration
// ============================================================================

const STRAPI_UPLOAD_URL = 'https://cms.m10z.de/api/upload';
const ALLOWED_DOMAIN = 'm10z.picnotes.de';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff in milliseconds
const BETWEEN_FILE_DELAY_MIN = 100;
const BETWEEN_FILE_DELAY_MAX = 200;

// Hardcoded list of 87 audio file URLs
const AUDIO_FILE_URLS: string[] = [
    // Placeholder - replace with actual 87 URLs
    // Example format:
    // 'https://m10z.picnotes.de/path/to/file1.mp3',
    // 'https://m10z.picnotes.de/path/to/file2.mp3',
    // ...
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_006.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_008.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_001.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_010.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_009.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_007.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_002.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_005.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_004.mp3',
    'https://m10z.picnotes.de/Pixelplausch/Pixelplausch_003.mp3',
    'https://m10z.picnotes.de/Quiz/m10z_quiz_4.mp3',
    'https://m10z.picnotes.de/FantastischeFakten/Fakten_001.mp3',
    'https://m10z.picnotes.de/FantastischeFakten/Fakten_002.mp3',
    'https://m10z.picnotes.de/DasGesprocheneWort/DasGesprocheneWort_002.mp3',
    'https://m10z.picnotes.de/DasGesprocheneWort/DasGesprocheneWort_001.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_008.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_015.wav',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_012.mp3',
    'https://m10z.picnotes.de/Fundbuero/F11_Aufnahem_Edgar.wav',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_007.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_016.wav',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_016.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_013.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_003.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_002.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_011.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_001.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_004.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_010.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_015.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_017.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_014.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_009.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_005_Gallien_im_Krieg.mp3',
    'https://m10z.picnotes.de/Fundbuero/Fundbuero_006_Winterspezial.mp3',
    'https://m10z.picnotes.de/GamingStories/GamingStories_001.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_Relaunch_03.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_Relaunch_02.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_1_Pilotfolge_mit_Luca.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_Relaunch_004.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_4_RogueLikeLite.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_2_Nostalgie.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_Relaunch_01.mp3',
    'https://m10z.picnotes.de/OwwG/OwwG_3_KinderKrisenKonsolen.mp3',
    'https://m10z.picnotes.de/ZockenOhneZaster/ZockenOhneZaster_1.mp3',
    'https://m10z.picnotes.de/ZockenOhneZaster/ZockenOhneZaster_3.mp3',
    'https://m10z.picnotes.de/ZockenOhneZaster/ZockenOhneZaster_2.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_004.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_009.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_005.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_011.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_003.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_010.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_002.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_008.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_006.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_001.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_012.mp3',
    'https://m10z.picnotes.de/M10Z/M10Z_007.mp3',
    'https://m10z.picnotes.de/Spezial/teehaus_1.mp3',
    'https://m10z.picnotes.de/Spezial/M10ZSpezial_001.mp3',
    'https://m10z.picnotes.de/Spezial/M10Z_Memes_Spezial.mp3',
    'https://m10z.picnotes.de/Spezial/Spezial-Spiele_Militaer_Krieg.mp3',
    'https://m10z.picnotes.de/Spezial/M10Z_Spiele_Verantwortung_Politik_Krisen.mp3',
    'https://m10z.picnotes.de/Spezial/Spezial_Gewalt.mp3',
    'https://m10z.picnotes.de/Spezial/M10Z_Xmas_2024.mp3',
    'https://m10z.picnotes.de/Spezial/Spezial_Gewalt1.mp3',
    'https://m10z.picnotes.de/EnRogue/EnRogue_004.mp3',
    'https://m10z.picnotes.de/EnRogue/EnRogue_002.mp3',
    'https://m10z.picnotes.de/EnRogue/EnRogue_001.mp3',
    'https://m10z.picnotes.de/EnRogue/EnRogue_003.mp3',
    'https://m10z.picnotes.de/EnRogue/EnRogue_005.mp3',
    'https://m10z.picnotes.de/ComicCast/ComicCast_002.mp3',
    'https://m10z.picnotes.de/ComicCast/ComicCast_001.mp3',
    'https://m10z.picnotes.de/DasTelespielTrio/TelespielTrio_pilot.mp3',
    'https://m10z.picnotes.de/DasTelespielTrio/TelespielTrio_1.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_9.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_8.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_6.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_3.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_7.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_1.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_5.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_2.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_Pilot.mp3',
    'https://m10z.picnotes.de/DesGamePassesGeheimePerlen/DesGamePassesGeheimePerlen_4.mp3',
    'https://m10z.picnotes.de/gds/GuertelDerSchmerzen23.mp3',
];

// ============================================================================
// Utility Functions
// ============================================================================

function log(...args: unknown[]): void {
    console.log('[migrate-audio-files]', ...args);
}

function error(...args: unknown[]): void {
    console.error('[migrate-audio-files] ERROR:', ...args);
}

function validateUrl(url: string): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error(`Invalid URL format: ${url}`);
    }

    // SSRF protection: ensure URL is from allowed domain
    if (parsedUrl.hostname !== ALLOWED_DOMAIN) {
        throw new Error(
            `URL hostname ${parsedUrl.hostname} does not match allowed domain ${ALLOWED_DOMAIN}`,
        );
    }

    // Ensure HTTPS
    if (parsedUrl.protocol !== 'https:') {
        throw new Error(`URL must use HTTPS protocol: ${url}`);
    }
}

function extractFilename(url: string): string {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const filename = path.basename(pathname);

    if (!filename || filename === '/') {
        throw new Error(`Could not extract filename from URL: ${url}`);
    }

    return filename;
}

function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    
    // Audio MIME types
    const mimeTypes: Record<string, string> = {
        '.mp3': 'audio/mpeg',
        '.mpeg': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.wave': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.oga': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.webm': 'audio/webm',
        '.opus': 'audio/opus',
    };

    return mimeTypes[ext] || 'application/octet-stream';
}

function randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
}

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Download Functions
// ============================================================================

async function downloadFileWithRetry(
    url: string,
    outputPath: string,
    attempt: number = 1,
): Promise<void> {
    try {
        validateUrl(url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'm10z-migration-script/1.0',
            },
        });

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status} ${response.statusText}`,
            );
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fs.writeFile(outputPath, buffer);

        log(`Downloaded: ${path.basename(outputPath)} (${buffer.length} bytes)`);
    } catch (err) {
        if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt - 1];
            log(
                `Download failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`,
            );
            await sleep(delay);
            return downloadFileWithRetry(url, outputPath, attempt + 1);
        }
        throw err;
    }
}

// ============================================================================
// Upload Functions
// ============================================================================

async function uploadToStrapiWithRetry(
    filePath: string,
    filename: string,
    attempt: number = 1,
): Promise<{id: number; url: string}> {
    const apiToken = process.env.STRAPI_API_TOKEN;

    if (!apiToken) {
        throw new Error('STRAPI_API_TOKEN environment variable is not set');
    }

    try {
        const fileBuffer = await fs.readFile(filePath);
        const mimeType = getMimeType(filename);
        const file = new File([fileBuffer], filename, {
            type: mimeType,
        });

        const formData = new FormData();
        formData.set('files', file);

        const response = await fetch(STRAPI_UPLOAD_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiToken}`,
            },
            body: formData as unknown as BodyInit,
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(
                `HTTP ${response.status} ${response.statusText}: ${text}`,
            );
        }

        const json = await response.json();

        // Strapi upload returns an array of uploaded files
        if (!Array.isArray(json) || !json[0] || typeof json[0].id !== 'number') {
            throw new Error('Unexpected Strapi upload response format');
        }

        const uploadedFile = json[0];
        log(
            `Uploaded: ${filename} (ID: ${uploadedFile.id}, URL: ${uploadedFile.url})`,
        );

        return {
            id: uploadedFile.id,
            url: uploadedFile.url || '',
        };
    } catch (err) {
        if (attempt < MAX_RETRIES) {
            const delay = RETRY_DELAYS[attempt - 1];
            log(
                `Upload failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`,
            );
            await sleep(delay);
            return uploadToStrapiWithRetry(filePath, filename, attempt + 1);
        }
        throw err;
    }
}

// ============================================================================
// Main Migration Logic
// ============================================================================

async function processFile(
    url: string,
    tempDir: string,
    index: number,
    total: number,
): Promise<FileProcessingStatus> {
    const status: FileProcessingStatus = {
        url,
        filename: '',
        status: 'pending',
    };

    try {
        status.filename = extractFilename(url);
        status.status = 'downloading';

        log(`[${index + 1}/${total}] Processing: ${status.filename}`);

        const tempFilePath = path.join(tempDir, status.filename);

        // Download file
        await downloadFileWithRetry(url, tempFilePath);

        // Upload to Strapi
        status.status = 'uploading';
        const uploadedFile = await uploadToStrapiWithRetry(
            tempFilePath,
            status.filename,
        );

        status.status = 'success';
        status.uploadedFileId = uploadedFile.id;

        // Clean up temporary file
        await fs.unlink(tempFilePath).catch((err) => {
            error(`Failed to delete temp file ${tempFilePath}:`, err);
        });

        // Delay between files
        if (index < total - 1) {
            await randomDelay(BETWEEN_FILE_DELAY_MIN, BETWEEN_FILE_DELAY_MAX);
        }
    } catch (err) {
        status.status = 'failed';
        status.error = err instanceof Error ? err.message : String(err);
        error(`Failed to process ${status.filename || url}:`, status.error);
    }

    return status;
}

async function generateReport(
    files: FileProcessingStatus[],
): Promise<MigrationReport> {
    const successful = files.filter((f) => f.status === 'success').length;
    const failed = files.filter((f) => f.status === 'failed').length;

    return {
        total: files.length,
        successful,
        failed,
        files,
    };
}

function printReport(report: MigrationReport): void {
    log('\n' + '='.repeat(60));
    log('Migration Report');
    log('='.repeat(60));
    log(`Total files: ${report.total}`);
    log(`Successful: ${report.successful}`);
    log(`Failed: ${report.failed}`);

    if (report.failed > 0) {
        log('\nFailed files:');
        report.files
            .filter((f) => f.status === 'failed')
            .forEach((f) => {
                log(`  - ${f.filename || f.url}`);
                log(`    Error: ${f.error || 'Unknown error'}`);
            });
    }

    log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
    // Validate environment
    if (!process.env.STRAPI_API_TOKEN) {
        error('STRAPI_API_TOKEN environment variable is required');
        process.exit(1);
    }

    // Validate URL list
    if (AUDIO_FILE_URLS.length === 0) {
        error('AUDIO_FILE_URLS array is empty. Please add the 87 file URLs.');
        process.exit(1);
    }

    log(`Starting migration of ${AUDIO_FILE_URLS.length} audio files...`);
    log(`Strapi endpoint: ${STRAPI_UPLOAD_URL}`);

    // Create temporary directory
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'm10z-audio-migration-'));

    log(`Temporary directory: ${tempDir}`);

    const files: FileProcessingStatus[] = [];

    try {
        // Process files sequentially
        for (let i = 0; i < AUDIO_FILE_URLS.length; i++) {
            const url = AUDIO_FILE_URLS[i];
            const status = await processFile(url, tempDir, i, AUDIO_FILE_URLS.length);
            files.push(status);
        }
    } finally {
        // Cleanup temporary directory
        try {
            const entries = await fs.readdir(tempDir);
            if (entries.length > 0) {
                log(`Cleaning up ${entries.length} remaining temporary files...`);
                for (const entry of entries) {
                    await fs.unlink(path.join(tempDir, entry)).catch(() => {
                        // Ignore errors during cleanup
                    });
                }
            }
            await fs.rmdir(tempDir);
            log('Temporary directory cleaned up');
        } catch (err) {
            error('Failed to cleanup temporary directory:', err);
        }
    }

    // Generate and print report
    const report = await generateReport(files);
    printReport(report);

    // Exit with error code if any files failed
    if (report.failed > 0) {
        process.exit(1);
    }

    log('Migration completed successfully!');
}

// Run the script
main().catch((err) => {
    error('Fatal error:', err);
    process.exit(1);
});

