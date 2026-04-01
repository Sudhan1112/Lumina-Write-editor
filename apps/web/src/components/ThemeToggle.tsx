'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'

interface ThemeToggleProps {
  className?: string
  size?: 'sm' | 'md'
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  const sizeClass = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`
        ${sizeClass} flex items-center justify-center rounded-xl
        transition-all duration-300 relative overflow-hidden
        border border-[var(--glass-border)]
        bg-[var(--color-surface-container)]
        hover:bg-[var(--color-surface-bright)]
        hover:border-[var(--color-primary)]
        hover:shadow-[0_0_12px_rgba(172,138,255,0.25)]
        ${className}
      `}
    >
      <span
        className={`
          transition-all duration-300 absolute
          ${isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}
        `}
      >
        <Sun className={`${iconSize} text-amber-400`} />
      </span>
      <span
        className={`
          transition-all duration-300 absolute
          ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'}
        `}
      >
        <Moon className={`${iconSize} text-[var(--color-primary)]`} />
      </span>
    </button>
  )
}
