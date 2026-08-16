import {NextResponse} from 'next/server';

import {routes} from '@/src/lib/routes';

export async function GET(request: Request) {
    // routes.siteUrl falls back to https://m10z.de when NEXT_PUBLIC_DOMAIN is
    // unset, so the redirect target is never "undefined/sitemap.xml".
    return NextResponse.redirect(`${routes.siteUrl}/sitemap.xml`);
}
