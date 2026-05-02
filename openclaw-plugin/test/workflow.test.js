import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyWorkflowTier,
  renderWorkflowContext,
  shouldUseRiver,
} from "../workflow.js";

test("classifies tiny task as S", () => {
  const result = classifyWorkflowTier("rename this file");
  assert.equal(result.tier, "S");
  assert.equal(result.mode, "direct-execute-verify");
});

test("classifies implementation task as at least M", () => {
  const result = classifyWorkflowTier("Add tests and update the API workflow for the production deployment");
  assert.ok(["M", "L", "XL"].includes(result.tier));
  assert.ok(result.recommendedAgents.includes("test-verifier"));
});

test("classifies platform/plugin architecture risk as XL", () => {
  const result = classifyWorkflowTier("Design a plugin architecture for multi-system OpenClaw workflow orchestration with security review and specialist fan-out");
  assert.equal(result.tier, "XL");
  assert.ok(result.recommendedAgents.includes("security-reviewer"));
});

test("river activation respects configured minimum tier", () => {
  assert.equal(shouldUseRiver("S", "M"), false);
  assert.equal(shouldUseRiver("M", "M"), true);
  assert.equal(shouldUseRiver("XL", "L"), true);
});

test("renders prompt context", () => {
  const result = classifyWorkflowTier("Build a production API integration and tests");
  const context = renderWorkflowContext(result, "M");
  assert.match(context, /Alp River Workflow Advisory/);
  assert.match(context, /Classified workflow tier:/);
});
