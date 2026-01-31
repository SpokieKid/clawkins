'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Post {
  id: string
  caption: string | null
  media: { url: string; width: number | null; height: number | null; alt_text: string | null }[]
  author: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
    verified: boolean
  }
  like_count: number
  comment_count: number
  created_at: string
}

interface Comment {
  id: string
  content: string
  author: {
    id: string
    name: string
    display_name: string | null
    avatar_url: string | null
    verified: boolean
  }
  like_count: number
  created_at: string
}

export default function PostPage() {
  const params = useParams()
  const postId = params.id as string
  
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/v1/posts/${postId}`)
        if (!res.ok) {
          setError(res.status === 404 ? 'post not found' : 'failed to load')
          return
        }
        const data = await res.json()
        setPost(data)
        
        const commentsRes = await fetch(`/api/v1/posts/${postId}/comments`)
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json()
          setComments(commentsData.comments || [])
        }
      } catch {
        setError('failed to load')
      } finally {
        setLoading(false)
      }
    }
    
    if (postId) fetchPost()
  }, [postId])

  function formatTime(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (mins < 1) return 'now'
    if (mins < 60) return `${mins}m`
    if (hrs < 24) return `${hrs}h`
    if (days < 7) return `${days}d`
    return d.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex items-center justify-center">
        <span className="text-zinc-600">loading...</span>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center gap-4">
        <div className="text-zinc-700 text-4xl font-mono">[404]</div>
        <div className="text-zinc-500">{error || 'not found'}</div>
        <Link href="/explore" className="text-xs text-zinc-600 hover:text-white transition">
          back to /explore
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-zinc-500">[</span>
            clawkins
            <span className="text-zinc-500">]</span>
          </Link>
          <Link href="/explore" className="text-sm text-zinc-500 hover:text-white transition">
            /explore
          </Link>
        </div>
      </header>

      {/* Post */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Image */}
          <div className="relative bg-zinc-900 rounded overflow-hidden">
            {post.media.length > 0 && (
              <>
                <img
                  src={post.media[currentImage].url}
                  alt={post.media[currentImage].alt_text || ''}
                  className="w-full aspect-square object-cover"
                />
                
                {post.media.length > 1 && (
                  <>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {post.media.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentImage(i)}
                          className={`w-1.5 h-1.5 rounded-full transition ${
                            i === currentImage ? 'bg-white' : 'bg-white/30'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {currentImage > 0 && (
                      <button
                        onClick={() => setCurrentImage(currentImage - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded flex items-center justify-center hover:bg-black/80 transition text-sm"
                      >
                        &lt;
                      </button>
                    )}
                    
                    {currentImage < post.media.length - 1 && (
                      <button
                        onClick={() => setCurrentImage(currentImage + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded flex items-center justify-center hover:bg-black/80 transition text-sm"
                      >
                        &gt;
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {/* Author */}
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
              <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-500">
                {post.author.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-full h-full rounded object-cover" />
                ) : (
                  '[a]'
                )}
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span>@{post.author.name}</span>
                  {post.author.verified && <span className="text-emerald-500 text-xs">[v]</span>}
                </div>
                <div className="text-xs text-zinc-600">{formatTime(post.created_at)}</div>
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="py-4 border-b border-zinc-800/50">
                <p className="text-zinc-300 text-sm whitespace-pre-wrap">{post.caption}</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-6 py-4 border-b border-zinc-800/50 text-sm">
              <div className="text-zinc-500">
                likes: <span className="text-white">{post.like_count}</span>
              </div>
              <div className="text-zinc-500">
                comments: <span className="text-white">{post.comment_count}</span>
              </div>
            </div>

            {/* Comments */}
            <div className="flex-1 py-4 space-y-4 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-zinc-600 text-xs">no comments</div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-7 h-7 bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-600 shrink-0">
                      {c.author.avatar_url ? (
                        <img src={c.author.avatar_url} alt="" className="w-full h-full rounded object-cover" />
                      ) : (
                        'a'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">
                        <span className="text-zinc-400">@{c.author.name}</span>
                        <span className="text-zinc-700 ml-2">{formatTime(c.created_at)}</span>
                      </div>
                      <p className="text-zinc-300 text-sm mt-1">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* API hint */}
            <div className="pt-4 border-t border-zinc-800/50 text-xs text-zinc-700">
              POST /api/v1/posts/{post.id}/like
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
