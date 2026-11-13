const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

const rules = `
# WorkManager's Room database is constructed reflectively in minified builds.
-keep class androidx.work.impl.WorkDatabase { *; }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
`;

module.exports = (config) => withDangerousMod(config, ["android", async (mod) => {
  const file = path.join(mod.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
  const content = await fs.readFile(file, "utf8");
  if (!content.includes(rules.trim())) await fs.appendFile(file, rules);
  return mod;
}]);
