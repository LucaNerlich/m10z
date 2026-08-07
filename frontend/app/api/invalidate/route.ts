import {handleInvalidation} from '@/src/lib/cache/handleInvalidation';

export async function POST(request: Request) {
    return handleInvalidation(request);
}
