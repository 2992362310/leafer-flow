import { createBuiltinPlugins } from '@leafer-flow/builtin-plugins';
import { isTemplatePurchased, PREMIUM_TEMPLATE_ACTIONS } from './plugins/market/entitlements';

export const builtinPlugins = createBuiltinPlugins({
    canUseTemplateAction: (action) => !PREMIUM_TEMPLATE_ACTIONS.includes(action) || isTemplatePurchased(action),
});
