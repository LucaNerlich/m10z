export async function GET(request: Request) {
  // Canonical endpoint is /rss.xml; keep this route for backward-compat/internals.
  return Response.redirect(new URL('/rss.xml', request.url), 307);
}
