import {Agent, setGlobalDispatcher} from 'undici';

/**
 * Initializes a global HTTP agent with connection pooling for fetch requests.
 *
 * This configuration aligns with backend HTTP server settings:
 * - keepAliveTimeout: 60 seconds (slightly less than backend's 65s keepAliveTimeout
 *   to ensure connections are reused before backend closes them)
 * - keepAliveMaxTimeout: 300 seconds (5 minutes) allows for long-lived connections
 * - connections: 100 concurrent connections per origin to handle high concurrency
 * - pipelining: 1 maintains request order (no HTTP pipelining)
 *
 * This agent is used by Next.js's built-in fetch implementation when running
 * on the server, improving connection reuse and reducing overhead during SSR requests.
 */
export function initializeFetchAgent(): void {
    // Only run on server-side (Node.js environment)
    if (typeof window !== 'undefined') {
        return;
    }

    try {
        const agent = new Agent({
            keepAliveTimeout: 60000, // 60 seconds
            keepAliveMaxTimeout: 300000, // 300 seconds (5 minutes)
            connections: 100,
            pipelining: 1,
        });

        setGlobalDispatcher(agent);
    } catch (error) {
        // Log warning but don't throw - fetch will fall back to default behavior
        console.warn('Failed to initialize fetch agent (using default fetch behavior):', error);
    }
}

