import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  HiBell,
  HiGlobe,
  HiUsers,
  HiShieldCheck,
  HiCreditCard,
  HiInformationCircle,
  HiCheckCircle,
  HiX,
  HiPlus,
} from 'react-icons/hi';
import { api } from '@/services/api';
import logo from '@/assets/logo.svg';
import { APP_DESCRIPTION, APP_NAME } from '@/constants/app';

type SettingsTab = 'general' | 'users' | 'verification' | 'billing';
type UsersSubTab = 'admin-users' | 'role-management';
type BillingSubTab = 'professional' | 'organisation';

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [usersSubTab, setUsersSubTab] = useState<UsersSubTab>('admin-users');
  const [billingSubTab, setBillingSubTab] = useState<BillingSubTab>('professional');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isPlanDrawerOpen, setIsPlanDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [professionalPlans, setProfessionalPlans] = useState<any[]>([]);
  const [organisationPlans, setOrganisationPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planSaveLoading, setPlanSaveLoading] = useState(false);
  const [settings, setSettings] = useState({
    // General - About App
    appName: APP_NAME,
    appDescription: APP_DESCRIPTION,
    appVersion: '1.0.0',
    appLogo: logo,
    
    // General - Notifications
    emailNotifications: true,
    pushNotifications: true,
    systemAlerts: true,
    
    // General - Language & Timezone
    language: 'en',
    timezone: 'UTC',
    
    // Verification Providers - Feature Toggles
    youverifyEnabled: true,
    manualVerificationEnabled: true,
    autoVerificationEnabled: false,
  });

  const [adminUsers] = useState([
    { id: '1', name: 'Admin User', email: 'admin@taldium.com', role: 'super_admin', status: 'active' },
    { id: '2', name: 'Support User', email: 'support@taldium.com', role: 'support', status: 'active' },
  ]);

  const [adminFormData, setAdminFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'admin',
  });
  const [adminFormLoading, setAdminFormLoading] = useState(false);

  const [roles, setRoles] = useState([
    {
      id: '1',
      title: 'Super Admin',
      description: 'Full system access, can manage all admins and settings',
      permissions: {
        viewAllUsers: true,
        manageUsers: true,
        systemSettings: true,
        billingManagement: true,
        postJobs: true,
        viewProfessionalEntities: true,
        viewOrganisationEntities: true,
        manageOrgProfile: true,
        manageOwnProfile: true,
        suspendOrganisation: true,
        activateOrganisation: true,
        createOrganisation: true,
        createProfessional: true,
        approveEducationalVerification: true,
        approveWorkExperienceVerification: true,
        approveIDVerification: true,
        activateProfessional: true,
        updateBusinessSubscription: true,
      },
    },
    {
      id: '2',
      title: 'Admin',
      description: 'Can manage users, organisations, and professionals',
      permissions: {
        viewAllUsers: true,
        manageUsers: true,
        systemSettings: false,
        billingManagement: false,
        postJobs: true,
        viewProfessionalEntities: true,
        viewOrganisationEntities: true,
        manageOrgProfile: true,
        manageOwnProfile: true,
        suspendOrganisation: true,
        activateOrganisation: true,
        createOrganisation: false,
        createProfessional: false,
        approveEducationalVerification: true,
        approveWorkExperienceVerification: true,
        approveIDVerification: true,
        activateProfessional: true,
        updateBusinessSubscription: false,
      },
    },
    {
      id: '3',
      title: 'Support',
      description: 'Can assist users and handle support requests',
      permissions: {
        viewAllUsers: true,
        manageUsers: false,
        systemSettings: false,
        billingManagement: false,
        postJobs: false,
        viewProfessionalEntities: true,
        viewOrganisationEntities: true,
        manageOrgProfile: false,
        manageOwnProfile: true,
        suspendOrganisation: false,
        activateOrganisation: false,
        createOrganisation: false,
        createProfessional: false,
        approveEducationalVerification: false,
        approveWorkExperienceVerification: false,
        approveIDVerification: false,
        activateProfessional: false,
        updateBusinessSubscription: false,
      },
    },
    {
      id: '4',
      title: 'Auditor',
      description: 'Read-only access for auditing and reporting',
      permissions: {
        viewAllUsers: true,
        manageUsers: false,
        systemSettings: false,
        billingManagement: false,
        postJobs: false,
        viewProfessionalEntities: true,
        viewOrganisationEntities: true,
        manageOrgProfile: false,
        manageOwnProfile: true,
        suspendOrganisation: false,
        activateOrganisation: false,
        createOrganisation: false,
        createProfessional: false,
        approveEducationalVerification: false,
        approveWorkExperienceVerification: false,
        approveIDVerification: false,
        activateProfessional: false,
        updateBusinessSubscription: false,
      },
    },
  ]);

  const [roleFormData, setRoleFormData] = useState({
    title: '',
    description: '',
    permissions: {
      viewAllUsers: false,
      manageUsers: false,
      systemSettings: false,
      billingManagement: false,
      postJobs: false,
      viewProfessionalEntities: false,
      viewOrganisationEntities: false,
      manageOrgProfile: false,
      manageOwnProfile: false,
      suspendOrganisation: false,
      activateOrganisation: false,
      createOrganisation: false,
      createProfessional: false,
      approveEducationalVerification: false,
      approveWorkExperienceVerification: false,
      approveIDVerification: false,
      activateProfessional: false,
      updateBusinessSubscription: false,
    },
  });
  const [roleFormLoading, setRoleFormLoading] = useState(false);

  // Load users sub-tab from URL
  useEffect(() => {
    if (activeTab === 'users') {
      const subTabParam = searchParams.get('subTab') as UsersSubTab;
      if (subTabParam && ['admin-users', 'role-management'].includes(subTabParam)) {
        setUsersSubTab(subTabParam);
      }
    }
  }, [activeTab, searchParams]);

  // Load billing sub-tab from URL
  useEffect(() => {
    if (activeTab === 'billing') {
      const subTabParam = searchParams.get('subTab') as BillingSubTab;
      if (subTabParam && ['professional', 'organisation'].includes(subTabParam)) {
        setBillingSubTab(subTabParam);
      }
    }
  }, [activeTab, searchParams]);

  // Fetch plans when billing tab is active
  useEffect(() => {
    if (activeTab === 'billing') {
      fetchPlans();
    }
  }, [activeTab]);

  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const [professionalRes, organisationRes] = await Promise.all([
        api.get('/v1/admin/billing/plans?entityType=professional'),
        api.get('/v1/admin/billing/plans?entityType=organisation'),
      ]);
      setProfessionalPlans(professionalRes.data.data || []);
      setOrganisationPlans(organisationRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      toast.error('Failed to load subscription plans');
    } finally {
      setPlansLoading(false);
    }
  };

  const handleAdminFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAdminFormData({ ...adminFormData, [e.target.name]: e.target.value });
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminFormLoading(true);

    try {
      await api.post('/v1/admin/users/invite', adminFormData);
      toast.success('Admin invitation sent successfully!');
      setIsDrawerOpen(false);
      setAdminFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'admin',
      });
      // Optionally refresh admin users list
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to invite admin';
      toast.error(errorMsg);
    } finally {
      setAdminFormLoading(false);
    }
  };

  const handleUsersSubTabChange = (subTab: UsersSubTab) => {
    setUsersSubTab(subTab);
    setSearchParams({ tab: 'users', subTab });
  };

  const handleBillingSubTabChange = (subTab: BillingSubTab) => {
    setBillingSubTab(subTab);
    setSearchParams({ tab: 'billing', subTab });
  };

  const handleOpenRoleDrawer = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setRoleFormData({
        title: role.title,
        description: role.description,
        permissions: { ...role.permissions },
      });
    } else {
      setEditingRole(null);
      setRoleFormData({
        title: '',
        description: '',
        permissions: {
          viewAllUsers: false,
          manageUsers: false,
          systemSettings: false,
          billingManagement: false,
          postJobs: false,
          viewProfessionalEntities: false,
          viewOrganisationEntities: false,
          manageOrgProfile: false,
          manageOwnProfile: false,
          suspendOrganisation: false,
          activateOrganisation: false,
          createOrganisation: false,
          createProfessional: false,
          approveEducationalVerification: false,
          approveWorkExperienceVerification: false,
          approveIDVerification: false,
          activateProfessional: false,
          updateBusinessSubscription: false,
        },
      });
    }
    setIsRoleDrawerOpen(true);
  };

  const handleRoleFormChange = (field: string, value: any) => {
    if (field.startsWith('permissions.')) {
      const permissionKey = field.replace('permissions.', '');
      setRoleFormData({
        ...roleFormData,
        permissions: {
          ...roleFormData.permissions,
          [permissionKey]: value,
        },
      });
    } else {
      setRoleFormData({ ...roleFormData, [field]: value });
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleFormLoading(true);

    try {
      if (editingRole) {
        // Update existing role
        setRoles(roles.map(r => r.id === editingRole.id ? { ...editingRole, ...roleFormData } : r));
        toast.success('Role updated successfully!');
      } else {
        // Create new role
        const newRole = {
          id: Date.now().toString(),
          ...roleFormData,
        };
        setRoles([...roles, newRole]);
        toast.success('Role created successfully!');
      }
      setIsRoleDrawerOpen(false);
      setEditingRole(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to save role';
      toast.error(errorMsg);
    } finally {
      setRoleFormLoading(false);
    }
  };

  const permissionLabels: { [key: string]: string } = {
    viewAllUsers: 'View All Users',
    manageUsers: 'Manage Users',
    systemSettings: 'System Settings',
    billingManagement: 'Billing management',
    postJobs: 'Post Jobs',
    viewProfessionalEntities: 'View Professional Entities',
    viewOrganisationEntities: 'View Organisation Entities',
    manageOrgProfile: 'Manage Org Profile',
    manageOwnProfile: 'Manage Own Profile',
    suspendOrganisation: 'Suspend an Organisation',
    activateOrganisation: 'Activate an Organisation',
    createOrganisation: 'Create an Organisation',
    createProfessional: 'Create a Professional',
    approveEducationalVerification: 'Approve verification for Educational Qualification',
    approveWorkExperienceVerification: 'Approve verification for Work Experience',
    approveIDVerification: 'Approve Verification for ID',
    activateProfessional: 'Activate a Professional',
    updateBusinessSubscription: 'Can update a business subscription plan',
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Load tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && ['general', 'users', 'verification', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  // Update URL when tab changes
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  const tabs = [
    { id: 'general' as SettingsTab, label: 'General' },
    { id: 'users' as SettingsTab, label: 'Users' },
    { id: 'verification' as SettingsTab, label: 'Verification Providers' },
    { id: 'billing' as SettingsTab, label: 'Billing' },
  ];

  const ToggleSwitch = ({ checked, onChange, label, description }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
      </label>
    </div>
  );

  return (
    <AdminLayout>
      <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage application settings and configurations</p>
      </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-xl shadow-sm p-2">
          <div className="flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div>
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* About App */}
        <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center mb-6">
                    <HiInformationCircle className="w-5 h-5 text-brand-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">About App</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                      <div className="flex items-center gap-4">
                        <img src={settings.appLogo} alt="App Logo" className="h-16" />
                        <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Change Logo
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
                      <input
                        type="text"
                        value={settings.appName}
                        onChange={(e) => handleChange('appName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        value={settings.appDescription}
                        onChange={(e) => handleChange('appDescription', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Version</label>
                      <input
                        type="text"
                        value={settings.appVersion}
                        onChange={(e) => handleChange('appVersion', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center mb-6">
                    <HiBell className="w-5 h-5 text-brand-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Notification</h2>
                  </div>
                  <div className="space-y-2">
                    <ToggleSwitch
                      checked={settings.emailNotifications}
                      onChange={(val) => handleChange('emailNotifications', val)}
                      label="Email Notifications"
                      description="Receive important updates via email"
                    />
                    <ToggleSwitch
                      checked={settings.pushNotifications}
                      onChange={(val) => handleChange('pushNotifications', val)}
                      label="Push Notifications"
                      description="Receive notifications in the browser"
                    />
                    <ToggleSwitch
                      checked={settings.systemAlerts}
                      onChange={(val) => handleChange('systemAlerts', val)}
                      label="System Alerts"
                      description="Get notified about system events and errors"
                    />
                  </div>
                </div>

                {/* Language & Timezone */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center mb-6">
                    <HiGlobe className="w-5 h-5 text-brand-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Language & Timezone</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={settings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="pt">Portuguese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="America/New_York">EST (Eastern Time)</option>
                        <option value="America/Chicago">CST (Central Time)</option>
                        <option value="America/Denver">MST (Mountain Time)</option>
                        <option value="America/Los_Angeles">PST (Pacific Time)</option>
                        <option value="Europe/London">GMT (Greenwich Mean Time)</option>
                        <option value="Europe/Paris">CET (Central European Time)</option>
                        <option value="Asia/Tokyo">JST (Japan Standard Time)</option>
                        <option value="Asia/Shanghai">CST (China Standard Time)</option>
              </select>
            </div>
          </div>
        </div>
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <nav className="space-y-2">
                      <button
                        onClick={() => handleUsersSubTabChange('admin-users')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          usersSubTab === 'admin-users'
                            ? 'bg-brand-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <HiUsers className="w-5 h-5" />
                        <span className="font-medium">Admin Users</span>
                      </button>
                      <button
                        onClick={() => handleUsersSubTabChange('role-management')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          usersSubTab === 'role-management'
                            ? 'bg-brand-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <HiShieldCheck className="w-5 h-5" />
                        <span className="font-medium">Role Management</span>
                      </button>
                    </nav>
                  </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                  {usersSubTab === 'admin-users' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <HiUsers className="w-5 h-5 text-brand-600 mr-2" />
                          <h2 className="text-lg font-semibold text-gray-900">Admin Users</h2>
                        </div>
                        <button
                          onClick={() => setIsDrawerOpen(true)}
                          className="px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600"
                        >
                          Add Admin
                        </button>
                      </div>
                      <div className="space-y-3">
                        {adminUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                user.role === 'support' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {user.role.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {user.status}
                              </span>
                              <button className="text-brand-600 hover:text-brand-700 text-sm font-medium">
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {usersSubTab === 'role-management' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <HiShieldCheck className="w-5 h-5 text-brand-600 mr-2" />
                          <h2 className="text-lg font-semibold text-gray-900">Role Management</h2>
                        </div>
                        <button
                          onClick={() => handleOpenRoleDrawer()}
                          className="px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600"
                        >
                          Add Role
                        </button>
          </div>
          <div className="space-y-4">
                        {roles.map((role) => (
                          <div
                            key={role.id}
                            onClick={() => handleOpenRoleDrawer(role)}
                            className="p-4 border border-gray-200 rounded-lg hover:border-brand-300 hover:shadow-sm transition-all cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-medium text-gray-900">{role.title}</h3>
                              <div className="flex items-center gap-2">
                                <HiCheckCircle className="w-5 h-5 text-green-500" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRoleDrawer(role);
                                  }}
                                  className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{role.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Providers Tab */}
            {activeTab === 'verification' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center mb-6">
                    <HiShieldCheck className="w-5 h-5 text-brand-600 mr-2" />
                    <h2 className="text-lg font-semibold text-gray-900">Verification Providers</h2>
                  </div>
                  <div className="space-y-2">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">YouVerify</h3>
                          <p className="text-sm text-gray-500">Automated identity verification service</p>
                        </div>
                        <ToggleSwitch
                          checked={settings.youverifyEnabled}
                          onChange={(val) => handleChange('youverifyEnabled', val)}
                          label=""
                          description=""
                        />
                      </div>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-gray-900">Manual Verification</h3>
                          <p className="text-sm text-gray-500">Admin-reviewed verification process</p>
                        </div>
                        <ToggleSwitch
                          checked={settings.manualVerificationEnabled}
                          onChange={(val) => handleChange('manualVerificationEnabled', val)}
                          label=""
                          description=""
                        />
                      </div>
            </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-4">
              <div>
                          <h3 className="font-medium text-gray-900">Auto Verification</h3>
                          <p className="text-sm text-gray-500">Automatic verification based on rules</p>
                        </div>
                        <ToggleSwitch
                          checked={settings.autoVerificationEnabled}
                          onChange={(val) => handleChange('autoVerificationEnabled', val)}
                          label=""
                          description=""
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <nav className="space-y-2">
                      <button
                        onClick={() => handleBillingSubTabChange('professional')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          billingSubTab === 'professional'
                            ? 'bg-brand-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <HiUsers className="w-5 h-5" />
                        <span className="font-medium">Professional Entity</span>
                      </button>
                      <button
                        onClick={() => handleBillingSubTabChange('organisation')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          billingSubTab === 'organisation'
                            ? 'bg-brand-500 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <HiCreditCard className="w-5 h-5" />
                        <span className="font-medium">Organisation Entity</span>
                      </button>
                    </nav>
                  </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                  {billingSubTab === 'professional' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <HiUsers className="w-5 h-5 text-brand-600 mr-2" />
                          <h2 className="text-lg font-semibold text-gray-900">Subscription Plans (For Professional Entity)</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan({
                              recordId: null,
                              planSlug: '',
                              id: '',
                              name: '',
                              description: '',
                              price: 0,
                              priceAnnualUsd: '',
                              entityType: 'professional',
                              featuresText: '',
                            });
                            setIsPlanDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                        >
                          <HiPlus className="w-5 h-5" />
                          Add plan
                        </button>
                      </div>
                      {plansLoading ? (
                        <div className="text-center text-gray-600 py-8">Loading plans...</div>
                      ) : (
                        <div className="space-y-4">
                          {professionalPlans.map((plan) => (
                            <div key={plan.id} className="p-4 border border-gray-200 rounded-lg hover:border-brand-300 transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-1">{plan.name}</h3>
                                  <p className="text-sm text-gray-600">{plan.description}</p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {plan.price === 0
                                      ? 'Free'
                                      : `$${plan.price}/mo${
                                          plan.priceAnnualUsd != null && plan.priceAnnualUsd !== ''
                                            ? ` · $${plan.priceAnnualUsd}/yr`
                                            : ''
                                        }`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingPlan({
                                      ...plan,
                                      recordId: plan.recordId,
                                      planSlug: plan.id,
                                      entityType: 'professional',
                                      featuresText: (plan.features || []).join('\n'),
                                      priceAnnualUsd:
                                        plan.priceAnnualUsd != null && plan.priceAnnualUsd !== ''
                                          ? plan.priceAnnualUsd
                                          : '',
                                    });
                                    setIsPlanDrawerOpen(true);
                                  }}
                                  className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {billingSubTab === 'organisation' && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center">
                          <HiCreditCard className="w-5 h-5 text-brand-600 mr-2" />
                          <h2 className="text-lg font-semibold text-gray-900">Subscription Plans (For Organisation Entity)</h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPlan({
                              recordId: null,
                              planSlug: '',
                              id: '',
                              name: '',
                              description: '',
                              price: 0,
                              priceAnnualUsd: '',
                              entityType: 'organisation',
                              featuresText: '',
                            });
                            setIsPlanDrawerOpen(true);
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                        >
                          <HiPlus className="w-5 h-5" />
                          Add plan
                        </button>
                      </div>
                      {plansLoading ? (
                        <div className="text-center text-gray-600 py-8">Loading plans...</div>
                      ) : (
                        <div className="space-y-4">
                          {organisationPlans.map((plan) => (
                            <div key={plan.id} className="p-4 border border-gray-200 rounded-lg hover:border-brand-300 transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-1">{plan.name}</h3>
                                  <p className="text-sm text-gray-600">{plan.description}</p>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {plan.price === 0
                                      ? 'Free'
                                      : `$${plan.price}/mo${
                                          plan.priceAnnualUsd != null && plan.priceAnnualUsd !== ''
                                            ? ` · $${plan.priceAnnualUsd}/yr`
                                            : ''
                                        }`}
                                  </p>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingPlan({
                                      ...plan,
                                      recordId: plan.recordId,
                                      planSlug: plan.id,
                                      entityType: 'organisation',
                                      featuresText: (plan.features || []).join('\n'),
                                      priceAnnualUsd:
                                        plan.priceAnnualUsd != null && plan.priceAnnualUsd !== ''
                                          ? plan.priceAnnualUsd
                                          : '',
                                    });
                                    setIsPlanDrawerOpen(true);
                                  }}
                                  className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Save Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>

        {/* Add Admin Side Drawer */}
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setIsDrawerOpen(false)}
            ></div>
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Add Admin</h2>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={handleAddAdmin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={adminFormData.firstName}
                        onChange={handleAdminFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        required
                        value={adminFormData.lastName}
                        onChange={handleAdminFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={adminFormData.email}
                        onChange={handleAdminFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
          </div>

              <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        name="role"
                        required
                        value={adminFormData.role}
                        onChange={handleAdminFormChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="support">Support</option>
                        <option value="auditor">Auditor</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">
                        Note: Only super admins can invite other admins. Super admin role cannot be assigned via invitation.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={adminFormLoading}
                        className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {adminFormLoading ? 'Sending...' : 'Send Invitation'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Role Management Side Drawer */}
        {isRoleDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => setIsRoleDrawerOpen(false)}
            ></div>
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingRole ? 'Edit Role' : 'Add Role'}
                  </h2>
                  <button
                    onClick={() => setIsRoleDrawerOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <form onSubmit={handleRoleSubmit} className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                      <input
                        type="text"
                        required
                        value={roleFormData.title}
                        onChange={(e) => handleRoleFormChange('title', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="e.g., Admin, Support, Auditor"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      <textarea
                        required
                        value={roleFormData.description}
                        onChange={(e) => handleRoleFormChange('description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Describe the role and its responsibilities"
                      />
                    </div>

                    {/* Permissions Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">Role & Permissions</label>
                      <div className="space-y-4 border border-gray-200 rounded-lg p-4">
                        {Object.entries(permissionLabels).map(([key, label]) => (
                          <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{label}</p>
                            </div>
                            <ToggleSwitch
                              checked={roleFormData.permissions[key as keyof typeof roleFormData.permissions] || false}
                              onChange={(val) => handleRoleFormChange(`permissions.${key}`, val)}
                              label=""
                              description=""
                            />
                          </div>
                        ))}
          </div>
        </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsRoleDrawerOpen(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={roleFormLoading}
                        className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {roleFormLoading ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
          </button>
                    </div>
                  </form>
                </div>
        </div>
      </div>
          </>
        )}

        {/* Plan Management Side Drawer */}
        {isPlanDrawerOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
              onClick={() => {
                setIsPlanDrawerOpen(false);
                setEditingPlan(null);
              }}
            ></div>
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingPlan?.recordId ? `Edit ${editingPlan.name || 'plan'}` : 'Add plan'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsPlanDrawerOpen(false);
                      setEditingPlan(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <HiX className="w-6 h-6" />
                  </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {editingPlan && (
                    <div className="space-y-6">
                      {!editingPlan.recordId ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Plan slug</label>
                          <input
                            type="text"
                            value={editingPlan.planSlug ?? ''}
                            onChange={(e) =>
                              setEditingPlan({ ...editingPlan, planSlug: e.target.value })
                            }
                            placeholder="e.g. growth"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">Lowercase identifier (URL-safe).</p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Plan slug</label>
                          <input
                            type="text"
                            value={editingPlan.planSlug || editingPlan.id || ''}
                            readOnly
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plan name</label>
                        <input
                          type="text"
                          value={editingPlan.name}
                          onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={editingPlan.description}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, description: e.target.value })
                          }
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Price (USD / month)</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={editingPlan.price}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, price: Number(e.target.value) })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Annual price (USD, optional)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={editingPlan.priceAnnualUsd === '' ? '' : editingPlan.priceAnnualUsd}
                          onChange={(e) =>
                            setEditingPlan({
                              ...editingPlan,
                              priceAnnualUsd: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Entity type</label>
                        <input
                          type="text"
                          value={
                            editingPlan.entityType === 'professional'
                              ? 'Professional'
                              : 'Organisation'
                          }
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Features (one per line)
                        </label>
                        <textarea
                          value={editingPlan.featuresText ?? ''}
                          onChange={(e) =>
                            setEditingPlan({ ...editingPlan, featuresText: e.target.value })
                          }
                          rows={6}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlanDrawerOpen(false);
                            setEditingPlan(null);
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={planSaveLoading}
                          onClick={async () => {
                            const features = String(editingPlan.featuresText || '')
                              .split('\n')
                              .map((s: string) => s.trim())
                              .filter(Boolean);
                            const annualRaw = editingPlan.priceAnnualUsd;
                            const priceAnnualUsd =
                              annualRaw === '' || annualRaw === undefined || annualRaw === null
                                ? undefined
                                : Number(annualRaw);
                            setPlanSaveLoading(true);
                            try {
                              if (editingPlan.recordId) {
                                await api.put(`/v1/admin/billing/plans/${editingPlan.recordId}`, {
                                  name: editingPlan.name,
                                  description: editingPlan.description,
                                  priceMonthlyUsd: Number(editingPlan.price),
                                  priceAnnualUsd,
                                  features,
                                });
                                toast.success('Plan updated');
                              } else {
                                const slug = String(editingPlan.planSlug || '')
                                  .trim()
                                  .toLowerCase()
                                  .replace(/\s+/g, '-');
                                if (!slug) {
                                  toast.error('Plan slug is required');
                                  setPlanSaveLoading(false);
                                  return;
                                }
                                await api.post('/v1/admin/billing/plans', {
                                  planSlug: slug,
                                  entityType: editingPlan.entityType,
                                  name: editingPlan.name,
                                  description: editingPlan.description,
                                  priceMonthlyUsd: Number(editingPlan.price),
                                  priceAnnualUsd,
                                  features,
                                });
                                toast.success('Plan created');
                              }
                              setIsPlanDrawerOpen(false);
                              setEditingPlan(null);
                              await fetchPlans();
                            } catch (err: any) {
                              toast.error(err.response?.data?.message || 'Could not save plan');
                            } finally {
                              setPlanSaveLoading(false);
                            }
                          }}
                          className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
                        >
                          {planSaveLoading ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
