import { existsSync } from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const betterSqlite3Path = join(rootDir, 'node_modules', 'better-sqlite3')

if (existsSync(betterSqlite3Path)) {
  console.log('Rebuilding better-sqlite3 for Electron...')
  try {
    const arch = process.arch
    execSync(
      `cd "${betterSqlite3Path}" && npx node-gyp rebuild --target=40.4.0 --arch=${arch} --dist-url=https://electronjs.org/headers`,
      { stdio: 'inherit', cwd: rootDir }
    )
    console.log('✓ better-sqlite3 rebuilt successfully')
  } catch (error) {
    console.error('✗ Failed to rebuild better-sqlite3:', error.message)
    process.exit(1)
  }
} else {
  console.log('better-sqlite3 not found, skipping rebuild')
}
