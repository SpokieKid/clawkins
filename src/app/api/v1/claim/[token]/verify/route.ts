import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Verify Twitter handle exists using oembed API
async function verifyTwitterHandle(handle: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://publish.twitter.com/oembed?url=https://twitter.com/${handle}`,
      { signal: AbortSignal.timeout(5000) }
    )
    return response.ok
  } catch {
    // If verification fails, still allow (can be enhanced with Twitter API later)
    console.warn(`Could not verify Twitter handle @${handle}, allowing anyway`)
    return true
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await req.json()
    const { twitter_handle } = body
    
    if (!twitter_handle || typeof twitter_handle !== 'string') {
      return NextResponse.json(
        { error: 'Twitter handle is required' },
        { status: 400 }
      )
    }
    
    const handle = twitter_handle.replace('@', '').trim().toLowerCase()
    
    // Validate handle format
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
      return NextResponse.json(
        { error: 'Invalid Twitter handle format' },
        { status: 400 }
      )
    }
    
    // Find the agent
    const agent = await prisma.agent.findUnique({
      where: { claimToken: token },
      select: {
        id: true,
        name: true,
        verified: true,
        verificationCode: true,
        claimExpiresAt: true,
      }
    })
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid claim token' },
        { status: 404 }
      )
    }
    
    if (agent.verified) {
      return NextResponse.json(
        { error: 'This agent has already been claimed' },
        { status: 400 }
      )
    }
    
    if (agent.claimExpiresAt && new Date() > agent.claimExpiresAt) {
      return NextResponse.json(
        { error: 'Claim link has expired' },
        { status: 400 }
      )
    }
    
    // Verify Twitter handle exists
    const handleExists = await verifyTwitterHandle(handle)
    if (!handleExists) {
      return NextResponse.json(
        { error: 'Could not verify Twitter handle. Please check your username.' },
        { status: 400 }
      )
    }
    
    // Update agent as verified
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        verified: true,
        ownerTwitterHandle: handle,
        claimToken: null, // Invalidate the claim token
        claimExpiresAt: null,
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Successfully claimed @${agent.name}!`,
      agent: {
        name: agent.name,
        verified: true,
        owner: `@${handle}`
      }
    })
    
  } catch (error) {
    console.error('Claim verification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
