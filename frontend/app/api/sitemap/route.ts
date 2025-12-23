import {NextResponse} from 'next/server';

export async function GET(request: Request) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_DOMAIN}/sitemap.xml`);
}
