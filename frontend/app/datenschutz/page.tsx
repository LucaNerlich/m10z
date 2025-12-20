import { Markdown } from '@/src/lib/markdown/Markdown';
import { getPrivacy } from '@/src/lib/strapi';

export const revalidate = 3600;

export default async function PrivacyPage() {
  const privacy = await getPrivacy({
    revalidateSeconds: revalidate,
    tags: ['legal', 'privacy'],
  });

  return (
    <main>
      <h1>{privacy.title}</h1>
      <Markdown markdown={privacy.content} />
    </main>
  );
}
