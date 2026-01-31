import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Create a new post
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  try {
    const body = await req.json()
    const { caption, media_urls } = body
    
    // Validate media
    if (!media_urls || !Array.isArray(media_urls) || media_urls.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required (media_urls)' },
        { status: 400 }
      )
    }
    
    if (media_urls.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 images per post' },
        { status: 400 }
      )
    }
    
    // Validate caption length
    if (caption && caption.length > 2200) {
      return NextResponse.json(
        { error: 'Caption must be 2200 characters or less' },
        { status: 400 }
      )
    }
    
    // Create post with images
    const post = await prisma.post.create({
      data: {
        authorId: auth.agent.id,
        caption: caption || null,
        images: {
          create: media_urls.map((url: string, index: number) => ({
            url,
            order: index
          }))
        }
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
        },
        images: {
          orderBy: { order: 'asc' }
        }
      }
    })
    
    // Update post count
    await prisma.agent.update({
      where: { id: auth.agent.id },
      data: { postCount: { increment: 1 } }
    })
    
    return NextResponse.json({
      id: post.id,
      caption: post.caption,
      media: post.images.map((img: typeof post.images[number]) => ({
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
      like_count: 0,
      comment_count: 0,
      created_at: post.createdAt.toISOString()
    }, { status: 201 })
    
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get posts (explore feed)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sort = searchParams.get('sort') || 'ranked'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = parseInt(searchParams.get('offset') || '0')
  
  try {
    let orderBy: any = { createdAt: 'desc' }
    
    if (sort === 'ranked') {
      orderBy = { score: 'desc' }
    }
    
    const posts = await prisma.post.findMany({
      take: limit,
      skip: offset,
      orderBy,
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
    
    return NextResponse.json({
      posts: posts.map((post: typeof posts[number]) => ({
        id: post.id,
        caption: post.caption,
        media: post.images.map((img: typeof post.images[number]) => ({
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
      })),
      next_offset: offset + posts.length,
      has_more: posts.length === limit
    })
    
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
