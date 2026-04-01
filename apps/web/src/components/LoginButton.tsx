'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

import { Loader2 } from 'lucide-react'

export function LoginButton({ onClick, loading }: { onClick?: () => Promise<void>; loading?: boolean }) {
  const supabase = createClient()

  const handleLogin = async () => {
    if (onClick) {
      await onClick()
      return
    }
    const redirectTo = `${window.location.origin}/auth/callback`
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })
  }

  return (
    <Button onClick={handleLogin} disabled={loading} className="w-full flex items-center justify-center gap-2" size="lg">
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <img src="/brand/google.svg" alt="Google" className="h-5 w-5" />
      )}
      Sign in with Google
    </Button>
  )
}
