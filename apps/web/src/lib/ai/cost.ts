interface ModelPricing {
  inputCentsPerMillion: number
  outputCentsPerMillion: number
}

interface AiBudgetConfig {
  monthlyCapCents: number
  jobCapCents: number
}

const defaultPricing: Record<string, ModelPricing> = {
  'gpt-5.4-mini': { inputCentsPerMillion: 75, outputCentsPerMillion: 450 },
  'gpt-5.4-nano': { inputCentsPerMillion: 20, outputCentsPerMillion: 125 },
  'gpt-5.4': { inputCentsPerMillion: 250, outputCentsPerMillion: 1500 },
}

function readPositiveNumber(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getAiBudgetConfig(
  env: Record<string, string | undefined> = process.env,
): AiBudgetConfig {
  return {
    monthlyCapCents: readPositiveNumber(env.TACK_AI_MONTHLY_CAP_CENTS, 500),
    jobCapCents: readPositiveNumber(env.TACK_AI_JOB_CAP_CENTS, 100),
  }
}

export function getModelPricing(
  model: string,
  env: Record<string, string | undefined> = process.env,
): ModelPricing {
  const fallback = defaultPricing[model] ?? defaultPricing['gpt-5.4-mini']
  return {
    inputCentsPerMillion: readPositiveNumber(
      env.TACK_AI_INPUT_COST_PER_1M_CENTS,
      fallback.inputCentsPerMillion,
    ),
    outputCentsPerMillion: readPositiveNumber(
      env.TACK_AI_OUTPUT_COST_PER_1M_CENTS,
      fallback.outputCentsPerMillion,
    ),
  }
}

export function estimateTokensFromText(text: string): number {
  return Math.ceil(text.length / 4)
}

export function calculateRunCostCents(args: {
  model: string
  inputTokens: number
  outputTokens: number
  env?: Record<string, string | undefined>
}): number {
  const pricing = getModelPricing(args.model, args.env)
  const inputCost =
    (args.inputTokens / 1_000_000) * pricing.inputCentsPerMillion
  const outputCost =
    (args.outputTokens / 1_000_000) * pricing.outputCentsPerMillion
  return Number((inputCost + outputCost).toFixed(4))
}

export function canStartAiRun(args: {
  currentMonthCostCents: number
  estimatedJobCostCents: number
  budget: AiBudgetConfig
}): { ok: true } | { ok: false; reason: string } {
  if (args.estimatedJobCostCents > args.budget.jobCapCents) {
    return {
      ok: false,
      reason: `Estimated AI cost exceeds the per-job cap (${args.budget.jobCapCents} cents).`,
    }
  }

  if (
    args.currentMonthCostCents + args.estimatedJobCostCents >
    args.budget.monthlyCapCents
  ) {
    return {
      ok: false,
      reason: `Estimated AI cost exceeds the monthly project cap (${args.budget.monthlyCapCents} cents).`,
    }
  }

  return { ok: true }
}
