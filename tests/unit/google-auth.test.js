import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAccounts } from '../../src/utils/google-auth'

describe('shared Google account client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initializes the memory app against the configured API', async () => {
    const client = {
      initialize: vi.fn().mockResolvedValue(undefined)
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
