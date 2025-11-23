/**
 * Example: Single Source of Truth Pattern for Multi-Schema Synchronization
 *
 * This file demonstrates the pattern discussed in local-vs-global-coherence.md.
 * A single Zod schema serves as the source of truth, with helper functions
 * transforming it into various representations needed by different parts of the system.
 *
 * Key transformations:
 * - Validation schema (Zod) → Form defaults
 * - Validation schema → AI prompt (natural language)
 * - Validation schema → Runtime format (GameSetup)
 * - Validation schema → CopilotKit parameters (form UI)
 * - Validation schema → JSON Schema (OpenAPI/documentation)
 *
 * Maintenance burden: When adding/modifying fields, all transformation functions
 * must be updated to maintain synchronization.
 */

import { z } from 'zod';

// Core metric options
export const zCoreMetric = z.enum([
  'Quality',
  'Speed',
  'Cost',
  'Innovation',
  'Reliability',
  'Security',
  'User Satisfaction',
  'Other',
]);

// Stakeholder schema
export const zStakeholder = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().min(2, 'Role is required'),
  priorities: z.string().min(5, 'Priorities required'),
  constraints: z.string().optional().default(''),
});

// SINGLE SOURCE OF TRUTH: Main form validation schema
export const zCustomScenarioForm = z.object({
  scenarioTitle: z.string().min(3, 'Title is required'),
  scenarioDescription: z.string().min(10, 'Description is required'),
  coreMetric: zCoreMetric,
  stakeholders: z.array(zStakeholder).min(0).max(6),
  maxRounds: z.union([z.number().int().min(3).max(10), z.literal('')]).optional().default(''),
  comments: z.record(z.string()).optional().default({}),
});

export type CustomScenarioForm = z.infer<typeof zCustomScenarioForm>;

// Default form values
export function createDefaultForm(): CustomScenarioForm {
  return {
    scenarioTitle: '',
    scenarioDescription: '',
    coreMetric: 'Quality',
    stakeholders: [],
    maxRounds: '',
    comments: {},
  };
}

// Transform to AI prompt (natural language representation)
export function compileToPrompt(form: CustomScenarioForm): string {
  const parts = [
    `Scenario: ${form.scenarioTitle}`,
    `Description: ${form.scenarioDescription}`,
    `Core Metric: ${form.coreMetric}`,
    '',
    'Stakeholders:',
    ...form.stakeholders.map(s =>
      `- ${s.name} (${s.role}): ${s.priorities}${s.constraints ? ` | Constraints: ${s.constraints}` : ''}`
    ),
  ];

  if (form.maxRounds && typeof form.maxRounds === 'number') {
    parts.push('', `Maximum Rounds: ${form.maxRounds}`);
  }

  return parts.join('\n');
}

// Transform to runtime format (internal application schema)
export function toGameSetup(form: CustomScenarioForm): GameSetup {
  return {
    title: form.scenarioTitle,
    description: form.scenarioDescription,
    metric: form.coreMetric,
    actors: form.stakeholders.map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      objectives: s.priorities,
      limitations: s.constraints || undefined,
    })),
    rounds: typeof form.maxRounds === 'number' ? form.maxRounds : 5,
  };
}

// Transform to CopilotKit parameters (form UI schema)
export function zodToCopilotParameters(schema: typeof zCustomScenarioForm) {
  return [
    {
      name: 'scenarioTitle',
      type: 'string',
      description: 'Title of the scenario',
      required: true,
    },
    {
      name: 'scenarioDescription',
      type: 'string',
      description: 'Detailed description of the scenario',
      required: true,
    },
    {
      name: 'coreMetric',
      type: 'string',
      description: 'Primary metric to optimize',
      enum: ['Quality', 'Speed', 'Cost', 'Innovation', 'Reliability', 'Security', 'User Satisfaction', 'Other'],
      required: true,
    },
    {
      name: 'stakeholders',
      type: 'array',
      description: 'List of stakeholders involved',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Stakeholder name' },
          role: { type: 'string', description: 'Stakeholder role' },
          priorities: { type: 'string', description: 'Key priorities' },
          constraints: { type: 'string', description: 'Constraints or limitations' },
        },
      },
    },
    {
      name: 'maxRounds',
      type: 'number',
      description: 'Maximum number of negotiation rounds',
      required: false,
    },
  ];
}

// Minimal JSON Schema for documentation/validation
export const minimalCustomScenarioJsonSchema = {
  type: 'object',
  properties: {
    scenarioTitle: { type: 'string', minLength: 3 },
    scenarioDescription: { type: 'string', minLength: 10 },
    coreMetric: {
      type: 'string',
      enum: ['Quality', 'Speed', 'Cost', 'Innovation', 'Reliability', 'Security', 'User Satisfaction', 'Other']
    },
    stakeholders: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 2 },
          role: { type: 'string', minLength: 2 },
          priorities: { type: 'string', minLength: 5 },
          constraints: { type: 'string' },
        },
        required: ['id', 'name', 'role', 'priorities'],
      },
    },
    maxRounds: {
      type: ['number', 'string'],
      minimum: 3,
      maximum: 10,
    },
  },
  required: ['scenarioTitle', 'scenarioDescription', 'coreMetric', 'stakeholders'],
};

// Runtime format (different from form schema)
interface GameSetup {
  title: string;
  description: string;
  metric: string;
  actors: Array<{
    id: string;
    name: string;
    role: string;
    objectives: string;
    limitations?: string;
  }>;
  rounds: number;
}
