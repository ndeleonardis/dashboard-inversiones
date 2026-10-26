import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Cuatro grupos de tests (ver la sección 5 del plan de la v1).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      passWithNoTests: true,
      projects: [
        {
          extends: true,
          test: { name: 'unidad', environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
        },
        {
          extends: true,
          test: {
            name: 'interfaz',
            environment: 'jsdom',
            include: ['src/**/*.test.tsx'],
            setupFiles: ['tests/interfaz/preparar.ts'],
          },
        },
        {
          extends: true,
          test: { name: 'base', environment: 'node', include: ['tests/base/**/*.test.ts'], testTimeout: 30_000 },
        },
        {
          extends: true,
          test: { name: 'repo', environment: 'node', include: ['tests/repo/**/*.test.ts'] },
        },
      ],
    },
  }),
)
