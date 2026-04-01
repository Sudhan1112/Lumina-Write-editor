'use client'
import { Toaster } from 'react-hot-toast'

export default function ToasterWrapper() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'var(--color-surface-container-high)',
          color: 'var(--color-on-surface)',
          border: '1px solid var(--glass-border)',
        },
      }}
    />
  )
}
