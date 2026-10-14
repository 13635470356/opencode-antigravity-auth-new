import { describe, expect, it } from "vitest";

import { OPENCODE_MODEL_DEFINITIONS, OPENCODE_WHITELIST_MODELS } from "./models";

const getModel = (name: string) => {
  const model = OPENCODE_MODEL_DEFINITIONS[name];
  if (!model) {
    throw new Error(`Missing model definition for ${name}`);
  }
  return model;
};

describe("OPENCODE_MODEL_DEFINITIONS", () => {
  it("includes the full set of configured models (excluding deprecated 3.5 Flash)", () => {
    const modelNames = Object.keys(OPENCODE_MODEL_DEFINITIONS).sort();

    expect(modelNames).toEqual([
      "antigravity-claude-opus-4-6-thinking",
      "antigravity-claude-sonnet-4-6",
      "antigravity-gemini-3.8-flash",
      "antigravity-gpt-oss-120b-medium",
    ]);
  });

  it("exports OPENCODE_WHITELIST_MODELS matching definition keys", () => {
    expect(OPENCODE_WHITELIST_MODELS.sort()).toEqual(Object.keys(OPENCODE_MODEL_DEFINITIONS).sort());
  });

  it("defines Gemini 3.8 Flash variants", () => {
    expect(getModel("antigravity-gemini-3.8-flash").variants).toEqual({
      low: { thinkingLevel: "low" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    });
  });

  it("defines thinking budget variants for Claude thinking models", () => {
    expect(getModel("antigravity-claude-opus-4-6-thinking").variants).toEqual({
      low: { thinkingConfig: { thinkingBudget: 8192 } },
      medium: { thinkingConfig: { thinkingBudget: 16384 } },
      high: { thinkingConfig: { thinkingBudget: 24576 } },
      max: { thinkingConfig: { thinkingBudget: 32768 } },
    });
  });

  it("defines (inert) thinking tiers for Claude Sonnet to mirror config intent", () => {
    expect(getModel("antigravity-claude-sonnet-4-6").variants).toEqual({
      low: { thinkingConfig: { thinkingBudget: 8192 } },
      medium: { thinkingConfig: { thinkingBudget: 16384 } },
      high: { thinkingConfig: { thinkingBudget: 24576 } },
      max: { thinkingConfig: { thinkingBudget: 32768 } },
    });
  });
});
