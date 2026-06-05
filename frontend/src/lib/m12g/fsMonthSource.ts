import {promises as fs} from 'node:fs';
import path from 'node:path';

import {type MonthSource} from '@/src/lib/m12g/m12gArchive';
import {parseMonth} from '@/src/lib/m12g/parseMonth';
import {type M12GMonthWithWinner} from '@/src/lib/m12g/types';

const MONTH_FILE_REGEX = /^(\d{4}-\d{2})\.md$/;

async function loadMonthsFromFilesystem(): Promise<M12GMonthWithWinner[]> {
    const dataDir = path.join(process.cwd(), 'public', 'm12g');
    const entries = await fs.readdir(dataDir);
    const monthFiles = entries
        .map((entry) => entry.match(MONTH_FILE_REGEX))
        .filter((match): match is RegExpMatchArray => match !== null);

    const months = await Promise.all(
        monthFiles.map(async (match) => {
            const [fileName, monthId] = match;
            const raw = await fs.readFile(path.join(dataDir, fileName), 'utf8');
            return parseMonth(raw, monthId);
        }),
    );

    return months.filter((month): month is M12GMonthWithWinner => month !== null);
}

/** Production adapter: reads finalized Months from `public/m12g/*.md`. */
export const fsMonthSource: MonthSource = loadMonthsFromFilesystem;
