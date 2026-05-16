import {promises as fs} from 'node:fs';
import path from 'node:path';

import {parseMonth} from './parseMonth';
import {type M12GMonthWithWinner} from './types';

const MONTH_FILE_REGEX = /^(\d{4}-\d{2})\.md$/;

export async function loadMonths(): Promise<M12GMonthWithWinner[]> {
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
