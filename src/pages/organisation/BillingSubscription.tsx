import { useState, useEffect } from 'react';
import OrganisationLayout from '@/components/organisation/OrganisationLayout';
import { HiCreditCard, HiCheck } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function BillingSubscription() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [plans] = useState([
    {
      id: 'starter',
      name: 'Taldium Starter',
      price: 29,
      features: ['Up to 10 job postings', 'Basic analytics', 'Email support'],
    },
    {
      id: 'standard',
      name: 'Taldium Standard',
      price: 79,
      features: ['Up to 50 job postings', 'Advanced analytics', 'Priority support', 'Custom branding'],
    },
    {
      id: 'premium',
      name: 'Taldium Premium',
      price: 149,
      features: ['Unlimited job postings', 'Full analytics suite', '24/7 support', 'Custom branding', 'API access'],
    },
    {
      id: 'enterprise',
      name: 'Taldium Enterprise',
      price: 499,
      features: ['Unlimited everything', 'Dedicated account manager', 'Custom integrations', 'SLA guarantee', 'On-premise option'],
    },
  ]);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual subscription endpoint
      // Mock data for now
      setSubscription({
        plan: 'standard',
        status: 'active',
        billingCycle: 'monthly',
        nextBillingDate: '2024-02-15',
        paymentMethod: {
          type: 'card',
          last4: '4242',
        },
      });
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      // TODO: Replace with actual upgrade endpoint
      toast.success(`Upgraded to ${plans.find(p => p.id === planId)?.name}!`);
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upgrade subscription');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription?')) return;
    try {
      // TODO: Replace with actual cancel endpoint
      toast.success('Subscription cancelled successfully');
      await fetchSubscription();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    }
  };

  if (loading) {
    return (
      <OrganisationLayout>
        <div className="p-6">
          <div className="text-center text-gray-600 py-16">Loading subscription...</div>
        </div>
      </OrganisationLayout>
    );
  }

  return (
    <OrganisationLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
            <HiCreditCard className="w-6 h-6 mr-2 text-brand-600" />
            Billing Subscription
          </h1>
          <p className="text-gray-600">Manage your subscription and billing information</p>
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
              <div>
                <p className="text-sm text-gray-500 mb-1">Next Billing Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
            {subscription.paymentMethod && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Payment Method</p>
                <div className="flex items-center">
                  <HiCreditCard className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700">
                    {subscription.paymentMethod.type === 'card' ? 'Card' : subscription.paymentMethod.type} ending in {subscription.paymentMethod.last4}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Cancel Subscription
              </button>
            </div>
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = subscription?.plan === plan.id;
              const isUpgrade = subscription && ['starter', 'standard', 'premium'].includes(subscription.plan) && 
                ['standard', 'premium', 'enterprise'].includes(plan.id);
              
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl shadow-sm p-6 border-2 ${
                    isCurrentPlan ? 'border-brand-500' : 'border-gray-200'
                  }`}
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-sm text-gray-500 ml-1">/month</span>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <HiCheck className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      className={`w-full px-4 py-2 rounded-lg transition-colors ${
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
          <div className="text-center text-gray-500 py-8">
            <p>No billing history available</p>
            <p className="text-sm mt-2">Your billing history will appear here</p>
          </div>
        </div>
      </div>
    </OrganisationLayout>
  );
}

