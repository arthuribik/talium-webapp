import { useState, useEffect } from 'react';
import ProfessionalLayout from '@/components/professional/ProfessionalLayout';
import { HiCheck, HiCalendar } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

export default function ProfessionalSubscription() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchPlans();
    fetchBillingHistory();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await api.get('/v1/professional/billing/plans');
      setPlans(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      toast.error('Failed to load subscription plans');
    }
  };

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const response = await api.get('/v1/professional/billing');
      setSubscription(response.data.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
      setSubscription({
        plan: 'express',
        status: 'active',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBillingHistory = async () => {
    setHistoryLoading(true);
    try {
      // For professionals, we'll use the same endpoint structure
      // This might need to be adjusted based on actual API
      const response = await api.get('/v1/professional/billing/history').catch(() => ({ data: { data: { billingHistory: [] } } }));
      setBillingHistory(response.data.data?.billingHistory || []);
    } catch (err) {
      console.error('Failed to fetch billing history:', err);
      setBillingHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      // For express plan (free), just update directly
      if (planId === 'express') {
        await api.put('/v1/professional/billing/subscription', { plan: planId });
        toast.success(`Downgraded to ${plans.find(p => p.id === planId)?.name}!`);
        await fetchSubscription();
        return;
      }

      // For paid plans, initiate payment
      const response = await api.post('/v1/professional/billing/subscription', { 
        plan: planId,
        billingCycle: 'monthly'
      });
      
      const paymentData = response.data.data;
      
      if (paymentData.paymentLink) {
        window.open(paymentData.paymentLink, '_blank');
        toast.success(`Payment initiated! Redirecting to payment page...`);
      } else {
        toast.success(`Upgraded to ${plans.find(p => p.id === planId)?.name}!`);
      }
      
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upgrade subscription');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You will be downgraded to Express Plan.')) return;
    try {
      await api.put('/v1/professional/billing/subscription', { plan: 'express' });
      toast.success('Subscription cancelled successfully. You have been downgraded to Express Plan.');
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading subscription...</div>
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription</h1>
          <p className="text-gray-600">Manage your subscription plan and billing</p>
        </div>

        {/* Current Subscription */}
        {subscription && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Plan</p>
                <p className="text-lg font-semibold text-gray-900">
                  {plans.find(p => p.id === subscription.plan)?.name || subscription.plan}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  subscription.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.status?.toUpperCase()}
                </span>
              </div>
              {subscription.renewalDate && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Renewal Date</p>
                  <p className="text-lg font-semibold text-gray-900 flex items-center">
                    <HiCalendar className="w-5 h-5 mr-2 text-gray-500" />
                    {new Date(subscription.renewalDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
            {subscription.plan !== 'express' && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan === plan.id;
              const isUpgrade = !isCurrentPlan && (plan.id !== 'express');
              
              return (
                <div
                  key={plan.id}
                  className={`border-2 rounded-xl p-6 ${
                    isCurrentPlan
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-gray-200 hover:border-brand-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    {isCurrentPlan && (
                      <span className="px-3 py-1 bg-brand-500 text-white rounded-full text-xs font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price === 0 || plan.price === '0' ? 'Free' : `$${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-600 ml-2">/{plan.billingCycle || 'month'}</span>
                    )}
                  </div>

                  {plan.description && (
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                  )}

                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center text-sm text-gray-700">
                          <HiCheck className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  {!isCurrentPlan && (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full py-2 rounded-lg font-medium transition-colors ${
                        isUpgrade
                          ? 'bg-brand-500 text-white hover:bg-brand-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {isUpgrade ? 'Upgrade' : 'Select Plan'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Billing History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Billing History</h2>
          {historyLoading ? (
            <div className="text-center text-gray-600 py-8">Loading billing history...</div>
          ) : billingHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No billing history available</p>
              <p className="text-sm mt-2">Your successful transactions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing Cycle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billingHistory.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.paymentDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">{transaction.transactionId || transaction.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">{transaction.plan}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {transaction.currency} {transaction.amount?.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 capitalize">{transaction.billingCycle || 'monthly'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <HiCheck className="w-4 h-4 mr-1" />
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ProfessionalLayout>
  );
}

