// https://nextjs.org/docs/app/api-reference/file-conventions/route#non-ui-responses
export async function GET() {
    return new Response(
        `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
 
<channel>
  <title>Next.js Documentation</title>
  <link>https://nextjs.org/docs</link>
  <description>The React Framework for the Web</description>
</channel>
 
</rss>`,
        {
            headers: {
                'Content-Type': 'text/xml',
            },
        }
    )
}
