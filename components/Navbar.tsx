'use client'

import { User, ChevronDown, Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { getUserProfile, AVATAR_EMOJIS, type AvatarEmoji } from '@/lib/settings'
import NotificationCenter from '@/components/NotificationCenter'

export function Navbar() {
  const router = useRouter()
  const { user } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const profileData = await getUserProfile()
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile for navbar:', error)
    }
  }

  const getUserDisplay = () => {
    // Check if user has selected an emoji avatar
    if (profile?.avatar_emoji) {
      const avatarEmoji = AVATAR_EMOJIS[profile.avatar_emoji as keyof typeof AVATAR_EMOJIS]
      if (avatarEmoji) {
        return {
          display: avatarEmoji,
          isEmoji: true
        }
      }
    }

    // Fallback to initials
    const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts[1] || ''

    let initials = ''
    if (firstName && lastName) {
      initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
    } else if (firstName) {
      initials = firstName.substring(0, 2).toUpperCase()
    } else {
      initials = user?.email?.substring(0, 2).toUpperCase() || 'U'
    }

    return {
      display: initials,
      isEmoji: false
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const userDisplay = getUserDisplay()

  return (
    <header className={`sticky top-0 right-0 left-0 lg:left-64 h-20 z-20 border-b border-border ${darkMode ? 'bg-gray-900' : 'bg-background'
      }`}>
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-foreground'}`}>Dashboard</h1>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-lg transition-colors ${darkMode
              ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            title="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications */}
          <NotificationCenter />

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ${darkMode
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${userDisplay.isEmoji
                  ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-md'
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg'
                }`}>
                <span className={`${userDisplay.isEmoji
                  ? 'text-2xl'
                  : 'text-sm font-bold text-white'
                  }`}>
                  {userDisplay.display}
                </span>
              </div>
              <ChevronDown size={16} className="text-muted-foreground" />
            </button>

            {/* Profile Dropdown */}
            {showProfile && (
              <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-2 z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-card border-border'
                }`}>
                <button className={`w-full text-left px-4 py-2 transition-colors text-sm flex items-center gap-2 ${darkMode
                  ? 'text-white hover:bg-gray-700'
                  : 'text-foreground hover:bg-muted'
                  }`}>
                  <User size={16} />
                  <div>
                    <div className="font-medium">
                      {profile?.full_name || user?.user_metadata?.full_name || 'User'}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-muted-foreground'}`}>
                      {user?.email || 'No email'}
                    </div>
                  </div>
                </button>
                <button
                  className={`w-full text-left px-4 py-2 transition-colors text-sm ${darkMode
                    ? 'text-white hover:bg-gray-700'
                    : 'text-destructive hover:bg-destructive/90'
                    }`}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
