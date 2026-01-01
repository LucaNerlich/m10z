import {initializeFetchAgent} from './src/lib/fetchAgent';

/**
 * Next.js instrumentation hook that runs once when the server starts.
 * Initializes the global fetch agent for connection pooling.
 */
export async function register() {
    initializeFetchAgent();
}

