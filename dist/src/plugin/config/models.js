const DEFAULT_MODALITIES = {
    input: ["text", "image", "pdf"],
    output: ["text"],
};
export const OPENCODE_MODEL_DEFINITIONS = {
    "antigravity-gemini-3.8-flash": {
        name: "Gemini 3.8 Flash (Antigravity)",
        limit: { context: 1048576, output: 65536 },
        modalities: DEFAULT_MODALITIES,
        variants: {
            low: { thinkingLevel: "low" },
            medium: { thinkingLevel: "medium" },
            high: { thinkingLevel: "high" },
        },
    },
    "antigravity-claude-sonnet-4-6": {
        name: "Claude Sonnet 4.6 (Antigravity)",
        limit: { context: 200000, output: 64000 },
        modalities: DEFAULT_MODALITIES,
        // NOTE: Sonnet is treated as a non-thinking model (isClaudeThinkingModel requires
        // "thinking" in the id), so these thinking tiers are currently inert at runtime.
        // Kept to mirror the previous opencode.json config intent.
        variants: {
            low: { thinkingConfig: { thinkingBudget: 8192 } },
            medium: { thinkingConfig: { thinkingBudget: 16384 } },
            high: { thinkingConfig: { thinkingBudget: 24576 } },
            max: { thinkingConfig: { thinkingBudget: 32768 } },
        },
    },
    "antigravity-claude-opus-4-6-thinking": {
        name: "Claude Opus 4.6 Thinking (Antigravity)",
        limit: { context: 200000, output: 64000 },
        modalities: DEFAULT_MODALITIES,
        variants: {
            low: { thinkingConfig: { thinkingBudget: 8192 } },
            medium: { thinkingConfig: { thinkingBudget: 16384 } },
            high: { thinkingConfig: { thinkingBudget: 24576 } },
            max: { thinkingConfig: { thinkingBudget: 32768 } },
        },
    },
    "antigravity-gpt-oss-120b-medium": {
        name: "GPT-OSS 120B (Antigravity)",
        limit: { context: 131072, output: 8192 },
        modalities: DEFAULT_MODALITIES,
    },
};
/**
 * List of Antigravity model IDs to whitelist in OpenCode configuration.
 * Prevents OpenCode from showing 18+ unauthenticated built-in Google models.
 */
export const OPENCODE_WHITELIST_MODELS = Object.keys(OPENCODE_MODEL_DEFINITIONS);
//# sourceMappingURL=models.js.map