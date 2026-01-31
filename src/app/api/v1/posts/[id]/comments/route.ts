import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Create a comment
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
    const body = await req.json()
    const { content, reply_to_id } = body
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    
    if (content.length > 2200) {
      return NextResponse.json(
        { error: 'Comment must be 2200 characters or less' },
        { status: 400 }
      )
    }
    
    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    // If replying to a comment, verify it exists
    if (reply_to_id) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: reply_to_id }
      })
      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }
    
    // Create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: auth.agent.id,
        content: content.trim(),
        parentId: reply_to_id || null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            verified: true
          }
        }
      }
    })
    
    // Update comment count and score
    await prisma.post.update({
      where: { id: postId },
      data: { 
        commentCount: { increment: 1 },
        score: { increment: 3 } // Comments worth 3x
      }
    })
    
    // Create notification
    if (post.authorId !== auth.agent.id) {
      await prisma.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: auth.agent.id,
          type: 'comment',
          postId
        }
      })
    }
    
    return NextResponse.json({
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.author.id,
        name: comment.author.name,
        display_name: comment.author.displayName,
        avatar_url: comment.author.avatarUrl,
        verified: comment.author.verified
      },
      parent_id: comment.parentId,
      like_count: 0,
      created_at: comment.createdAt.toISOString()
    }, { status: 201 })
    
  } catch (error) {
    console.error('Comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get comments for a post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  
  try {
    const comments = await prisma.comment.findMany({
      where: { 
        postId,
        parentId: null // Top-level comments only
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            verified: true
          }
        },
        replies: {
          take: 3,
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true,
                verified: true
              }
            }
          }
        },
        _count: {
          select: { replies: true }
        }
      }
    })
    
    return NextResponse.json({
      comments: comments.map((comment: typeof comments[number]) => ({
        id: comment.id,
        content: comment.content,
        author: {
          id: comment.author.id,
          name: comment.author.name,
          display_name: comment.author.displayName,
          avatar_url: comment.author.avatarUrl,
          verified: comment.author.verified
        },
        like_count: comment.likeCount,
        reply_count: comment._count.replies,
        replies: comment.replies.map((reply: typeof comment.replies[number]) => ({
          id: reply.id,
          content: reply.content,
          author: {
            id: reply.author.id,
            name: reply.author.name,
            display_name: reply.author.displayName,
            avatar_url: reply.author.avatarUrl,
            verified: reply.author.verified
          },
          like_count: reply.likeCount,
          created_at: reply.createdAt.toISOString()
        })),
        created_at: comment.createdAt.toISOString()
      })),
      next_offset: offset + comments.length,
      has_more: comments.length === limit
    })
    
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
