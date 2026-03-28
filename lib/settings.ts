import { supabase } from './supabaseClient'

export interface UserProfile {
  id: string
  user_id: string
  full_name?: string
  email?: string
  avatar_emoji?: string
  dark_mode_enabled?: boolean
  budget_alerts_enabled?: boolean
  expense_reminders_enabled?: boolean
  email_notifications_enabled?: boolean
  push_notifications_enabled?: boolean
  timezone?: string
  updated_at?: string
}

export interface ProfileUpdate {
  full_name?: string
  avatar_emoji?: string
  dark_mode_enabled?: boolean
  budget_alerts_enabled?: boolean
  expense_reminders_enabled?: boolean
  email_notifications_enabled?: boolean
  push_notifications_enabled?: boolean
  timezone?: string
}

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

export const updateUserProfile = async (updates: ProfileUpdate): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user profile:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating user profile:', error)
    return false
  }
}

export const updateUserEmail = async (email: string, password: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'User not authenticated' }

    // First verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password
    })

    if (signInError) {
      return { success: false, message: 'Current password is incorrect' }
    }

    // Update email in auth
    const { error: updateError } = await supabase.auth.updateUser({
      email
    })

    if (updateError) {
      return { success: false, message: 'Failed to update email. Please try again.' }
    }

    // Update email in profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ email })
      .eq('user_id', user.id)

    if (profileError) {
      console.error('Error updating profile email:', profileError)
    }

    return { success: true, message: 'Email updated successfully. Please check your new email for verification.' }
  } catch (error) {
    console.error('Error updating email:', error)
    return { success: false, message: 'An unexpected error occurred. Please try again.' }
  }
}

export const deleteUserAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'User not authenticated' }

    // Verify password before deletion
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email || '',
      password
    })

    if (signInError) {
      return { success: false, message: 'Password verification failed' }
    }

    // Delete user-owned data first
    const deleteUserData = async () => {
      const userId = user.id

      // Delete expenses
      await supabase.from('expenses').delete().eq('user_id', userId)

      // Delete categories
      await supabase.from('categories').delete().eq('user_id', userId)

      // Delete subscriptions
      await supabase.from('subscriptions').delete().eq('user_id', userId)

      // Delete budgets
      await supabase.from('budgets').delete().eq('user_id', userId)

      // Delete notifications
      await supabase.from('notifications').delete().eq('user_id', userId)

      // Delete profile
      await supabase.from('profiles').delete().eq('user_id', userId)
    }

    await deleteUserData()

    // Delete auth user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      return { success: false, message: 'Failed to delete account. Please contact support.' }
    }

    return { success: true, message: 'Account deleted successfully.' }
  } catch (error) {
    console.error('Error deleting account:', error)
    return { success: false, message: 'An unexpected error occurred. Please try again.' }
  }
}

export const toggleDarkMode = async (enabled: boolean): Promise<boolean> => {
  try {
    const success = await updateUserProfile({ dark_mode_enabled: enabled })

    if (success) {
      // Update localStorage for immediate theme change
      if (typeof window !== 'undefined') {
        localStorage.setItem('dark-mode', enabled ? 'true' : 'false')
        // Trigger theme change
        window.dispatchEvent(new CustomEvent('theme-change', { detail: { darkMode: enabled } }))
      }
    }

    return success
  } catch (error) {
    console.error('Error toggling dark mode:', error)
    return false
  }
}

export const getDarkModePreference = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('dark-mode') === 'true'
  }
  return false
}

export const saveDarkModePreference = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dark-mode', enabled ? 'true' : 'false')
  }
}

export const AVATAR_EMOJIS = {
  male: '👨‍💼',
  female: '👩‍💼',
  neutral: '🧑‍💼',
  casual_male: '👦',
  casual_female: '👧',
  professional: '🧑‍🎓',
  creative: '🧑‍🎨',
  tech: '🧑‍💻'
} as const

export type AvatarEmoji = keyof typeof AVATAR_EMOJIS
