import { defineConfig } from '#q-app'
import { config } from 'dotenv'

// Local .env supplies defaults; explicitly exported build settings take precedence.
config({ quiet: true })

export default defineConfig(() => ({
  css: ['app.scss'],
  extras: ['roboto-font', 'material-icons'],
  build: {
    ...(process.env.BUILD_OUTPUT ? { distDir: process.env.BUILD_OUTPUT } : {}),
    allowOutsideProjectDistDir: Boolean(process.env.BUILD_OUTPUT),
    typescript: { strict: true },
    vueRouterMode: 'hash',
    publicPath: process.env.APP_BASE_PATH || '/',
    defineEnv: {
      API_BASE_URL: process.env.API_BASE_URL || 'https://api.jaimegonzalezjr.com'
    }
  },
  devServer: {
    https: false,
    port: 8080,
    open: process.env.PLAYWRIGHT !== '1'
  },
  framework: {
    config: {},
    plugins: ['Notify', 'BottomSheet', 'LocalStorage', 'Dialog']
  },
  animations: []
}))
