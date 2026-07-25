import {handleDiagnosticsGet} from '@/src/lib/diagnostics/handleDiagnostics';

export async function GET(request: Request) {
    return handleDiagnosticsGet(request);
}

