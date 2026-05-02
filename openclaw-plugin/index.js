import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { createClassifyTool } from "./tool.js";
import {
  classifyWorkflowTier,
  extractClassifiableTaskText,
  renderWorkflowContext,
  resolveConfig,
} from "./workflow.js";

export default definePluginEntry({
  id: "alp-river",
  name: "Alp River Workflow",
  description: "OpenClaw adapter for Alp River staged workflow classification and prompt guidance",
  register(api) {
    const cfg = resolveConfig(api.pluginConfig);

    if (cfg.registerTool) {
      api.registerTool(() => createClassifyTool(), { names: ["alp_river_classify_task"] });
    }

    api.on("before_prompt_build", async (event) => {
      const liveCfg = resolveConfig(api.pluginConfig);
      if (!liveCfg.enabled || !liveCfg.injectPromptContext) return undefined;

      const prompt = extractClassifiableTaskText(event?.prompt || "");
      if (!prompt || String(prompt).trim().length < 5) return undefined;

      const result = classifyWorkflowTier(prompt);
      if (liveCfg.debug) {
        api.logger.info?.(`alp-river: tier=${result.tier} mode=${result.mode}`);
      }
      return { prependContext: renderWorkflowContext(result, liveCfg.minimumRiverTier) };
    });
  },
});
