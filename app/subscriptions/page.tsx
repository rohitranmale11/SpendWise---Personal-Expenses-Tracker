'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { Modal } from '@/components/Modal'
import { StatCard } from '@/components/StatCard'
import { useState, useEffect } from 'react'
import { Plus, Trash2, AlertCircle, Calendar, Edit2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { getSubscriptions, addSubscription, updateSubscription, deleteSubscription } from '@/lib/database'

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    billing_cycle: 'monthly' as 'monthly' | 'yearly' | 'weekly',
    next_billing_date: new Date().toISOString().split('T')[0]
  })
  const [editingSubscription, setEditingSubscription] = useState<any>(null)

  useEffect(() => {
    if (user) {
      loadSubscriptions()
    }
  }, [user])

  const loadSubscriptions = async () => {
    try {
      setLoading(true)
      const data = await getSubscriptions()
      setSubscriptions(data)
    } catch (error) {
      console.error('Error loading subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingSubscription) {
        await updateSubscription(editingSubscription.id, {
          ...formData,
          price: parseFloat(formData.price)
        })
        setEditModalOpen(false)
        setEditingSubscription(null)
      } else {
        await addSubscription({
          ...formData,
          price: parseFloat(formData.price)
        })
        setIsModalOpen(false)
      }

      setFormData({
        name: '',
        price: '',
        billing_cycle: 'monthly',
        next_billing_date: new Date().toISOString().split('T')[0]
      })
      await loadSubscriptions()
    } catch (error) {
      console.error('Error saving subscription:', error)
      alert('Error saving subscription. Please try again.')
    }
  }

  const handleEdit = (subscription: any) => {
    setEditingSubscription(subscription)
    setFormData({
      name: subscription.name,
      price: subscription.price.toString(),
      billing_cycle: subscription.billing_cycle,
      next_billing_date: subscription.next_billing_date
    })
    setEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this subscription?')) {
      try {
        await deleteSubscription(id)
        await loadSubscriptions()
      } catch (error) {
        console.error('Error deleting subscription:', error)
        alert('Error deleting subscription. Please try again.')
      }
    }
  }

  const activeSubscriptions = subscriptions // All subscriptions are considered active
  const monthlyTotal = activeSubscriptions
    .filter(s => s.billing_cycle === 'monthly')
    .reduce((sum, s) => sum + s.price, 0)
  const yearlyTotal = activeSubscriptions
    .filter(s => s.billing_cycle === 'yearly')
    .reduce((sum, s) => sum + s.price, 0)

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700'
      case 'paused':
        return 'bg-yellow-100 text-yellow-700'
      case 'cancelled':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-green-100 text-green-700' // Default to active since status field doesn't exist
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">Subscriptions</h1>
            <p className="text-muted-foreground">Manage your recurring payments</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="button-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <Plus size={20} />
            Add Subscription
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Monthly Total"
            value={formatCurrency(monthlyTotal)}
            change={0}
            trend="up"
            icon={<Calendar className="w-5 h-5" />}
          />
          <StatCard
            title="Yearly Total"
            value={formatCurrency(yearlyTotal)}
            change={0}
            trend="up"
            icon={<AlertCircle className="w-5 h-5" />}
          />
        </div>

        {/* Subscriptions List */}
        {subscriptions.length > 0 ? (
          <div className="bg-card border border-border rounded-lg">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">All Subscriptions</h2>
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {subscription.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{subscription.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(subscription.price)} / {subscription.billing_cycle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
                      >
                        Active
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(subscription)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(subscription.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No subscriptions yet</p>
            <p className="text-muted-foreground">Add your first subscription to start tracking recurring payments</p>
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Subscription"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subscription Name</label>
            <input
              type="text"
              placeholder="e.g., Netflix"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-premium w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Price</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="input-premium w-full"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Billing Cycle</label>
            <select
              value={formData.billing_cycle}
              onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as any })}
              className="input-premium w-full"
              required
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Next Billing Date</label>
            <input
              type="date"
              value={formData.next_billing_date}
              onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
              className="input-premium w-full"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="button-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary flex-1"
            >
              Add Subscription
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Subscription Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setEditingSubscription(null)
        }}
        title="Edit Subscription"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Subscription Name</label>
            <input
              type="text"
              placeholder="e.g., Netflix"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-premium w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Price</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="input-premium w-full"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Billing Cycle</label>
            <select
              value={formData.billing_cycle}
              onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value as any })}
              className="input-premium w-full"
              required
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Next Billing Date</label>
            <input
              type="date"
              value={formData.next_billing_date}
              onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
              className="input-premium w-full"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false)
                setEditingSubscription(null)
              }}
              className="button-ghost flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary flex-1"
            >
              Update Subscription
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
