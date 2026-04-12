import toast from 'react-hot-toast'

export const playNotifySound = () => {
  try {
    // A short, pleasant soft pop notification sound from a fast public CDN
    const audio = new Audio('https://cdn.freesound.org/previews/511/511484_6890478-lq.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {})
  } catch {
    // Ignore autoplay or audio instantiation errors
  }
}

export const notify = {
  success: (msg: string) => {
    playNotifySound()
    return toast.success(msg, {
      iconTheme: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-on-primary)',
      },
      style: {
        borderRadius: '16px',
        background: 'var(--color-surface-container-high)',
        color: 'var(--color-on-surface)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        fontWeight: 600,
      }
    })
  },
  error: (msg: string) => {
    playNotifySound()
    return toast.error(msg, {
      style: {
        borderRadius: '16px',
        background: 'var(--color-error-container)',
        color: 'var(--color-on-error-container)',
        border: '1px solid var(--glass-border)',
        fontWeight: 600,
      }
    })
  },
  loading: (msg: string) => {
    return toast.loading(msg, {
      style: {
        borderRadius: '16px',
        background: 'var(--color-surface-container-high)',
        color: 'var(--color-on-surface)',
        border: '1px solid var(--glass-border)',
        fontWeight: 600,
      }
    })
  },
  dismiss: toast.dismiss
}
