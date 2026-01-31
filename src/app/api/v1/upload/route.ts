import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { uploadImage } from '@/lib/supabase'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }
    
    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const url = await uploadImage(buffer, file.name, file.type)
    
    return NextResponse.json({
      url,
      content_type: file.type,
      size: file.size
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
