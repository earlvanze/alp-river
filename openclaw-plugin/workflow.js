export const TIER_ORDER = ["S", "M", "L", "XL"];

export const WORKFLOW_MODES = Object.freeze({
  S: "direct-execute-verify",
  M: "preflight-execute-review",
  L: "clarify-plan-challenge-implement-review",
  XL: "multi-approach-plan-approval-specialist-fanout",
});

export const RECOMMENDED_AGENTS = Object.freeze({
  S: [],
  M: ["reuse-scanner", "test-verifier", "acceptance-reviewer"],
  L: [
    "researcher",
    "reuse-scanner",
    "planner",
    "plan-challenger",
    "implementer",
    "test-verifier",
    "correctness-reviewer",
    "quality-reviewer",
    "acceptance-reviewer",
  ],
  XL: [
    "researcher",
    "reuse-scanner",
    "requirements-clarifier",
    "planner",
    "plan-challenger",
    "implementer",
    "test-verifier",
    "correctness-reviewer",
    "quality-reviewer",
    "security-reviewer",
    "acceptance-reviewer",
  ],
});

export function resolveConfig(raw = {}) {
  const cfg = raw && typeof raw === "object" ? raw : {};
  return {
    enabled: cfg.enabled !== false,
    minimumRiverTier: TIER_ORDER.includes(cfg.minimumRiverTier) ? cfg.minimumRiverTier : "M",
    injectPromptContext: cfg.injectPromptContext !== false,
    registerTool: cfg.registerTool !== false,
    debug: cfg.debug === true,
  };
}

export function classifyWorkflowTier(text = "") {
  const raw = String(text || "");
  const low = raw.toLowerCase();
  const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
  let score = 0;
  const reasons = [];
  const add = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  if (words >= 30) add(1, "longer_prompt");
  if (words >= 120) add(1, "long_prompt");
  if (/\b(code|repo|api|test|build|deploy|integration|automation|database|service|workflow)\b/.test(low)) add(1, "multi_step");
  if (/\b(figure out|design|strategy|plan|investigate|research|ambiguous|unknown)\b/.test(low)) add(1, "ambiguity");
  if (/\b(security|secret|credential|auth|permission|payment|financial|bank|legal|contract|tenant|guest|reservation|property|production|migration|delete|destructive)\b/.test(low)) add(2, "risk");
  if (/\b(architecture|multi-system|platform|plugin|framework|all repos|company-wide|business-critical|launch|end-to-end)\b/.test(low)) add(3, "xl_scope");
  if ((low.match(/\band\b/g) || []).length >= 2) add(2, "multiple_conjoined_tasks");

  const tier = score >= 7 ? "XL" : score >= 5 ? "L" : score >= 2 ? "M" : "S";
  return {
    tier,
    mode: WORKFLOW_MODES[tier],
    recommendedAgents: [...RECOMMENDED_AGENTS[tier]],
    score,
    reasons: reasons.slice(0, 12),
  };
}

export function shouldUseRiver(tier, minimumTier = "M") {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minimumTier);
}

export function renderWorkflowContext(result, minimumTier = "M") {
  const river = shouldUseRiver(result.tier, minimumTier);
  return [
    "## Alp River Workflow Advisory",
    `- Classified workflow tier: ${result.tier}`,
    `- Recommended mode: ${result.mode}`,
    `- River workflow active: ${river ? "yes" : "no"}`,
    result.recommendedAgents.length
      ? `- Recommended specialist roles: ${result.recommendedAgents.join(", ")}`
      : "- Recommended specialist roles: none",
    "- OpenClaw remains the orchestrator. Do not spawn external/cloud subagents with secrets.",
    "- Local SECURITY.md, AGENTS.md, SOUL.md, USER.md, and tool policy override upstream Alp River defaults.",
  ].join("\n");
}
