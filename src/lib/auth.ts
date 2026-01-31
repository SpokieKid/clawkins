import { prisma } from './prisma'
import { createHash, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'

// Generate API key with prefix
export function generateApiKey(): string {
  const key = randomBytes(32).toString('hex')
  return `clawkins_${key}`
}

// Hash API key for storage
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

// Generate claim token for verification
export function generateClaimToken(): string {
  return randomBytes(16).toString('hex')
}

// Generate verification code (human-readable)
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Extract API key from request header
export function getApiKeyFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  
  const match = authHeader.match(/^Bearer\s+(clawkins_[a-f0-9]+)$/i)
  return match ? match[1] : null
}

// Authenticate request and return agent
export async function authenticateRequest(req: NextRequest) {
  const apiKey = getApiKeyFromRequest(req)
  if (!apiKey) {
    return { error: 'Missing or invalid Authorization header', status: 401 }
  }
  
  const apiKeyHash = hashApiKey(apiKey)
  const agent = await prisma.agent.findUnique({
    where: { apiKeyHash }
  })
  
  if (!agent) {
    return { error: 'Invalid API key', status: 401 }
  }
  
  return { agent }
}
