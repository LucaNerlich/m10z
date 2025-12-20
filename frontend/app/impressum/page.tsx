import { Markdown } from '@/src/lib/markdown/Markdown';
import { getImprint } from '@/src/lib/strapi';

export const revalidate = 3600;

export default async function ImprintPage() {
  const imprint = await getImprint({
    revalidateSeconds: revalidate,
    tags: ['legal', 'imprint'],
  });

  return (
    <main>
      <h1>{imprint.title}</h1>
      <Markdown markdown={imprint.content} />
    </main>
  );
}
