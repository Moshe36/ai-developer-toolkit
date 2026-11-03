import { createRoot } from 'react-dom/client'
import { App } from './App'

async function start() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  }
  createRoot(document.getElementById('root')!).render(<App />)
}

start()

