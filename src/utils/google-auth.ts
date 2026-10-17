export interface SharedAccountsClient {
  initialize: () => Promise<unknown>
  storageKey: () => string
  startGoogle: () => Promise<string>
  completeGoogle: (search: string) => Promise<string>
}

export interface MountedAccountForm {
  destroy: () => void
}

interface SharedAccountsSdk {
  create: (options: { app: string; apiBase: string; brokerBase: string }) => SharedAccountsClient
  mount: (element: HTMLElement, options: { client: SharedAccountsClient; onSignedIn: () => void | Promise<void> }) => Promise<MountedAccountForm> | MountedAccountForm
}

declare global {
  interface Window {
    SharedAccounts?: SharedAccountsSdk
    __sharedAccountsScript?: Promise<SharedAccountsSdk> | null
    __memoryAuthReturn?: string
  }
}

const defaultApiBase = 'https://api.jaimegonzalezjr.com'
let clientPromise: Promise<SharedAccountsClient> | undefined

async function library(apiBase: string): Promise<SharedAccountsSdk> {
  if (window.SharedAccounts) return window.SharedAccounts
  if (!window.__sharedAccountsScript) {
    window.__sharedAccountsScript = new Promise<SharedAccountsSdk>((resolve, reject) => {
      const script = document.createElement('script')
      const timer = window.setTimeout(fail, 15_000)

      function fail() {
        window.clearTimeout(timer)
        script.remove()
        window.__sharedAccountsScript = null
        reject(new Error('Account service unavailable. Please retry.'))
      }

      script.src = `${apiBase.replace(/\/$/, '')}/auth/client.v1.js`
      script.async = true
      script.onerror = fail
      script.onload = () => {
        const sdk = window.SharedAccounts
        if (!sdk) return fail()
        window.clearTimeout(timer)
        resolve(sdk)
      }
      document.head.appendChild(script)
    })
  }
  return window.__sharedAccountsScript
}

export async function getAccounts(apiBase = defaultApiBase): Promise<SharedAccountsClient> {
  if (!clientPromise) {
    clientPromise = library(apiBase).then(async sdk => {
      const client = sdk.create({ app: 'memory', apiBase, brokerBase: apiBase })
      await client.initialize()
      return client
    }).catch((error: unknown) => {
      clientPromise = undefined
      throw error
    })
  }
  return clientPromise
}

export async function startGoogleLogin(): Promise<string> {
  return (await getAccounts()).startGoogle()
}

export async function completeGoogleLogin(search: string): Promise<string> {
  return (await getAccounts()).completeGoogle(search)
}

export async function mountAccountForm(element: HTMLElement, onSignedIn: () => void | Promise<void>): Promise<MountedAccountForm> {
  const [client, sdk] = await Promise.all([getAccounts(), library(defaultApiBase)])
  return sdk.mount(element, { client, onSignedIn })
}
