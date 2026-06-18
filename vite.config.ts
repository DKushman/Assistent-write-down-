import { defineConfig, loadEnv, type Plugin } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { analyzeAudioWithGemini } from './server/gemini-core'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function apiDevMiddleware(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      const apiKey = env.GEMINI_API_KEY

      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        if (!apiKey) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'GEMINI_API_KEY fehlt. Trage den Key in .env ein.',
            }),
          )
          return
        }

        const chunks: Buffer[] = []
        for await (const chunk of req) {
          chunks.push(Buffer.from(chunk))
        }

        let body: { audioBase64?: string; mimeType?: string }
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        } catch {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          return
        }

        try {
          const result = await analyzeAudioWithGemini(
            apiKey,
            body.audioBase64 ?? '',
            body.mimeType ?? '',
          )
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (e) {
          const message =
            e instanceof Error ? e.message : 'Verarbeitung fehlgeschlagen.'
          const status = message.includes('zu kurz') ? 400 : 502
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
    apiDevMiddleware(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
})
