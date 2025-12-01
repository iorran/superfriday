import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Get build metadata
function getBuildInfo() {
  try {
    // Cloudflare Pages provides these environment variables
    const commitSha = process.env.CF_PAGES_COMMIT_SHA || 
                      process.env.GITHUB_SHA || 
                      (() => {
                        try {
                          return execSync('git rev-parse HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
                        } catch {
                          return null
                        }
                      })() || 
                      'dev'
    
    const buildDate = new Date().toISOString()
    
    const branch = process.env.CF_PAGES_BRANCH || 
                   (process.env.GITHUB_REF?.startsWith('refs/heads/') ? process.env.GITHUB_REF.replace('refs/heads/', '') : null) ||
                   (() => {
                     try {
                       return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
                     } catch {
                       return null
                     }
                   })() || 
                   'local'
    
    // Build number: use CF_PAGES (set to "1" during Pages builds) or GitHub run number or timestamp
    const buildNumber = process.env.CF_PAGES === '1' ? 
                        (process.env.CF_PAGES_COMMIT_SHA?.substring(0, 7) || Date.now().toString()) :
                        (process.env.GITHUB_RUN_NUMBER || Date.now().toString())
    
    return {
      commitSha: commitSha || 'dev',
      buildDate,
      branch: branch || 'local',
      buildNumber: buildNumber || '0',
    }
  } catch (error) {
    // Fallback if anything fails
    return {
      commitSha: 'dev',
      buildDate: new Date().toISOString(),
      branch: 'local',
      buildNumber: '0',
    }
  }
}

const buildInfo = getBuildInfo()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_COMMIT_SHA': JSON.stringify(buildInfo.commitSha),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildInfo.buildDate),
    'import.meta.env.VITE_BUILD_BRANCH': JSON.stringify(buildInfo.branch),
    'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(buildInfo.buildNumber),
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // Proxy /api requests to Wrangler dev server when running locally
        // If Wrangler is not running, fetch will fail and fall back to localStorage mock
        // In production (Cloudflare Pages), /api routes are handled by Pages Functions automatically
      },
    },
  },
})
