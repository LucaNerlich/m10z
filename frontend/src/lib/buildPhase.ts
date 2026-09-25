import {PHASE_PRODUCTION_BUILD} from 'next/constants';

/**
 * True while `next build` prerenders pages. Next sets `NEXT_PHASE` in the build
 * process, and the prerender workers inherit it.
 */
export function isBuildPhase(): boolean {
    return process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}
