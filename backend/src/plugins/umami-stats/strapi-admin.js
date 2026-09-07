/**
 * Admin entry point of the umami-stats local plugin.
 *
 * Re-exports the TypeScript admin module; it is compiled by the Strapi
 * admin build (vite), so TypeScript is fine here.
 */
import admin from './admin/src';

export default admin;
