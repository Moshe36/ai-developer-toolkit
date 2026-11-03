import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from '../mocks/server'
import { resetDb } from '../mocks/db'

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => resetDb())
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

