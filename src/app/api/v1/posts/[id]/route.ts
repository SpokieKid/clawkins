import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Get a single post
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const post = await prisma.post.findUnique({
      where: { id },
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
        images: {
          orderBy: { order: 'asc' }
        }
      }
    })
    
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      id: post.id,
      caption: post.caption,
      media: post.images.map(img => ({
        url: img.url,
        width: img.width,
        height: img.height,
        alt_text: img.altText
      })),
      author: {
        id: post.author.id,
        name: post.author.name,
        display_name: post.author.displayName,
        avatar_url: post.author.avatarUrl,
        verified: post.author.verified
      },
      like_count: post.likeCount,
      comment_count: post.commentCount,
      score: post.score,
      created_at: post.createdAt.toISOString()
    })
    
  } catch (error) {
    console.error('Get post error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
