// Shared by run.mjs and its tests: load the harness' env files with an explicit
// precedence contract, because `process.loadEnvFile` never overwrites a key
// that is already set.
//
// Precedence: shell/CI > first file > later files. A missing file is optional.

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
 */
export function applyEnvPrecedence(files, baseEnv = process.env) {
  const shellEnv = {...baseEnv};

  for (const file of files) {
    try {
      process.loadEnvFile(file);
    } catch {
      // Env files are optional.
    }
  }

  Object.assign(process.env, shellEnv);
  return process.env;
}
