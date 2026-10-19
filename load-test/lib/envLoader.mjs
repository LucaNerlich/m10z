// Shared by run.mjs and its tests: load the harness' env files with an explicit
// precedence contract, because `process.loadEnvFile` never overwrites a key
// that is already set.
//
// Precedence: shell/CI > first file > later files. A missing file is optional.

/**
 * Env files the harness reads, relative to `load-test/`, highest precedence
 * first. Exported so the suite pins the order `run.mjs` actually applies.
 *
 * @type {string[]}
 */
export const ENV_FILES = ['.env.local', '.env'];

/**
 * Load `files` into `process.env`, then re-apply `baseEnv` so an explicit
 * environment always wins.
 *
 * `process.loadEnvFile` cannot override an existing key, so loading in order
 * makes the first file win; the snapshot restore keeps shell values on top.
 *
 * @param {string[]} files env files, highest precedence first
 * @param {NodeJS.ProcessEnv} [baseEnv] environment to preserve, defaults to the
 *   current process environment
 * @returns {NodeJS.ProcessEnv} the resulting process environment
 * @throws {Error} when a file exists but cannot be read; only `ENOENT` is
 *   treated as "optional"
 */
export function applyEnvPrecedence(files, baseEnv = process.env) {
  const shellEnv = {...baseEnv};

  for (const file of files) {
    try {
      process.loadEnvFile(file);
    } catch (error) {
      // Only a missing file is optional. An unreadable one (EACCES, EISDIR)
      // must fail loudly instead of silently falling back to the next file,
      // which is normally the production origin.
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  Object.assign(process.env, shellEnv);
  return process.env;
}
