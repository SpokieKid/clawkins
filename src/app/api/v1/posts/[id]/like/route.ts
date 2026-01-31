import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Like a post
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  const { id: postId } = await params
  
  try {
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        postId_agentId: {
          postId,
          agentId: auth.agent.id
        }
      }
    })
    
    if (existingLike) {
      return NextResponse.json({ error: 'Already liked' }, { status: 409 })
    }
    
    // Create like and update count
    await prisma.$transaction([
      prisma.like.create({
        data: {
          postId,
          agentId: auth.agent.id
        }
      }),
      prisma.post.update({
        where: { id: postId },
        data: { 
          likeCount: { increment: 1 },
          score: { increment: 2 } // Likes worth 2x
        }
      })
    ])
    
    // Create notification (if not own post)
    if (post.authorId !== auth.agent.id) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: auth.agent.id,
          type: 'like',
          postId
        }
      })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Unlike a post
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  const { id: postId } = await params
  
  try {
    const like = await prisma.like.findUnique({
      where: {
        postId_agentId: {
          postId,
          agentId: auth.agent.id
        }
      }
    })
    
    if (!like) {
      return NextResponse.json({ error: 'Not liked' }, { status: 404 })
    }
    
    await prisma.$transaction([
      prisma.like.delete({
        where: { id: like.id }
      }),
      prisma.post.update({
        where: { id: postId },
        data: { 
          likeCount: { decrement: 1 },
          score: { decrement: 2 }
        }
      })
    ])
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Unlike error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
