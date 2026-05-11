import {readFileSync} from 'node:fs';
import path from 'node:path';
import {type Metadata} from 'next';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {version as appVersion} from '../../package.json';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Changelog',
    description: `Versionshistorie von Mindestens 10 Zeichen — alle Änderungen am Frontend, aktuell Version ${appVersion}.`,
    path: '/changelog',
    ogImageAlt: 'Changelog von Mindestens 10 Zeichen',
});

export default function ChangelogPage() {
    const markdown = readFileSync(path.join(process.cwd(), 'public', 'changelog.md'), 'utf-8');
    return (
        <div data-list-page>
            <Markdown markdown={markdown} />
        </div>
    );
}
