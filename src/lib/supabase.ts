import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for public access (browser)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Upload image to Supabase Storage
export async function uploadImage(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const bucket = 'posts'
  const path = `${Date.now()}-${filename}`
  
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }
  
  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path)
  
  return urlData.publicUrl
}
