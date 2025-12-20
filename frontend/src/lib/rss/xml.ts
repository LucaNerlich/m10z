import crypto from 'node:crypto';

export function formatRssDate(date: Date): string {
  // RSS expects RFC 2822 / UTC string.
  return date.toUTCString();
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Make content safe for inclusion inside <![CDATA[ ... ]]> blocks.
 * The sequence ']]>' terminates CDATA; split it safely.
 */
export function escapeCdata(text: string): string {
  return text.replace(/]]>/g, ']]]]><![CDATA[>');
}


