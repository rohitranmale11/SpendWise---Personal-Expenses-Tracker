import { Subscription } from './database'

export interface SubscriptionAlert {
  id: string
  type: 'info' | 'warning' | 'danger'
  subscriptionName: string
  price: number
  billingDate: string
  daysRemaining: number
  message: string
}

export interface SubscriptionAlertSummary {
  totalAlerts: number
  upcomingRenewalAmount: number
  renewingSoonCount: number
}

export const calculateSubscriptionAlerts = (subscriptions: Subscription[]): SubscriptionAlert[] => {
  if (!subscriptions || subscriptions.length === 0) {
    return []
  }

  const alerts: SubscriptionAlert[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Set to start of day for accurate comparison

  subscriptions.forEach((subscription) => {
    if (!subscription.next_billing_date) return

    const billingDate = new Date(subscription.next_billing_date)
    billingDate.setHours(0, 0, 0, 0) // Set to start of day for accurate comparison

    // Calculate days difference
    const timeDiff = billingDate.getTime() - today.getTime()
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))

    let alertType: SubscriptionAlert['type'] = 'info'
    let message = ''

    if (daysRemaining < 0) {
      // Overdue
      alertType = 'danger'
      message = `${subscription.name} subscription is overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) > 1 ? 's' : ''}`
    } else if (daysRemaining === 0) {
      // Due today
      alertType = 'warning'
      message = `${subscription.name} renews today`
    } else if (daysRemaining === 1) {
      // Due tomorrow
      alertType = 'warning'
      message = `${subscription.name} renews tomorrow`
    } else if (daysRemaining <= 7) {
      // Within next 7 days
      alertType = 'info'
      message = `${subscription.name} renews in ${daysRemaining} days`
    } else {
      // Beyond 7 days, don't show alert
      return
    }

    alerts.push({
      id: subscription.id,
      type: alertType,
      subscriptionName: subscription.name,
      price: subscription.price || 0,
      billingDate: subscription.next_billing_date,
      daysRemaining,
      message
    })
  })

  // Sort by urgency: overdue first, then today, then tomorrow, then upcoming
  alerts.sort((a, b) => {
    // Priority order: danger (overdue), warning (today/tomorrow), info (upcoming)
    const typePriority = { danger: 0, warning: 1, info: 2 }
    const typeDiff = typePriority[a.type] - typePriority[b.type]
    
    if (typeDiff !== 0) return typeDiff
    
    // If same type, sort by days remaining (fewer days = higher priority)
    return a.daysRemaining - b.daysRemaining
  })

  return alerts
}

export const getSubscriptionAlertSummary = (alerts: SubscriptionAlert[]): SubscriptionAlertSummary => {
  const upcomingRenewalAmount = alerts
    .filter(alert => alert.daysRemaining >= 0 && alert.daysRemaining <= 7)
    .reduce((sum, alert) => sum + alert.price, 0)

  const renewingSoonCount = alerts.filter(alert => alert.daysRemaining >= 0 && alert.daysRemaining <= 7).length

  return {
    totalAlerts: alerts.length,
    upcomingRenewalAmount,
    renewingSoonCount
  }
}

export const formatBillingDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export const getAlertIcon = (type: SubscriptionAlert['type']): string => {
  switch (type) {
    case 'danger':
      return '⚠️'
    case 'warning':
      return '🔔'
    case 'info':
    default:
      return '⏰'
  }
}

export const getAlertColorClass = (type: SubscriptionAlert['type']): string => {
  switch (type) {
    case 'danger':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'warning':
      return 'border-orange-200 bg-orange-50 text-orange-800'
    case 'info':
    default:
      return 'border-blue-200 bg-blue-50 text-blue-800'
  }
}
