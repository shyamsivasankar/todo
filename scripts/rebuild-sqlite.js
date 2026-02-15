import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

console.log('Rebuilding native modules for Electron with electron-rebuild...')
try {
  // Assuming better-sqlite3 is the only native module needing rebuild
  execSync(`npx electron-rebuild -f -w better-sqlite3`, { stdio: 'inherit', cwd: rootDir })
  console.log('✓ Native modules rebuilt successfully')
} catch (error) {
  console.error('✗ Failed to rebuild native modules:', error.message)
  process.exit(1)
}
