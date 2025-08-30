import { serve } from 'inngest/next'
import { inngest, inngestFunctions } from '~/lib/domains/agentic'

// Create the Inngest route handler
// This will handle incoming events and function execution
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
  // Optional: Add signing key for production security
  signingKey: process.env.INNGEST_SIGNING_KEY,
  // Optional: Configure the endpoint path
  servePath: '/api/inngest',
  // Optional: Add logging
  logLevel: process.env.NODE_ENV === 'development' ? 'info' : 'warn'
})