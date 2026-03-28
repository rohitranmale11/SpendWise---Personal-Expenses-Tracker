'use client'

import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Bell,
  Moon,
  Sun,
  Smartphone,
  CreditCard,
  AlertTriangle,
  Settings as SettingsIcon,
  Check,
  X,
  LogOut,
  Shield,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Modal } from '@/components/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { useTheme } from '@/contexts/ThemeContext'
import { browserNotificationService } from '@/lib/browser-notifications'
import {
  getUserProfile,
  updateUserProfile,
  updateUserEmail,
  deleteUserAccount,
  toggleDarkMode,
  AVATAR_EMOJIS,
  type UserProfile,
  type ProfileUpdate,
  type AvatarEmoji
} from '@/lib/settings'
import { supabase } from '@/lib/supabaseClient'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const { addToast } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form states
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    avatar_emoji: '' as AvatarEmoji | ''
  })

  // Modal states
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [emailPassword, setEmailPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    budget_alerts_enabled: true,
    expense_reminders_enabled: true,
    email_notifications_enabled: false,
    push_notifications_enabled: false
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const profileData = await getUserProfile()

      if (profileData) {
        setProfile(profileData)
        setFormData({
          full_name: profileData.full_name || '',
          email: profileData.email || user?.email || '',
          avatar_emoji: (profileData.avatar_emoji as AvatarEmoji) || ''
        })
        setNotificationSettings({
          budget_alerts_enabled: profileData.budget_alerts_enabled ?? true,
          expense_reminders_enabled: profileData.expense_reminders_enabled ?? true,
          email_notifications_enabled: profileData.email_notifications_enabled ?? false,
          push_notifications_enabled: profileData.push_notifications_enabled ?? false
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async () => {
    if (!profile) return

    try {
      setSaving(true)

      const updates: ProfileUpdate = {
        full_name: formData.full_name || undefined,
        avatar_emoji: formData.avatar_emoji || undefined
      }

      const success = await updateUserProfile(updates)

      if (success) {
        // Update local profile state
        setProfile({ ...profile, ...updates })
        setIsEditingProfile(false)
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your profile has been updated successfully'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update profile. Please try again.'
        })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'An unexpected error occurred'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleEmailUpdate = async () => {
    try {
      setSaving(true)

      const result = await updateUserEmail(formData.email, emailPassword)

      setEmailModalOpen(false)
      setEmailPassword('')

      addToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Email Updated' : 'Update Failed',
        message: result.message
      })

      if (result.success) {
        // Reload profile to get updated email
        await loadProfile()
      }
    } catch (error) {
      console.error('Error updating email:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'An unexpected error occurred'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationSettingUpdate = async (setting: keyof typeof notificationSettings, value: boolean) => {
    if (!profile) return

    try {
      const updates = { [setting]: value }
      const success = await updateUserProfile(updates)

      if (success) {
        setNotificationSettings(prev => ({ ...prev, [setting]: value }))
        setProfile({ ...profile, ...updates })

        addToast({
          type: 'success',
          title: 'Settings Updated',
          message: 'Your notification preferences have been saved'
        })
      }
    } catch (error) {
      console.error('Error updating notification settings:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update notification settings'
      })
    }
  }

  const handleDarkModeToggle = async () => {
    if (!profile) return

    try {
      // Use theme context toggleDarkMode (no parameters) and update profile separately
      toggleDarkMode()

      // Update profile to persist the setting
      await updateUserProfile({ dark_mode_enabled: !darkMode })

      addToast({
        type: 'success',
        title: 'Theme Updated',
        message: `Dark mode ${!darkMode ? 'enabled' : 'disabled'}`
      })
    } catch (error) {
      console.error('Error toggling dark mode:', error)
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update theme preference'
      })
    }
  }

  const handleBrowserNotificationPermission = async () => {
    try {
      const permission = await browserNotificationService.requestPermission()

      if (permission === 'granted') {
        await handleNotificationSettingUpdate('push_notifications_enabled', true)
        addToast({
          type: 'success',
          title: 'Notifications Enabled',
          message: 'Browser notifications have been enabled'
        })

        // Show test notification
        await browserNotificationService.showGeneralNotification(
          'Notifications Enabled',
          'You will now receive browser notifications for important alerts.'
        )
      } else {
        addToast({
          type: 'warning',
          title: 'Permission Denied',
          message: 'Browser notification permission was denied. You can enable it in your browser settings.'
        })
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      addToast({
        type: 'error',
        title: 'Request Failed',
        message: 'Failed to request notification permission'
      })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setSaving(true)

      const result = await deleteUserAccount(deletePassword)

      setDeleteModalOpen(false)
      setDeletePassword('')

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Account Deleted',
          message: 'Your account has been deleted successfully'
        })

        // Sign out and redirect
        await supabase.auth.signOut()
        router.push('/login')
      } else {
        addToast({
          type: 'error',
          title: 'Deletion Failed',
          message: result.message
        })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      addToast({
        type: 'error',
        title: 'Deletion Failed',
        message: 'An unexpected error occurred'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
      addToast({
        type: 'error',
        title: 'Logout Failed',
        message: 'Failed to log out. Please try again.'
      })
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        {/* Profile Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile Settings
            </h2>
            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isEditingProfile ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <div className="space-y-4">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Choose Your Avatar</label>
              <div className="grid grid-cols-4 gap-3">
                {(Object.keys(AVATAR_EMOJIS) as AvatarEmoji[]).map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setFormData({ ...formData, avatar_emoji: emoji })}
                    className={`relative group transition-all duration-200 ${formData.avatar_emoji === emoji
                      ? 'transform scale-110'
                      : 'transform scale-100 hover:scale-105'
                      }`}
                  >
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl border-3 transition-all ${formData.avatar_emoji === emoji
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg ring-2 ring-blue-200 ring-offset-2'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}>
                      {AVATAR_EMOJIS[emoji]}
                    </div>
                    <div className={`text-xs mt-2 text-center transition-all ${formData.avatar_emoji === emoji
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-500 group-hover:text-gray-700'
                      }`}>
                      {emoji.replace('_', ' ').charAt(0).toUpperCase() + emoji.replace('_', ' ').slice(1)}
                    </div>
                    {formData.avatar_emoji === emoji && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">Select an avatar to personalize your profile</p>
            </div>

            {/* Name and Email */}
            {isEditingProfile ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${profile?.avatar_emoji
                    ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-md'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg'
                    }`}>
                    <span className={`${profile?.avatar_emoji ? 'text-2xl' : 'text-sm font-bold text-white'}`}>
                      {profile?.avatar_emoji ? AVATAR_EMOJIS[profile.avatar_emoji as keyof typeof AVATAR_EMOJIS] : formData.full_name.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{profile?.full_name || 'User'}</h3>
                    <p className="text-sm text-gray-600">{profile?.email || user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setEmailModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                >
                  Update Email
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-foreground">Budget Alerts</h3>
                <p className="text-sm text-gray-600">Get notified when you exceed budget limits</p>
              </div>
              <button
                onClick={() => handleNotificationSettingUpdate('budget_alerts_enabled', !notificationSettings.budget_alerts_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.budget_alerts_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.budget_alerts_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-foreground">Expense Reminders</h3>
                <p className="text-sm text-gray-600">Reminders for recurring expenses</p>
              </div>
              <button
                onClick={() => handleNotificationSettingUpdate('expense_reminders_enabled', !notificationSettings.expense_reminders_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.expense_reminders_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.expense_reminders_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <h3 className="font-medium text-foreground">Email Notifications</h3>
                <p className="text-sm text-gray-600">Receive updates via email</p>
              </div>
              <button
                onClick={() => handleNotificationSettingUpdate('email_notifications_enabled', !notificationSettings.email_notifications_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.email_notifications_enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.email_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <h3 className="font-medium text-foreground">Push Notifications</h3>
                <p className="text-sm text-gray-600">Browser notifications for important alerts</p>
              </div>
              {browserNotificationService.isSupported() ? (
                browserNotificationService.isGranted() || notificationSettings.push_notifications_enabled ? (
                  <button
                    onClick={() => handleNotificationSettingUpdate('push_notifications_enabled', !notificationSettings.push_notifications_enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notificationSettings.push_notifications_enabled ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationSettings.push_notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                ) : (
                  <button
                    onClick={handleBrowserNotificationPermission}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Enable Notifications
                  </button>
                )
              ) : (
                <span className="text-sm text-gray-500">Not supported</span>
              )}
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Appearance
          </h2>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="font-medium text-foreground">Dark Mode</h3>
              <p className="text-sm text-gray-600">Toggle dark theme for the application</p>
            </div>
            <button
              onClick={handleDarkModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-6">
          {/* Logout */}
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium text-foreground">Logout</p>
              <p className="text-sm text-muted-foreground mt-1">Sign out from all devices</p>
            </div>
            <button onClick={handleLogout} className="button-ghost inline-flex items-center gap-2 px-4 py-2.5">
              <LogOut size={18} />
              Logout
            </button>
          </div>

          {/* Delete Account */}
          <div className="bg-red-50 rounded-lg p-4 border border-destructive/20">
            <h4 className="font-semibold text-destructive mb-2">Delete Account</h4>
            <p className="text-sm text-destructive/80 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors text-sm font-medium"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Email Update Modal */}
      <Modal isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} title="Update Email">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your current password"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setEmailModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEmailUpdate}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Updating...' : 'Update Email'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Account">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-800 font-medium">Warning</h3>
                <p className="text-red-600 text-sm">
                  This action will permanently delete your account and all associated data including:
                  expenses, categories, subscriptions, budgets, and notifications. This cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Enter your password to confirm deletion"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
