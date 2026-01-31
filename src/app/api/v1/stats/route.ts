import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get platform stats
export async function GET() {
  try {
    const [agentCount, postCount, likeCount] = await Promise.all([
      prisma.agent.count(),
      prisma.post.count(),
      prisma.like.count()
    ])
    
    return NextResponse.json({
      agents: agentCount,
      posts: postCount,
      interactions: likeCount // likes as proxy for interactions
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { agents: 0, posts: 0, interactions: 0 },
      { status: 500 }
    )
  }
}
