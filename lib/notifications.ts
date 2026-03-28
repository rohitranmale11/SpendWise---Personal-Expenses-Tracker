import { supabase } from './supabaseClient'

export interface Notification {
  id: string
  user_id: string
  type: 'subscription_due_today' | 'subscription_due_tomorrow' | 'subscription_upcoming' | 'subscription_overdue' | 'budget_alert' | 'ai_insight' | 'general'
  title: string
  message: string
  is_read: boolean
  related_id?: string
  created_at: string
  updated_at: string
}

export interface NotificationStats {
  total: number
  unread: number
}

export const getNotifications = async (limit: number = 50): Promise<Notification[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }
}

export const getUnreadNotificationsCount = async (): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }
}

export const createNotification = async (
  type: Notification['type'],
  title: string,
  message: string,
  relatedId?: string
): Promise<Notification | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Check if similar notification already exists to prevent duplicates
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', type)
      .eq('related_id', relatedId)
      .eq('is_read', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .limit(1)

    if (existing && existing.length > 0) {
      console.log('Similar notification already exists, skipping creation')
      return null
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        related_id: relatedId
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

export const markAllNotificationsAsRead = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

export const deleteNotification = async (notificationId: string): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting notification:', error)
    return false
  }
}

export const syncSubscriptionNotifications = async (subscriptions: any[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (const subscription of subscriptions) {
      if (!subscription.next_billing_date) continue

      const billingDate = new Date(subscription.next_billing_date)
      billingDate.setHours(0, 0, 0, 0)

      const timeDiff = billingDate.getTime() - today.getTime()
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

      let notificationType: Notification['type'] | null = null
      let title = ''
      let message = ''

      if (daysRemaining < 0) {
        // Overdue
        notificationType = 'subscription_overdue'
        title = `${subscription.name} Overdue`
        message = `Your ${subscription.name} subscription is overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) > 1 ? 's' : ''}. Amount: ₹${subscription.price || 0}`
      } else if (daysRemaining === 0) {
        // Due today
        notificationType = 'subscription_due_today'
        title = `${subscription.name} Due Today`
        message = `Your ${subscription.name} subscription renews today. Amount: ₹${subscription.price || 0}`
      } else if (daysRemaining === 1) {
        // Due tomorrow
        notificationType = 'subscription_due_tomorrow'
        title = `${subscription.name} Due Tomorrow`
        message = `Your ${subscription.name} subscription renews tomorrow. Amount: ₹${subscription.price || 0}`
      } else if (daysRemaining <= 7) {
        // Upcoming
        notificationType = 'subscription_upcoming'
        title = `${subscription.name} Upcoming`
        message = `Your ${subscription.name} subscription renews in ${daysRemaining} days. Amount: ₹${subscription.price || 0}`
      }

      if (notificationType) {
        await createNotification(notificationType, title, message, subscription.id)
      }
    }
  } catch (error) {
    console.error('Error syncing subscription notifications:', error)
  }
}

export const getNotificationIcon = (type: Notification['type']): string => {
  switch (type) {
    case 'subscription_due_today':
    case 'subscription_due_tomorrow':
      return '🔔'
    case 'subscription_upcoming':
      return '⏰'
    case 'subscription_overdue':
      return '⚠️'
    case 'budget_alert':
      return '💰'
    case 'ai_insight':
      return '🤖'
    case 'general':
    default:
      return '📢'
  }
}

export const getNotificationColor = (type: Notification['type']): string => {
  switch (type) {
    case 'subscription_due_today':
    case 'subscription_due_tomorrow':
      return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'subscription_upcoming':
      return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'subscription_overdue':
      return 'text-red-600 bg-red-50 border-red-200'
    case 'budget_alert':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'ai_insight':
      return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'general':
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export const formatNotificationTime = (createdAt: string): string => {
  const now = new Date()
  const created = new Date(createdAt)
  const diffInMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) {
    return 'Just now'
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  } else if (diffInMinutes < 1440) { // 24 hours
    const hours = Math.floor(diffInMinutes / 60)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInMinutes / 1440)
    if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`
    } else {
      return created.toLocaleDateString()
    }
  }
}
