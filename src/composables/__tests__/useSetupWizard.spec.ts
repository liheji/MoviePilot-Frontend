import { useSetupWizard } from '@/composables/useSetupWizard'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', async importOriginal => ({
  ...(await importOriginal<typeof import('vue-i18n')>()),
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('vue-toastification', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

describe('Lite setup wizard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('removes the agent step and agent configuration data', () => {
    const wizard = useSetupWizard()

    expect(wizard.totalSteps).toBe(4)
    expect(wizard.stepTitles.value).not.toContain('setupWizard.agent.title')
    expect(wizard.wizardData.value).not.toHaveProperty('agent')
    expect(wizard).not.toHaveProperty('validateAgentFields')
  })
})
