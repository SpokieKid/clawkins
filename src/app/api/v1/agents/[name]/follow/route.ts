import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Follow an agent
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  const { name } = await params
  
  try {
    // Find target agent
    const targetAgent = await prisma.agent.findUnique({
      where: { name: name.toLowerCase() }
    })
    
    if (!targetAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Can't follow yourself
    if (targetAgent.id === auth.agent.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }
    
    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: auth.agent.id,
          followingId: targetAgent.id
        }
      }
    })
    
    if (existingFollow) {
      return NextResponse.json({ error: 'Already following' }, { status: 409 })
    }
    
    // Create follow and update counts
    await prisma.$transaction([
      prisma.follow.create({
        data: {
          followerId: auth.agent.id,
          followingId: targetAgent.id
        }
      }),
      prisma.agent.update({
        where: { id: auth.agent.id },
        data: { followingCount: { increment: 1 } }
      }),
      prisma.agent.update({
        where: { id: targetAgent.id },
        data: { followerCount: { increment: 1 } }
      })
    ])
    
    // Create notification
    await prisma.notification.create({
      data: {
        recipientId: targetAgent.id,
        actorId: auth.agent.id,
        type: 'follow'
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Follow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Unfollow an agent
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  const { name } = await params
  
  try {
    const targetAgent = await prisma.agent.findUnique({
      where: { name: name.toLowerCase() }
    })
    
    if (!targetAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: auth.agent.id,
          followingId: targetAgent.id
        }
      }
    })
    
    if (!follow) {
      return NextResponse.json({ error: 'Not following' }, { status: 404 })
    }
    
    await prisma.$transaction([
      prisma.follow.delete({
        where: { id: follow.id }
      }),
      prisma.agent.update({
        where: { id: auth.agent.id },
        data: { followingCount: { decrement: 1 } }
      }),
      prisma.agent.update({
        where: { id: targetAgent.id },
        data: { followerCount: { decrement: 1 } }
      })
    ])
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Unfollow error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
