import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { execSync } from 'node:child_process'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'

const getGitText = (command: string) => {
  try {
    return execSync(command, { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const tag = getGitText('git tag --points-at HEAD').split('\n').find(Boolean) ?? ''
const commitHash = getGitText('git rev-parse --short=6 HEAD')
const appVersion = tag || commitHash || 'unknown'

export default defineConfig({
  root: path.resolve(__dirname),
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  plugins: [
    vue(),
    Components({
      resolvers: [
        IconsResolver({
          prefix: 'i',
        }),
      ],
      dts: path.resolve(__dirname, 'src/components.d.ts'),
    }),
    Icons({
      compiler: 'vue3',
      autoInstall: false,
    }),
  ],
  server: {
    host: true,
    port: 8888,
    proxy: {
      '/api': 'http://localhost:8889',
      '/ws': {
        target: 'ws://localhost:8889',
        ws: true
      }
    }
  },
  build: {
    assetsInlineLimit: 10240,
    outDir: path.resolve(__dirname, '../dist/web'),
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
})
