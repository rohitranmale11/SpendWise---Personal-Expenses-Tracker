export interface BrowserNotificationOptions {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  requireInteraction?: boolean
}

export class BrowserNotificationService {
  private static instance: BrowserNotificationService
  private permission: NotificationPermission = 'default'

  private constructor() {
    this.permission = 'default'
    this.checkPermission()
  }

  public static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService()
    }
    return BrowserNotificationService.instance
  }

  private checkPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Browser notifications not supported')
      return 'denied'
    }

    try {
      const permission = await Notification.requestPermission()
      this.permission = permission
      return permission
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }

  public getPermission(): NotificationPermission {
    return this.permission
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window
  }

  public isGranted(): boolean {
    return this.permission === 'granted'
  }

  public async showNotification(options: BrowserNotificationOptions): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Browser notifications not supported')
      return false
    }

    if (!this.isGranted()) {
      console.warn('Notification permission not granted')
      return false
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false
      })

      // Auto-close notification after 5 seconds unless interaction is required
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      // Handle click events
      notification.onclick = () => {
        notification.close()
        // Focus on the window if possible
        if (window.focus) {
          window.focus()
        }
      }

      return true
    } catch (error) {
      console.error('Error showing browser notification:', error)
      return false
    }
  }

  public async showSubscriptionNotification(
    subscriptionName: string,
    message: string,
    type: 'due_today' | 'due_tomorrow' | 'upcoming' | 'overdue'
  ): Promise<boolean> {
    const urgency = type === 'overdue' || type === 'due_today'
    
    return this.showNotification({
      title: `${subscriptionName} - ${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      body: message,
      tag: `subscription-${subscriptionName}-${type}`,
      requireInteraction: urgency
    })
  }

  public async showGeneralNotification(title: string, message: string): Promise<boolean> {
    return this.showNotification({
      title,
      body: message,
      tag: `general-${Date.now()}`,
      requireInteraction: false
    })
  }

  // Store permission preference in localStorage
  public savePermissionPreference(preferred: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-preference', preferred ? 'granted' : 'denied')
    }
  }

  public getPermissionPreference(): boolean | null {
    if (typeof window !== 'undefined') {
      const preference = localStorage.getItem('notification-preference')
      return preference === 'granted' ? true : preference === 'denied' ? false : null
    }
    return null
  }

  public clearPermissionPreference(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('notification-preference')
    }
  }
}

// Export singleton instance
export const browserNotificationService = BrowserNotificationService.getInstance()
