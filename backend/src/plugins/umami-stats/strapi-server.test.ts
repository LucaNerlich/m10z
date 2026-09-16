import {describe, expect, test, vi} from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const strapiServer = require('./strapi-server');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const routes = require('./server/routes');

// Strapi's own admin action-provider validator (validateRegisterProviderAction),
// reproduced here so a future change to the registered uid fails a fast local
// test instead of only surfacing as a boot-time crash in a deployed environment.
const STRAPI_ACTION_UID_PATTERN = /^[a-z]([a-z|.|-]+)[a-z]$/;

describe('umami-stats plugin bootstrap', () => {
    test("registers a permission action whose uid passes Strapi's own validator", async () => {
        const registerMany = vi.fn();
        const strapi = {admin: {services: {permission: {actionProvider: {registerMany}}}}};

        const plugin = strapiServer();
        await plugin.bootstrap({strapi});

        expect(registerMany).toHaveBeenCalledTimes(1);
        const [actions] = registerMany.mock.calls[0] as [Array<{uid: string; pluginName: string}>];
        expect(actions).toHaveLength(1);
        const [action] = actions;
        expect(action.uid).toMatch(STRAPI_ACTION_UID_PATTERN);
        expect(action.pluginName).toBe('umami-stats');

        // The admin route's `admin::hasPermissions` policy must reference the
        // exact same actionId Strapi computes from {pluginName, uid}: `plugin::<pluginName>.<uid>`.
        const expectedActionId = `plugin::${action.pluginName}.${action.uid}`;
        const policies = routes.admin.routes[0].config.policies as Array<string | {name: string; config: {actions: string[]}}>;
        const hasPermissionsPolicy = policies.find(
            (p): p is {name: string; config: {actions: string[]}} => typeof p === 'object' && p.name === 'admin::hasPermissions',
        );
        expect(hasPermissionsPolicy?.config.actions).toEqual([expectedActionId]);
    });
});
