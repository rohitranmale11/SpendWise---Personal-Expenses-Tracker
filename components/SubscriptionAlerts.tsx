'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Calendar, CreditCard } from 'lucide-react'
import { getSubscriptions } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import {
  calculateSubscriptionAlerts,
  getSubscriptionAlertSummary,
  formatBillingDate,
  getAlertIcon,
  getAlertColorClass,
  type SubscriptionAlert,
  type SubscriptionAlertSummary
} from '@/lib/subscription-alerts'
import {
  createNotification,
  syncSubscriptionNotifications,
  type Notification
} from '@/lib/notifications'
import { browserNotificationService } from '@/lib/browser-notifications'
import { DashboardCard } from '@/components/DashboardCard'

export default function SubscriptionAlerts() {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [alerts, setAlerts] = useState<SubscriptionAlert[]>([])
  const [summary, setSummary] = useState<SubscriptionAlertSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSubscriptionAlerts()
    }
  }, [user])

  const loadSubscriptionAlerts = async () => {
    try {
      setLoading(true)

      // Fetch subscriptions for the logged in user
      const subscriptions = await getSubscriptions()

      // Calculate alerts from subscriptions
      const calculatedAlerts = calculateSubscriptionAlerts(subscriptions)
      const alertSummary = getSubscriptionAlertSummary(calculatedAlerts)

      setAlerts(calculatedAlerts)
      setSummary(alertSummary)

      // Sync notifications with subscription alerts
      await syncSubscriptionNotifications(subscriptions)

      // Create browser notifications for new important alerts
      if (browserNotificationService.isGranted()) {
        for (const alert of calculatedAlerts) {
          if (alert.type === 'danger' || alert.type === 'warning') {
            const notificationType = alert.daysRemaining < 0 ? 'overdue' :
              alert.daysRemaining === 0 ? 'due_today' :
                alert.daysRemaining === 1 ? 'due_tomorrow' : 'upcoming'

            await browserNotificationService.showSubscriptionNotification(
              alert.subscriptionName,
              alert.message,
              notificationType
            )
          }
        }
      }

    } catch (error) {
      console.error('Error loading subscription alerts:', error)
      setAlerts([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }

  const getAlertIconComponent = (type: SubscriptionAlert['type']) => {
    switch (type) {
      case 'danger':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <Calendar className="w-4 h-4 text-orange-600" />
      case 'info':
      default:
        return <CreditCard className="w-4 h-4 text-blue-600" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardCard title="Upcoming Subscription Alerts" subtitle="Track your subscription renewals">
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No upcoming renewals</h3>
            <p className="text-muted-foreground text-sm">
              All your subscriptions are up to date. No renewals due in the next 7 days.
            </p>
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">
                <strong>✅ Good news:</strong> You won't have any subscription renewals to worry about this week!
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Upcoming Subscription Alerts</h2>
          <p className="text-muted-foreground">Track your subscription renewals</p>
        </div>
        {summary && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{summary.totalAlerts} alert{summary.totalAlerts !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              <span>{formatCurrency(summary.upcomingRenewalAmount)} due this week</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${getAlertColorClass(alert.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {getAlertIconComponent(alert.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm truncate" title={alert.subscriptionName}>
                    {alert.subscriptionName}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${alert.type === 'danger' ? 'bg-red-100 text-red-800' :
                    alert.type === 'warning' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                    {alert.type === 'danger' ? 'Overdue' :
                      alert.type === 'warning' ? 'Due Soon' :
                        'Upcoming'}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Amount:</span>
                    <span className="font-semibold">{formatCurrency(alert.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Billing Date:</span>
                    <span className="font-semibold">{formatBillingDate(alert.billingDate)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Days:</span>
                    <span className="font-semibold">
                      {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)} overdue` :
                        alert.daysRemaining === 0 ? 'Today' :
                          alert.daysRemaining === 1 ? 'Tomorrow' :
                            `${alert.daysRemaining} days`}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-current/20">
                  <p className="text-xs leading-relaxed">
                    <span className="mr-1">{getAlertIcon(alert.type)}</span>
                    {alert.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Card */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <DashboardCard title="Total Alerts" subtitle="Active notifications">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-foreground mb-1">{summary.totalAlerts}</div>
              <div className="text-sm text-muted-foreground">
                {summary.totalAlerts === 1 ? 'Alert' : 'Alerts'}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Renewing Soon" subtitle="Next 7 days">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-orange-600 mb-1">{summary.renewingSoonCount}</div>
              <div className="text-sm text-muted-foreground">
                {summary.renewingSoonCount === 1 ? 'Subscription' : 'Subscriptions'}
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Total Due" subtitle="This week">
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {formatCurrency(summary.upcomingRenewalAmount)}
              </div>
              <div className="text-sm text-muted-foreground">
                Total renewals
              </div>
            </div>
          </DashboardCard>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-800 text-sm">
          <strong>💡 Tip:</strong> Keep track of your subscription renewals to avoid unexpected charges. Consider canceling unused subscriptions to save money.
        </p>
      </div>
    </div>
  )
}
