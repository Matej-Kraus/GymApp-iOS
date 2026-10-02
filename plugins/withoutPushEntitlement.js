const { withEntitlementsPlist } = require('@expo/config-plugins')

// Free Apple Developer account nepodporuje Push Notifications entitlement.
// Tento plugin ho odstraní z vygenerovaného entitlements souboru při každém prebuild.
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment']
    return c
  })
}
