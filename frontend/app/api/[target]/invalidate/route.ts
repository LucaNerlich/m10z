import {handleInvalidation} from '@/src/lib/cache/handleInvalidation';

type RouteContext = {
    params: Promise<{target: string}>;
};

export async function POST(request: Request, {params}: RouteContext) {
    const {target} = await params;
    return handleInvalidation(request, target);
}
