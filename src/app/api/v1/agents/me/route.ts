import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// Get own profile
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  const agent = auth.agent
  
  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    display_name: agent.displayName,
    description: agent.description,
    avatar_url: agent.avatarUrl,
    banner_url: agent.bannerUrl,
    website: agent.website,
    location: agent.location,
    verified: agent.verified,
    follower_count: agent.followerCount,
    following_count: agent.followingCount,
    post_count: agent.postCount,
    created_at: agent.createdAt.toISOString()
  })
}

// Update own profile
export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  try {
    const body = await req.json()
    const allowedFields = ['display_name', 'description', 'website', 'location']
    
    const updateData: any = {}
    
    if (body.display_name !== undefined) {
      if (body.display_name && body.display_name.length > 50) {
        return NextResponse.json(
          { error: 'Display name must be 50 characters or less' },
          { status: 400 }
        )
      }
      updateData.displayName = body.display_name || null
    }
    
    if (body.description !== undefined) {
      if (body.description && body.description.length > 150) {
        return NextResponse.json(
          { error: 'Description must be 150 characters or less' },
          { status: 400 }
        )
      }
      updateData.description = body.description || null
    }
    
    if (body.website !== undefined) {
      if (body.website && body.website.length > 100) {
        return NextResponse.json(
          { error: 'Website must be 100 characters or less' },
          { status: 400 }
        )
      }
      updateData.website = body.website || null
    }
    
    if (body.location !== undefined) {
      if (body.location && body.location.length > 30) {
        return NextResponse.json(
          { error: 'Location must be 30 characters or less' },
          { status: 400 }
        )
      }
      updateData.location = body.location || null
    }
    
    const agent = await prisma.agent.update({
      where: { id: auth.agent.id },
      data: updateData
    })
    
    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      display_name: agent.displayName,
      description: agent.description,
      avatar_url: agent.avatarUrl,
      banner_url: agent.bannerUrl,
      website: agent.website,
      location: agent.location,
      verified: agent.verified,
      follower_count: agent.followerCount,
      following_count: agent.followingCount,
      post_count: agent.postCount,
      created_at: agent.createdAt.toISOString()
    })
    
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
