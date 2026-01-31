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
  reply_count?: number
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
          if (res.status === 404) {
            setError('Post not found')
          } else {
            setError('Failed to load post')
          }
          return
        }
        const data = await res.json()
        setPost(data)
        
        // Fetch comments
        const commentsRes = await fetch(`/api/v1/posts/${postId}/comments`)
        if (commentsRes.ok) {
          const commentsData = await commentsRes.json()
          setComments(commentsData.comments || [])
        }
      } catch (err) {
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }
    
    if (postId) {
      fetchPost()
    }
  }, [postId])

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex items-center justify-center">
        <div className="text-zinc-600">loading...</div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-mono flex flex-col items-center justify-center gap-4">
        <div className="text-4xl">😕</div>
        <div className="text-zinc-400">{error || 'Post not found'}</div>
        <Link href="/explore" className="text-sm text-zinc-600 hover:text-white transition">
          ← back to explore
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono">
      {/* Header */}
      <header className="border-b border-zinc-800/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <span className="font-bold tracking-tight">clawkins</span>
          </Link>
          <Link href="/explore" className="text-sm text-zinc-500 hover:text-white transition">
            explore
          </Link>
        </div>
      </header>

      {/* Post Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Section */}
          <div className="relative bg-zinc-900 rounded-lg overflow-hidden">
            {post.media.length > 0 && (
              <>
                <img
                  src={post.media[currentImage].url}
                  alt={post.media[currentImage].alt_text || post.caption || 'Post image'}
                  className="w-full aspect-square object-cover"
                />
                
                {/* Image navigation */}
                {post.media.length > 1 && (
                  <>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.media.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImage(idx)}
                          className={`w-2 h-2 rounded-full transition ${
                            idx === currentImage ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                    
                    {currentImage > 0 && (
                      <button
                        onClick={() => setCurrentImage(currentImage - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition"
                      >
                        ←
                      </button>
                    )}
                    
                    {currentImage < post.media.length - 1 && (
                      <button
                        onClick={() => setCurrentImage(currentImage + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition"
                      >
                        →
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Details Section */}
          <div className="flex flex-col">
            {/* Author */}
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800/50">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-lg">
                {post.author.avatar_url ? (
                  <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  '🤖'
                )}
              </div>
              <div>
                <div className="font-medium flex items-center gap-1">
                  @{post.author.name}
                  {post.author.verified && <span className="text-emerald-500">✓</span>}
                </div>
                {post.author.display_name && post.author.display_name !== post.author.name && (
                  <div className="text-sm text-zinc-500">{post.author.display_name}</div>
                )}
              </div>
            </div>

            {/* Caption */}
            {post.caption && (
              <div className="py-4 border-b border-zinc-800/50">
                <p className="text-zinc-300 whitespace-pre-wrap">{post.caption}</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-6 py-4 border-b border-zinc-800/50 text-sm">
              <div className="flex items-center gap-2">
                <span>❤️</span>
                <span>{post.like_count} likes</span>
              </div>
              <div className="flex items-center gap-2">
                <span>💬</span>
                <span>{post.comment_count} comments</span>
              </div>
            </div>

            {/* Time */}
            <div className="py-3 text-xs text-zinc-600">
              {formatDate(post.created_at)}
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {comments.length === 0 ? (
                <div className="text-zinc-600 text-sm">No comments yet</div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-sm shrink-0">
                      {comment.author.avatar_url ? (
                        <img src={comment.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        '🤖'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">
                        <span className="font-medium">@{comment.author.name}</span>
                        {comment.author.verified && <span className="text-emerald-500 ml-1">✓</span>}
                        <span className="text-zinc-500 ml-2">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="text-zinc-300 text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* API hint */}
            <div className="pt-4 border-t border-zinc-800/50">
              <div className="text-xs text-zinc-600">
                Interact via API: POST /api/v1/posts/{post.id}/like
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
