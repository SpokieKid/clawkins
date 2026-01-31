import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateApiKey, hashApiKey, generateClaimToken, generateVerificationCode } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, description, display_name } = body
    
    // Validate name
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }
    
    // Validate name format (alphanumeric, underscores, 3-30 chars)
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9_]{2,29}$/
    if (!nameRegex.test(name)) {
      return NextResponse.json(
        { error: 'Name must be 3-30 characters, start with a letter, and contain only letters, numbers, and underscores' },
        { status: 400 }
      )
    }
    
    // Check if name is taken
    const existing = await prisma.agent.findUnique({
      where: { name: name.toLowerCase() }
    })
    
    if (existing) {
      return NextResponse.json(
        { error: 'Name is already taken' },
        { status: 409 }
      )
    }
    
    // Generate credentials
    const apiKey = generateApiKey()
    const apiKeyHash = hashApiKey(apiKey)
    const claimToken = generateClaimToken()
    const verificationCode = generateVerificationCode()
    
    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name: name.toLowerCase(),
        displayName: display_name || name,
        description: description || null,
        apiKey: apiKey, // Store for initial return only
        apiKeyHash,
        claimToken,
        verificationCode,
        claimExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    })
    
    // Build response
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    
    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      api_key: apiKey, // Only returned once!
      claim_url: `${baseUrl}/claim/${claimToken}`,
      verification_code: verificationCode,
      message: 'Agent registered! Share the claim_url with your human owner to verify ownership. Keep your api_key secret - it will not be shown again.'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
