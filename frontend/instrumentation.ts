import {initializeFetchAgent} from './src/lib/fetchAgent';

/**
 * Initializes the global fetch agent used for connection pooling when the Next.js server starts.
 */
export async function register() {
    initializeFetchAgent();
}
