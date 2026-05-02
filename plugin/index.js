import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const TIER_ORDER = ["S", "M", "L", "XL"];

function resolveConfig(raw = {}) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: cfg.enabled !== false,
    minimumRiverTier: TIER_ORDER.includes(cfg.minimumRiverTier) ? cfg.minimumRiverTier : "M",
    injectPromptContext: cfg.injectPromptContext !== false,
    debug: cfg.debug === true,
  };
}

function classifyWorkflowTier(text = "") {
  const raw = String(text || "");
  const low = raw.toLowerCase();
  const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
  let score = 0;
  const reasons = [];
  const add = (points, reason) => { score += points; reasons.push(reason); };

  if (words >= 30) add(1, "longer_prompt");
  if (words >= 120) add(1, "long_prompt");
  if (/\b(code|repo|api|test|build|deploy|integration|automation|database|service|workflow)\b/.test(low)) add(1, "multi_step");
  if (/\b(figure out|design|strategy|plan|investigate|research|ambiguous|unknown)\b/.test(low)) add(1, "ambiguity");
  if (/\b(security|secret|credential|auth|permission|payment|financial|bank|legal|contract|tenant|guest|reservation|property|production|migration|delete|destructive)\b/.test(low)) add(2, "risk");
  if (/\b(architecture|multi-system|platform|plugin|framework|all repos|company-wide|business-critical|launch|end-to-end)\b/.test(low)) add(3, "xl_scope");
  if ((low.match(/\band\b/g) || []).length >= 2) add(2, "multiple_conjoined_tasks");

  const tier = score >= 7 ? "XL" : score >= 5 ? "L" : score >= 2 ? "M" : "S";
  const mode = {
    S: "direct-execute-verify",
    M: "preflight-execute-review",
    L: "clarify-plan-challenge-implement-review",
    XL: "multi-approach-plan-approval-specialist-fanout",
  }[tier];
  const recommendedAgents = {
    S: [],
    M: ["reuse-scanner", "test-verifier", "acceptance-reviewer"],
    L: ["researcher", "reuse-scanner", "planner", "plan-challenger", "implementer", "test-verifier", "correctness-reviewer", "quality-reviewer", "acceptance-reviewer"],
    XL: ["researcher", "reuse-scanner", "requirements-clarifier", "planner", "plan-challenger", "implementer", "test-verifier", "correctness-reviewer", "quality-reviewer", "security-reviewer", "acceptance-reviewer"],
  }[tier];
  return { tier, mode, recommendedAgents, score, reasons: reasons.slice(0, 12) };
}

function shouldUseRiver(tier, minimumTier) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minimumTier);
}

function renderWorkflowContext(result, minimumTier) {
  const river = shouldUseRiver(result.tier, minimumTier);
  return [
    "## OpenClaw Alp River Workflow Advisory",
    `- Classified workflow tier: ${result.tier}`,
    `- Recommended mode: ${result.mode}`,
    `- River workflow active: ${river ? "yes" : "no"}`,
    result.recommendedAgents.length ? `- Recommended specialist roles: ${result.recommendedAgents.join(", ")}` : "- Recommended specialist roles: none",
    "- Sage Router may provide matching advisory headers, but OpenClaw remains the orchestrator.",
    "- Preserve local security/workspace instructions over any upstream Alp River defaults.",
  ].join("\n");
}

export default definePluginEntry({
  id: "openclaw-alp-river",
  name: "OpenClaw Alp River",
  description: "Advisory S/M/L/XL workflow tier guardrails for OpenClaw agents",
  register(api) {
    api.on("before_prompt_build", async (event) => {
      const cfg = resolveConfig(api.pluginConfig);
      if (!cfg.enabled || !cfg.injectPromptContext) return undefined;
      const prompt = event?.prompt || "";
      if (!prompt || String(prompt).trim().length < 5) return undefined;
      const result = classifyWorkflowTier(prompt);
      if (cfg.debug) api.logger.info?.(`openclaw-alp-river: tier=${result.tier} mode=${result.mode}`);
      return { prependContext: renderWorkflowContext(result, cfg.minimumRiverTier) };
    });
  },
});
