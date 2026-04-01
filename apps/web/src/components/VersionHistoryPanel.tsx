'use client'

import { useEffect, useState } from 'react'
import { Bot, CheckCircle2, Clock, GitBranch, RotateCcw, Save, X } from 'lucide-react'

interface Version {
  id: string
  label: string
  description: string
  author: string
  time: string
  aiOptimized?: boolean
}

interface VersionHistoryPanelProps {
  versions?: Version[]
  loading?: boolean
  error?: string
  saving?: boolean
  onClose?: () => void
  onRestore?: (versionId: string) => void
  onSaveSnapshot?: () => void
}

export function VersionHistoryPanel({
  versions = [],
  loading = false,
  error = '',
  saving = false,
  onClose,
  onRestore,
  onSaveSnapshot,
}: VersionHistoryPanelProps) {
  const [selected, setSelected] = useState<string | null>(versions[0]?.id ?? null)
  const [restoring, setRestoring] = useState<string | null>(null)

  useEffect(() => {
    setSelected((current) => current ?? versions[0]?.id ?? null)
  }, [versions])

  const handleRestore = async (versionId: string) => {
    setRestoring(versionId)
    await onRestore?.(versionId)
    setRestoring(null)
  }

  return (
    <aside
      className="flex h-full w-[360px] max-w-full flex-shrink-0 flex-col"
      style={{
        background: 'rgba(255,252,247,0.92)',
        backdropFilter: 'blur(24px)',
        borderLeft: '1px solid var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: 'rgba(154,91,43,0.12)' }}>
            <GitBranch className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
              Version history
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
              Timeline snapshots from the live writing canvas
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
            Current state
          </p>
          <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-on-surface-variant)' }}>
            Save a fresh snapshot before major edits, or restore an earlier checkpoint when you want to roll the draft back.
          </p>
          {onSaveSnapshot && (
            <button
              type="button"
              onClick={onSaveSnapshot}
              disabled={saving}
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {saving ? <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? 'Saving snapshot...' : 'Save snapshot now'}
            </button>
          )}
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
              Loading history...
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-[24px] border border-dashed px-4 py-5 text-sm leading-6" style={{ background: '#fffdf9', borderColor: 'var(--glass-border)', color: 'var(--color-on-surface-variant)' }}>
            No saved snapshots yet. Start writing or save one manually to build a useful timeline.
          </div>
        ) : (
          <div className="relative pl-4">
            <div className="absolute bottom-3 left-[13px] top-3 w-px" style={{ background: 'rgba(154,91,43,0.16)' }} />

            <div className="space-y-4">
              {versions.map((version, index) => (
                <div key={version.id} className="relative flex gap-4">
                  <div
                    className="relative z-10 mt-2 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2"
                    style={{ background: selected === version.id ? 'var(--gradient-primary)' : '#fffdf9', borderColor: selected === version.id ? 'var(--color-primary)' : 'var(--glass-border)' }}
                  >
                    {index === 0 ? (
                      <CheckCircle2 className="h-3.5 w-3.5" style={{ color: selected === version.id ? 'white' : 'var(--color-primary)' }} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: selected === version.id ? 'white' : 'var(--color-primary)' }} />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelected(selected === version.id ? null : version.id)}
                    className="flex-1 rounded-[24px] border p-4 text-left transition-colors hover:bg-[#faf4eb]"
                    style={{ background: selected === version.id ? '#fff8f0' : '#fffdf9', borderColor: selected === version.id ? 'var(--color-primary)' : 'var(--glass-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                            {version.label}
                          </p>
                          {version.aiOptimized && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(154,91,43,0.12)', color: 'var(--color-primary)' }}>
                              <Bot className="h-2.5 w-2.5" />
                              AI
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                          <Clock className="h-3 w-3" />
                          <span>{version.time}</span>
                          <span className="opacity-40">/</span>
                          <span>{version.author}</span>
                        </div>
                      </div>
                    </div>

                    {selected === version.id && (
                      <div className="mt-3 space-y-3">
                        <p className="text-sm leading-6" style={{ color: 'var(--color-on-surface-variant)' }}>
                          {version.description}
                        </p>
                        {index === 0 ? (
                          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'rgba(47,107,79,0.1)', color: 'var(--color-secondary)' }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Latest snapshot
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRestore(version.id)
                            }}
                            disabled={restoring !== null}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ background: 'var(--gradient-primary)' }}
                          >
                            {restoring === version.id ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            {restoring === version.id ? 'Restoring...' : 'Restore this snapshot'}
                          </button>
                        )}
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--glass-border)' }}>
        <p className="text-center text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
          Snapshot history helps you recover earlier writing decisions with less stress.
        </p>
      </div>
    </aside>
  )
}
