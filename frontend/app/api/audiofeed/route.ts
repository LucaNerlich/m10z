export async function GET(request: Request) {
    // Canonical endpoint is /audiofeed.xml; keep this route for backward-compat/internals.
    return Response.redirect(new URL('/audiofeed.xml', request.url), 307);
}
