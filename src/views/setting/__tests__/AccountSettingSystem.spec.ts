import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cwd } from 'node:process'
import { describe, expect, it } from 'vitest'

const sourcePath = resolve(cwd(), 'src/views/setting/AccountSettingSystem.vue')

describe('Lite system settings', () => {
  it('does not include Agent, LLM, or MCP settings', () => {
    const source = readFileSync(sourcePath, 'utf-8')

    expect(source).not.toContain('useLlmProviderDirectory')
    expect(source).not.toContain('AgentMcpSettingsDialog')
    expect(source).not.toContain('AI_AGENT_')
    expect(source).not.toContain('LLM_')
  })
})
