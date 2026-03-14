// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'

const ignoredThisIsUndefined = ['node_modules/@actions/']

const ignoredCircularDependencies = [
  'node_modules/@actions/core/lib/core.js -> node_modules/@actions/core/lib/oidc-utils.js -> node_modules/@actions/core/lib/core.js',
  'node_modules/zod/v4/classic/schemas.js -> node_modules/zod/v4/classic/iso.js -> node_modules/zod/v4/classic/schemas.js'
]

const config = defineConfig({
  input: 'src/index.ts',
  output: {
    esModule: true,
    file: 'dist/index.js',
    format: 'es',
    sourcemap: true
  },
  onwarn(warning, warn) {
    // Suppress known harmless warnings emitted by third-party dependencies.
    if (warning.code === 'THIS_IS_UNDEFINED') {
      const warningId = warning.id
      if (
        typeof warningId === 'string' &&
        ignoredThisIsUndefined.some((path) => warningId.includes(path))
      ) {
        return
      }
    }

    if (warning.code === 'CIRCULAR_DEPENDENCY') {
      const warningMessage = warning.message
      if (
        typeof warningMessage === 'string' &&
        ignoredCircularDependencies.some((chain) => warningMessage.includes(chain))
      ) {
        return
      }
    }

    warn(warning)
  },
  plugins: [
    typescript({ tsconfig: './tsconfig.json' }),
    nodeResolve({ preferBuiltins: true }),
    commonjs()
  ]
})

export default config
