// Se carga antes de cada test de interfaz (jsdom).
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Los tests abren la app entera, y el primero de cada archivo además la carga.
// Con todos los archivos en paralelo, el segundo de espera de fábrica queda justo.
configure({ asyncUtilTimeout: 5_000 })

afterEach(() => {
  cleanup()
  localStorage.clear()
})
