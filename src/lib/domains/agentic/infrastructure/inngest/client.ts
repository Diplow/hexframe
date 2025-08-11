import { Inngest } from 'inngest'

// Create the Inngest client
export const inngest = new Inngest({ 
  id: 'hexframe',
  // Use environment variables for keys in production
  eventKey: process.env.INNGEST_EVENT_KEY,
  // Inngest will automatically detect the environment
  isDev: process.env.NODE_ENV === 'development'
})