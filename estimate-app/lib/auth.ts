import { supabase } from './supabase'

export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      shouldCreateUser: true
    },
  })

  if (error) {
    console.error('Magic Link error:', error)
    throw error
  }
  
  console.log('Magic Link sent:', data)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    throw error
  }
  
  return user
}