'use client'

import { Check, Loader2, MessageSquareQuote, Pencil, RotateCcw, Send, Trash2, X } from 'lucide-react'

type CommentProfile = {
  id?: string
  email?: string | null
  full_name?: string | null
  avatar_url?: string | null
}

export type CommentItem = {
  id: string
  document_id: string
  user_id: string
  content: string
  selection_text: string | null
  status: 'open' | 'resolved'
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
  author?: CommentProfile | null
  resolver?: CommentProfile | null
}

interface CommentsPanelProps {
  comments?: CommentItem[]
  loading?: boolean
  error?: string
  onClose?: () => void
  currentUserId: string
  canComment?: boolean
  canModerate?: boolean
  draft: string
  onDraftChange: (value: string) => void
  onAddComment: () => void
  adding?: boolean
  actionCommentId?: string | null
  editingCommentId?: string | null
  editDraft: string
  onEditDraftChange: (value: string) => void
  onStartEdit: (comment: CommentItem) => void
  onCancelEdit: () => void
  onSaveEdit: () => void
  onToggleStatus: (comment: CommentItem) => void
  onDelete: (commentId: string) => void
}

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} min ago`
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} hr ago`
  return `${Math.max(1, Math.floor(diff / day))} day ago`
}

function profileLabel(profile: CommentProfile | null | undefined, fallback = 'Unknown user') {
  return profile?.full_name || profile?.email || fallback
}

export function CommentsPanel({
  comments = [],
  loading = false,
  error = '',
  onClose,
  currentUserId,
  canComment = false,
  canModerate = false,
  draft,
  onDraftChange,
  onAddComment,
  adding = false,
  actionCommentId = null,
  editingCommentId = null,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleStatus,
  onDelete,
}: CommentsPanelProps) {
  return (
    <aside
      className="flex h-full w-[380px] max-w-full flex-shrink-0 flex-col"
      style={{
        background: 'rgba(255,252,247,0.92)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(154,91,43,0.12)' }}>
            <MessageSquareQuote className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
              Comments
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
              Discuss changes without editing body text
            </p>
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-[#f5ede2]">
            <X className="h-4 w-4" style={{ color: 'var(--color-on-surface-variant)' }} />
          </button>
        )}
      </div>

      <div className="border-b px-4 py-4" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="rounded-[24px] border p-4" style={{ background: '#fffdf9', borderColor: 'var(--glass-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-on-surface-variant)' }}>
            New comment
          </p>
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            disabled={!canComment || adding}
            placeholder={canComment ? 'Add a comment for collaborators...' : 'Your role is read-only for comments.'}
            className="mt-3 h-28 w-full resize-none rounded-2xl border bg-[#fffdfa] p-3 text-sm leading-6 text-[#201a13] outline-none disabled:cursor-not-allowed disabled:opacity-75"
            style={{ borderColor: 'var(--glass-border)' }}
          />
          <p className="mt-2 text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
            {draft.trim().length}/2000
          </p>
          <button
            type="button"
            onClick={onAddComment}
            disabled={!canComment || adding || !draft.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {adding ? 'Posting...' : 'Post comment'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error && (
          <div className="mb-4 rounded-[20px] border px-4 py-3 text-sm" style={{ background: '#fff4f1', borderColor: '#f2d4cd', color: '#a33a2b' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
              <div className="h-4 w-4 animate-spin rounded-full border border-[var(--color-primary)] border-t-transparent" />
              Loading comments...
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-[24px] border border-dashed px-4 py-5 text-sm leading-6" style={{ background: '#fffdf9', borderColor: 'var(--glass-border)', color: 'var(--color-on-surface-variant)' }}>
            No comments yet. Start the review thread here.
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const isAuthor = comment.user_id === currentUserId
              const isActionPending = actionCommentId === comment.id
              const canEdit = isAuthor && comment.status === 'open'
              const canDelete = canModerate || isAuthor
              const canToggleStatus =
                comment.status === 'open' ? canComment : canModerate || isAuthor

              return (
                <div
                  key={comment.id}
                  className="rounded-[22px] border p-4"
                  style={{
                    background: comment.status === 'resolved' ? '#f8f4ec' : '#fffdf9',
                    borderColor: comment.status === 'resolved' ? '#e7dac8' : 'var(--glass-border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {comment.author?.avatar_url ? (
                        <img
                          src={comment.author.avatar_url}
                          alt=""
                          className="h-9 w-9 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f2e5d3] text-xs font-semibold text-[#9a5b2b]">
                          {profileLabel(comment.author, 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#201a13]">{profileLabel(comment.author)}</p>
                        <p className="text-[11px] text-[#6f6254]">{formatRelativeTime(comment.created_at)}</p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                      style={{
                        background: comment.status === 'resolved' ? 'rgba(47,107,79,0.12)' : 'rgba(154,91,43,0.1)',
                        color: comment.status === 'resolved' ? '#2f6b4f' : '#9a5b2b',
                      }}
                    >
                      {comment.status}
                    </span>
                  </div>

                  {comment.selection_text && (
                    <div className="mt-3 rounded-2xl border px-3 py-2 text-xs italic text-[#6f6254]" style={{ borderColor: 'var(--glass-border)', background: '#faf5ee' }}>
                      &ldquo;{comment.selection_text}&rdquo;
                    </div>
                  )}

                  {editingCommentId === comment.id ? (
                    <div className="mt-3">
                      <textarea
                        value={editDraft}
                        onChange={(event) => onEditDraftChange(event.target.value)}
                        className="h-24 w-full resize-none rounded-2xl border bg-[#fffdfa] p-3 text-sm leading-6 text-[#201a13] outline-none"
                        style={{ borderColor: 'var(--glass-border)' }}
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={onSaveEdit}
                          disabled={isActionPending || !editDraft.trim()}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ background: 'var(--gradient-primary)' }}
                        >
                          {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEdit}
                          disabled={isActionPending}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold text-[#6f6254] transition-colors hover:bg-[#f5ede2] disabled:cursor-not-allowed disabled:opacity-70"
                          style={{ borderColor: 'var(--glass-border)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#201a13]">{comment.content}</p>
                  )}

                  {comment.status === 'resolved' && comment.resolved_at && (
                    <p className="mt-2 text-[11px] text-[#6f6254]">
                      Resolved {formatRelativeTime(comment.resolved_at)}
                      {comment.resolver ? ` by ${profileLabel(comment.resolver)}` : ''}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {canToggleStatus && (
                      <button
                        type="button"
                        onClick={() => onToggleStatus(comment)}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[#f5ede2] disabled:cursor-not-allowed disabled:opacity-70"
                        style={{ borderColor: 'var(--glass-border)', color: '#6f6254' }}
                      >
                        {isActionPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : comment.status === 'open' ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        {comment.status === 'open' ? 'Resolve' : 'Reopen'}
                      </button>
                    )}

                    {canEdit && editingCommentId !== comment.id && (
                      <button
                        type="button"
                        onClick={() => onStartEdit(comment)}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[#f5ede2] disabled:cursor-not-allowed disabled:opacity-70"
                        style={{ borderColor: 'var(--glass-border)', color: '#6f6254' }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(comment.id)}
                        disabled={isActionPending}
                        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[#fff0ed] disabled:cursor-not-allowed disabled:opacity-70"
                        style={{ borderColor: '#e8c8c1', color: '#a33a2b' }}
                      >
                        {isActionPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}
