import {randomUUID} from 'node:crypto';
import {mkdir, rename, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

/**
 * Write a file atomically: a unique temp file in the target directory, then a
 * rename over the destination. A failed write leaves the previous file intact
 * and removes the temp file.
 */
export async function writeFileAtomic(outFile: string, contents: string): Promise<void> {
    await mkdir(path.dirname(outFile), {recursive: true});
    const tempFile = path.join(
        path.dirname(outFile),
        `.${path.basename(outFile)}.${randomUUID()}.tmp`,
    );
    try {
        await writeFile(tempFile, contents, {encoding: 'utf8', flag: 'wx'});
        await rename(tempFile, outFile);
    } finally {
        await rm(tempFile, {force: true});
    }
}
