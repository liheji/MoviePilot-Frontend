import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sourcePath = new URL('../AccountSettingSystem.vue', import.meta.url)

describe('Lite system settings', () => {
  it('does not include Agent, LLM, or MCP settings', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).not.toContain('useLlmProviderDirectory')
    expect(source).not.toContain('AgentMcpSettingsDialog')
    expect(source).not.toContain('AI_AGENT_')
    expect(source).not.toContain('LLM_')
  })
})
