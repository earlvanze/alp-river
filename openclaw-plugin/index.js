import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import {
  classifyWorkflowTier,
  renderWorkflowContext,
  resolveConfig,
} from "./workflow.js";

const classifyTool = {
  label: "Alp River Task Classifier",
  name: "alp_river_classify_task",
  description: "Classify a task into Alp River/OpenClaw S, M, L, or XL workflow tier and return recommended orchestration mode.",
  parameters: {
    type: "object",
    additionalProperties: false,
    properties: {
      text: { type: "string", description: "Task or prompt text to classify." },
    },
    required: ["text"],
  },
  async execute(params = {}) {
    const result = classifyWorkflowTier(params.text || "");
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
};

export default definePluginEntry({
  id: "alp-river",
  name: "Alp River Workflow",
  description: "OpenClaw adapter for Alp River staged workflow classification and prompt guidance",
  register(api) {
    const cfg = resolveConfig(api.pluginConfig);

    if (cfg.registerTool) {
      api.registerTool(() => classifyTool, { names: ["alp_river_classify_task"] });
    }

    api.on("before_prompt_build", async (event) => {
      const liveCfg = resolveConfig(api.pluginConfig);
      if (!liveCfg.enabled || !liveCfg.injectPromptContext) return undefined;

      const prompt = event?.prompt || "";
      if (!prompt || String(prompt).trim().length < 5) return undefined;

      const result = classifyWorkflowTier(prompt);
      if (liveCfg.debug) {
        api.logger.info?.(`alp-river: tier=${result.tier} mode=${result.mode}`);
      }
      return { prependContext: renderWorkflowContext(result, liveCfg.minimumRiverTier) };
    });
  },
});
