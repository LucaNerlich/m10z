export function getChangelogMarkdown(): string {
    return process.env.BUILD_CHANGELOG_CONTENT ?? '';
}
