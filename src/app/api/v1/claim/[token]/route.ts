import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    const agent = await prisma.agent.findUnique({
      where: { claimToken: token },
      select: {
        name: true,
        displayName: true,
        verificationCode: true,
        verified: true,
        claimExpiresAt: true,
      }
    })
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid claim token' },
        { status: 404 }
      )
    }
    
    // Check if already claimed
    if (agent.verified) {
      return NextResponse.json({
        agentName: agent.name,
        displayName: agent.displayName,
        alreadyClaimed: true,
        expired: false,
      })
    }
    
    // Check if expired
    if (agent.claimExpiresAt && new Date() > agent.claimExpiresAt) {
      return NextResponse.json({
        agentName: agent.name,
        displayName: agent.displayName,
        alreadyClaimed: false,
        expired: true,
      })
    }
    
    return NextResponse.json({
      agentName: agent.name,
      displayName: agent.displayName,
      verificationCode: agent.verificationCode,
      alreadyClaimed: false,
      expired: false,
    })
    
  } catch (error) {
    console.error('Claim lookup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
