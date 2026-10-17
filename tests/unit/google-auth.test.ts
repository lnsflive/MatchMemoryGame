import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAccounts, type SharedAccountsClient } from '../../src/utils/google-auth'

describe('shared Google account client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes the memory app against the configured API', async () => {
    const client: SharedAccountsClient = {
      initialize: vi.fn().mockResolvedValue(undefined),
      storageKey: () => 'strapi_jwt',
      startGoogle: vi.fn().mockResolvedValue('https://accounts.example.test/connect/google'),
      completeGoogle: vi.fn().mockResolvedValue('https://memory.example.test/')
    }
    const create = vi.fn().mockReturnValue(client)
    vi.stubGlobal('window', { SharedAccounts: { create } })

    await expect(getAccounts('https://accounts.example.test')).resolves.toBe(client)
    expect(create).toHaveBeenCalledWith({
      app: 'memory',
      apiBase: 'https://accounts.example.test',
      brokerBase: 'https://accounts.example.test'
    })
    expect(client.initialize).toHaveBeenCalledOnce()
  })
})
