import {type Metadata} from 'next';
import {getChangelogMarkdown} from '@/src/lib/changelogMarkdown';
import {Markdown} from '@/src/lib/markdown/Markdown';
import {buildStaticListMetadata} from '@/src/lib/metadata/staticListMetadata';
import {version as appVersion} from '../../package.json';

export const metadata: Metadata = buildStaticListMetadata({
    title: 'Changelog',
    description: `Versionshistorie von Mindestens 10 Zeichen — alle Änderungen am Frontend, aktuell Version ${appVersion}.`,
    path: '/changelog',
    ogImageAlt: 'Changelog von Mindestens 10 Zeichen',
});

export default async function ChangelogPage() {
    const markdown = await getChangelogMarkdown();
    return (
        <div data-list-page>
            <Markdown markdown={markdown} />
        </div>
    );
}
