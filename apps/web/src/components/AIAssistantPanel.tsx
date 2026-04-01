'use client'

import { useState } from 'react'
import { Bot, ChevronDown, ChevronUp, Sparkles, X, Zap } from 'lucide-react'

interface Message {
  role: 'ai' | 'user'
  text: string
}

interface AIAssistantPanelProps {
  documentTitle?: string
  onClose?: () => void
}

const PROMPT_LIBRARY = [
  { title: 'Clarify the argument', desc: 'Tighten structure, remove repetition, and improve the throughline.' },
  { title: 'Turn notes into prose', desc: 'Convert rough bullets into polished narrative writing.' },
  { title: 'Executive summary', desc: 'Condense the draft into a crisp high-level summary.' },
]

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'ai',
    text: 'I am ready to help shape this draft. I can rewrite sections, tighten the flow, or turn notes into a clearer narrative.',
  },
]

export function AIAssistantPanel({ documentTitle, onClose }: AIAssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'ask' | 'library'>('chat')
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [libraryExpanded, setLibraryExpanded] = useState(true)

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: input },
      {
        role: 'ai',
        text: `Working on: "${input}". I can refine tone, sharpen structure, or draft a stronger next section from here.`,
      },
    ])
    setInput('')
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
            <Bot className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
              Lumina AI
            </p>
            {documentTitle && (
              <p className="text-[11px]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Working with {documentTitle}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-full p-2 transition-colors hover:bg-[#f5ede2]">
            <X className="h-4 w-4" style={{ color: 'var(--color-on-surface-variant)' }} />
          </button>
        )}
      </div>

      <div className="flex gap-1 p-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        {(['chat', 'ask', 'library'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              background: activeTab === tab ? 'rgba(154,91,43,0.12)' : 'transparent',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
            }}
          >
            {tab === 'chat' ? 'Chat' : tab === 'ask' ? 'Quick asks' : 'Library'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold" style={{ background: 'rgba(154,91,43,0.1)', color: 'var(--color-primary)' }}>
          <Zap className="h-3.5 w-3.5" />
          Context-aware writing help is active
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <div className="rounded-[22px] border p-4" style={{ background: '#fffdf9', borderColor: 'var(--glass-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Assistant mode
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: 'var(--color-on-surface-variant)' }}>
                Lumina AI responds best when you ask for a goal: rewrite, summarize, expand, or reshape the structure.
              </p>
            </div>

            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[88%] rounded-[22px] px-4 py-3 text-sm leading-6"
                  style={{
                    background: message.role === 'ai' ? '#fffdf9' : 'var(--gradient-primary)',
                    color: message.role === 'ai' ? 'var(--color-on-surface)' : 'white',
                    border: message.role === 'ai' ? '1px solid var(--glass-border)' : 'none',
                  }}
                >
                  {message.role === 'ai' && (
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-primary)' }}>
                        Lumina AI
                      </span>
                    </div>
                  )}
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ask' && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-on-surface-variant)' }}>
              Suggested prompts
            </p>
            {[
              'Summarize this draft in three bullets',
              'Make the tone more professional',
              'Spot weak transitions between sections',
              'Propose a stronger outline',
            ].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => { setInput(suggestion); setActiveTab('chat') }}
                className="flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left text-sm transition-colors hover:bg-[#faf4eb]"
                style={{ borderColor: 'var(--glass-border)', background: '#fffdf9', color: 'var(--color-on-surface)' }}
              >
                <Sparkles className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: 'var(--color-on-surface-variant)' }}>
                Prompt library
              </p>
              <button type="button" onClick={() => setLibraryExpanded((value) => !value)} className="rounded-full p-1.5 transition-colors hover:bg-[#f5ede2]">
                {libraryExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5" style={{ color: 'var(--color-on-surface-variant)' }} />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--color-on-surface-variant)' }} />
                )}
              </button>
            </div>

            {libraryExpanded && PROMPT_LIBRARY.map((prompt) => (
              <button
                key={prompt.title}
                type="button"
                onClick={() => { setInput(prompt.desc); setActiveTab('chat') }}
                className="w-full rounded-[22px] border p-4 text-left transition-colors hover:bg-[#faf4eb]"
                style={{ background: '#fffdf9', borderColor: 'var(--glass-border)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>
                  {prompt.title}
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {prompt.desc}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t p-4" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="flex items-center gap-3 rounded-[22px] border px-4 py-3" style={{ background: '#fffdf9', borderColor: 'var(--glass-border)' }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
            placeholder="Message Lumina AI..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--color-on-surface)' }}
          />
          <button type="button" onClick={sendMessage} disabled={!input.trim()} className="rounded-full p-2 transition-opacity disabled:opacity-40">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
          </button>
        </div>
      </div>
    </aside>
  )
}
