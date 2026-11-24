import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';

const API_BASE = 'https://soc2-iso27001-readiness-portal.onrender.com/api';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Place your own photo at: D:\soc2-project\mobile\assets\profile.jpg
let PROFILE_PHOTO = null;
try {
  PROFILE_PHOTO = require('./assets/profile.jpg');
} catch (e) {
  PROFILE_PHOTO = null;
}

const ONBOARDING_SLIDES = [
  {
    step: '01 • WELCOME',
    eyebrow: 'ONE PLACE. FULL CONFIDENCE.',
    title: 'Stay Compliant.\nStay Secure.',
    subtitle: 'Manage your compliance requirements in one place.',
    cta: 'Get Started',
  },
  {
    step: '02 • MANAGE COMPLIANCE',
    eyebrow: 'LESS COMPLEXITY. MORE CONTROL.',
    title: 'Simple and Smart\nCompliance Management',
    subtitle:
      'Manage controls, track progress, and ensure compliance effortlessly.',
    cta: 'Next',
  },
  {
    step: '03 • AUDIT READY',
    eyebrow: "READY FOR WHAT'S NEXT.",
    title: 'Achieve Compliance\nwith Confidence',
    subtitle: 'Get real-time insights and stay audit-ready.',
    cta: "Let's Go",
  },
];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    section: 'TODAY',
    type: 'Updates',
    icon: '📈',
    title: 'Control status updated',
    body: 'CC6.1 is now In Progress. Updated by Alex Morgan.',
    time: '26 mins ago',
    unread: true,
  },
  {
    id: 'n2',
    section: 'TODAY',
    type: 'Alerts',
    icon: '⚠️',
    title: 'Evidence expires soon',
    body: 'Your SOC 2 access review evidence expires in 3 days.',
    time: '1 hour ago',
    unread: true,
  },
  {
    id: 'n3',
    section: 'TODAY',
    type: 'Updates',
    icon: '🔄',
    title: 'Workspace is up to date',
    body: 'All controls and evidence have synced successfully.',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 'n4',
    section: 'YESTERDAY',
    type: 'Updates',
    icon: '✅',
    title: 'Another control completed',
    body: 'CC7.2 Monitor system activity was marked Compliant.',
    time: 'Yesterday • 16:42',
    unread: false,
  },
];

const FAQ_ITEMS = [
  {
    id: 'faq1',
    q: 'How do I add a control?',
    a: 'Go to Controls and tap Add Control. Choose a framework, add the details then tap Save.',
  },
  {
    id: 'faq2',
    q: 'What counts as evidence?',
    a: 'Policies, access logs, configuration screenshots, and audit notes linked to a control count as evidence.',
  },
  {
    id: 'faq3',
    q: 'How is readiness calculated?',
    a: 'Readiness is the percentage of Compliant controls out of total controls in the active workspace.',
  },
];

const STATUS_OPTIONS = ['Compliant', 'In Progress', 'Non-Compliant'];
const ROLES = ['Super Admin', 'Editor', 'Auditor'];
const INDUSTRIES = ['SaaS / Technology', 'FinTech & Cloud', 'Healthcare', 'E-Commerce'];
const COMPANY_SIZES = ['1-50 Employees', '51-200 Employees', '201-1000 Employees', '1000+'];
const FRAMEWORKS = ['SOC 2', 'ISO 27001'];
const CLOUD_PROVIDERS = ['AWS', 'Azure', 'Google Cloud', 'Other'];

export default function App() {
  const authScrollRef = useRef(null);

  // 'onboarding' | 'auth' | 'workspace' | 'create_company' | 'dashboard'
  const [screen, setScreen] = useState('onboarding');
  const [stepIndex, setStepIndex] = useState(0);

  // Auth state ('login' | 'signup' | 'forgot')
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Forgot Password OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const [authRole, setAuthRole] = useState('Super Admin');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Workspaces state (User-Wise Isolated)
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [apiError, setApiError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);

  // Create Company form state (Figma Screen 15)
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [industry, setIndustry] = useState('SaaS / Technology');
  const [companySize, setCompanySize] = useState('1-50 Employees');
  const [framework, setFramework] = useState('SOC 2');
  const [cloudEnv, setCloudEnv] = useState('AWS');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Dashboard Tabs ('home' | 'controls' | 'profile' | 'settings')
  // Plus sub-views inside profile/settings/home:
  // null | 'notifications' | 'support' | 'activity' | 'about' | 'detail'
  const [activeTab, setActiveTab] = useState('home');
  const [subScreen, setSubScreen] = useState(null);
  const [selectedControl, setSelectedControl] = useState(null);

  const [activeRole, setActiveRole] = useState('Super Admin');
  const [syncingData, setSyncingData] = useState(false);

  // Notifications & FAQ states
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifFilter, setNotifFilter] = useState('All');
  const [openFaqId, setOpenFaqId] = useState('faq1');
  const [supportMessage, setSupportMessage] = useState('');

  // Controls state
  const [controls, setControls] = useState([]);
  const [loadingControls, setLoadingControls] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Add Control form
  const [showAddControl, setShowAddControl] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('In Progress');
  const [newEvidence, setNewEvidence] = useState('');
  const [newOwner, setNewOwner] = useState('Alex Morgan');
  const [savingControl, setSavingControl] = useState(false);

  // Members state (Team)
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('Editor');
  const [addingMember, setAddingMember] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const currentSlide = ONBOARDING_SLIDES[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_SLIDES.length - 1;
  const isAuditor = activeRole === 'Auditor';
  const isSuperAdmin = activeRole === 'Super Admin';
  const unreadCount = notifications.filter((n) => n.unread).length;

  const showToast = (msg) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(''), 3000);
  };

  const scrollAuthUp = (offset = 140) => {
    setTimeout(() => {
      authScrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 150);
  };

  useEffect(() => {
    const onHardwareBack = () => {
      if (screen === 'dashboard') {
        if (subScreen) {
          setSubScreen(null);
          return true;
        }
        if (activeTab !== 'home') {
          setActiveTab('home');
          return true;
        }
        setScreen('workspace');
        return true;
      }
      if (screen === 'create_company') {
        setScreen('workspace');
        return true;
      }
      if (screen === 'workspace') {
        setScreen('auth');
        return true;
      }
      if (screen === 'auth') {
        if (authMode === 'forgot') {
          setAuthMode('login');
          setOtpSent(false);
          setAuthError('');
          setAuthInfo('');
          return true;
        }
        setScreen('onboarding');
        setStepIndex(0);
        return true;
      }
      if (screen === 'onboarding' && stepIndex > 0) {
        setStepIndex((prev) => prev - 1);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [screen, activeTab, subScreen, authMode, stepIndex]);

  const loadOrganizations = async (userObj = currentUser) => {
    const userEmail = (userObj?.email || authEmail || '').trim().toLowerCase();
    setLoadingOrgs(true);
    setApiError('');
    try {
      const query = userEmail ? `?email=${encodeURIComponent(userEmail)}` : '';
      const res = await fetch(`${API_BASE}/organizations${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.organizations || [];
      setOrgs(list);
    } catch (err) {
      setApiError('Unable to load workspaces from server. Tap Refresh or create a company.');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadDashboardData = async (org, showFeedback = false) => {
    const orgId = org?.id || org?._id || '';
    setLoadingControls(true);
    setLoadingMembers(true);
    if (showFeedback) setSyncingData(true);

    try {
      const ctrlUrl = orgId
        ? `${API_BASE}/controls?orgId=${encodeURIComponent(orgId)}`
        : `${API_BASE}/controls`;
      const ctrlRes = await fetch(ctrlUrl);
      if (ctrlRes.ok) {
        const ctrlData = await ctrlRes.json();
        const ctrlList = Array.isArray(ctrlData) ? ctrlData : ctrlData.controls || [];
        setControls(ctrlList);
      }

      const memUrl = orgId
        ? `${API_BASE}/members?orgId=${encodeURIComponent(orgId)}`
        : `${API_BASE}/members`;
      const memRes = await fetch(memUrl);
      if (memRes.ok) {
        const memData = await memRes.json();
        const memList = Array.isArray(memData) ? memData : memData.members || [];
        setMembers(memList);
      }

      if (showFeedback) {
        showToast('Synced latest data from MongoDB');
      }
    } catch (err) {
      showToast('Could not sync data right now.');
    } finally {
      setLoadingControls(false);
      setLoadingMembers(false);
      if (showFeedback) setSyncingData(false);
    }
  };

  const goToAuthScreen = (mode = 'login') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthInfo('');
    setScreen('auth');
  };

  const goToWorkspaceScreen = (userObj = currentUser) => {
    setSubScreen(null);
    setScreen('workspace');
    loadOrganizations(userObj);
  };

  const openCreateCompanyScreen = () => {
    setApiError('');
    setContactEmail((prev) => prev || currentUser?.email || '');
    setScreen('create_company');
  };

  const openWorkspaceDashboard = (org) => {
    setSelectedOrg(org);
    setActiveTab('home');
    setSubScreen(null);
    setShowAddControl(false);
    setScreen('dashboard');
    loadDashboardData(org, false);
  };

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex((prev) => prev + 1);
    } else {
      goToAuthScreen('login');
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((prev) => prev - 1);
  };

  const handleAuthSubmit = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword.trim();
    const cleanConfirm = authConfirmPassword.trim();
    const cleanName = authName.trim();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setAuthError('Enter a valid email address (e.g. you@company.com).');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }
    if (authMode === 'signup') {
      if (!cleanName) {
        setAuthError('Please enter your username or full name.');
        return;
      }
      if (cleanConfirm && cleanConfirm !== cleanPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
      if (!agreeTerms) {
        setAuthError('Please agree to the Terms & Conditions and Privacy Policy.');
        return;
      }
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const endpoint = authMode === 'signup' ? '/signup' : '/login';
      const payload =
        authMode === 'signup'
          ? { name: cleanName, email: cleanEmail, password: cleanPassword, role: authRole }
          : { email: cleanEmail, password: cleanPassword, role: authRole };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }

      const verifiedUser = data.user || {
        name: cleanName || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: authRole,
      };

      const sessionUser = {
        name: verifiedUser.name,
        email: verifiedUser.email.toLowerCase(),
        role: verifiedUser.role || authRole,
        authMethod: authMode === 'signup' ? 'Signed Up' : 'Signed In',
      };

      setCurrentUser(sessionUser);
      setActiveRole(sessionUser.role);
      setOrgs([]);
      goToWorkspaceScreen(sessionUser);
    } catch (err) {
      setAuthError('Could not reach server. Please check internet and try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setAuthError('Enter a valid registered email (e.g. you@company.com).');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('Sending reset link / OTP...');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${API_BASE}/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      const data = await res.json();

      if (!res.ok) {
        setAuthInfo('');
        setAuthError(data.error || 'Could not send OTP.');
        return;
      }

      setOtpSent(true);
      setAuthInfo(data.message || '6-digit OTP sent to your email. Check Inbox or Spam.');
    } catch (err) {
      clearTimeout(timer);
      setAuthInfo('');
      if (err.name === 'AbortError') {
        setAuthError('Server took too long to wake up. Tap Send Reset Link again.');
      } else {
        setAuthError('Network error while sending OTP. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanOtp = otpInput.trim();
    const cleanNewPass = resetNewPassword.trim();

    if (cleanOtp.length !== 6) {
      setAuthError('Enter the 6-digit OTP received in your email.');
      return;
    }
    if (cleanNewPass.length < 4) {
      setAuthError('New password must be at least 4 characters.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');

    try {
      const res = await fetch(`${API_BASE}/forgot-password/verify-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          newPassword: cleanNewPass,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'OTP verification failed.');
        return;
      }

      setAuthPassword(cleanNewPass);
      setOtpInput('');
      setResetNewPassword('');
      setOtpSent(false);
      setAuthMode('login');
      setAuthInfo('Password updated! Tap Sign In below.');
    } catch (err) {
      setAuthError('Server error while resetting password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setAuthName('Ganesh Kumar');
    setAuthEmail('ganesh@complianceguard.app');
    setAuthPassword('Pass@123');
    setAuthConfirmPassword('Pass@123');
    setAuthRole('Super Admin');
    setAuthError('');
    setAuthInfo('Demo credentials filled. Tap Sign In.');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setSelectedOrg(null);
    setSubScreen(null);
    setOrgs([]);
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthInfo('');
    setAuthMode('login');
    setScreen('auth');
  };

  const handleCreateOrganization = async () => {
    const cleanName = orgName.trim();
    const cleanContact = (contactEmail || currentUser?.email || '').trim().toLowerCase();
    const ownerEmail = (currentUser?.email || cleanContact).trim().toLowerCase();

    if (!cleanName) {
      setApiError('Enter Company Name to create your workspace.');
      return;
    }
    if (!EMAIL_REGEX.test(cleanContact)) {
      setApiError('Enter a valid Contact Email (e.g. security@company.com).');
      return;
    }

    setCreatingOrg(true);
    setApiError('');

    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          email: cleanContact,
          ownerEmail,
          ownerName: currentUser?.name || `${cleanName} Admin`,
          industry,
          companySize,
          framework,
          cloud: cloudEnv,
          seedControls: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || 'Could not create company workspace.');
        return;
      }

      const newOrgObj = data.organization || data;
      setOrgName('');
      setContactEmail('');
      await loadOrganizations(currentUser);
      openWorkspaceDashboard(newOrgObj);
    } catch (err) {
      setApiError('Could not create workspace right now. Please try again.');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleUpdateControl = async (control, updates) => {
    if (isAuditor) {
      showToast('Auditor role is read-only.');
      return;
    }
    const id = control._id || control.id;
    setControls((prev) =>
      prev.map((c) => ((c._id || c.id) === id ? { ...c, ...updates } : c))
    );
    if (selectedControl && (selectedControl._id || selectedControl.id) === id) {
      setSelectedControl((prev) => ({ ...prev, ...updates }));
    }

    try {
      await fetch(`${API_BASE}/controls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...control, ...updates }),
      });
      setNotifications((prev) => [
        {
          id: `n-${Date.now()}`,
          section: 'TODAY',
          type: 'Updates',
          icon: '📈',
          title: 'Control status updated',
          body: `${control.id || control.code || 'Control'} marked ${updates.status || control.status}.`,
          time: 'Just now',
          unread: true,
        },
        ...prev,
      ]);
      showToast('Saved to MongoDB');
    } catch (err) {
      showToast('Updated locally (sync pending)');
    }
  };

  const handleAddControl = async () => {
    if (isAuditor) return;
    if (!newCode.trim() || !newTitle.trim()) {
      showToast('Enter Control ID and Title.');
      return;
    }
    setSavingControl(true);
    const payload = {
      id: newCode.trim().toUpperCase(),
      name: newTitle.trim(),
      description: newDescription.trim(),
      framework: newFramework || selectedOrg?.framework || 'SOC 2',
      status: newStatus || 'In Progress',
      evidence: newEvidence.trim(),
      orgId: selectedOrg?.id || selectedOrg?._id,
      updatedBy: newOwner.trim() || 'Alex Morgan',
    };

    try {
      const res = await fetch(`${API_BASE}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedCtrl = await res.json();
        setControls((prev) => [savedCtrl, ...prev]);
        showToast('Control added');
      } else {
        setControls((prev) => [{ ...payload, _id: Date.now().toString() }, ...prev]);
        showToast('Control added locally');
      }
      setNewCode('');
      setNewTitle('');
      setNewDescription('');
      setNewEvidence('');
      setShowAddControl(false);
    } catch (err) {
      setControls((prev) => [{ ...payload, _id: Date.now().toString() }, ...prev]);
      setShowAddControl(false);
    } finally {
      setSavingControl(false);
    }
  };

  const handleDeleteControl = async (id) => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin can delete controls.');
      return;
    }
    setControls((prev) => prev.filter((c) => (c._id || c.id) !== id));
    setConfirmDeleteId(null);
    if (selectedControl && (selectedControl._id || selectedControl.id) === id) {
      setSelectedControl(null);
      setSubScreen(null);
    }
    try {
      await fetch(`${API_BASE}/controls/${id}`, { method: 'DELETE' });
      showToast('Control deleted');
    } catch (err) {
      showToast('Removed from view');
    }
  };

  const handleAddMember = async () => {
    if (!isSuperAdmin) {
      showToast('Only Super Admin can invite members.');
      return;
    }
    if (!memberName.trim() || !EMAIL_REGEX.test(memberEmail.trim())) {
      showToast('Enter member name and valid email (name@domain.com).');
      return;
    }
    setAddingMember(true);
    const payload = {
      name: memberName.trim(),
      email: memberEmail.trim().toLowerCase(),
      role: memberRole,
      orgId: selectedOrg?.id || selectedOrg?._id,
    };

    try {
      const res = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const savedMem = await res.json();
        setMembers((prev) => [savedMem, ...prev]);
      } else {
        setMembers((prev) => [{ ...payload, _id: Date.now().toString() }, ...prev]);
      }
      setMemberName('');
      setMemberEmail('');
      showToast('Team member added');
    } catch (err) {
      setMembers((prev) => [{ ...payload, _id: Date.now().toString() }, ...prev]);
    } finally {
      setAddingMember(false);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  const BrandTopBar = ({ rightAction }) => (
    <View style={styles.topBar}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>CG</Text>
        </View>
        <Text style={styles.brandName}>ComplianceGuard</Text>
      </View>
      {rightAction || null}
    </View>
  );

  // =========================================================
  // AUTH: SIGN IN, SIGN UP & RESET PASSWORD (SCREENS 04 & 05)
  // =========================================================
  if (screen === 'auth') {
    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={styles.mobileFrame}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          >
            <ScrollView
              ref={authScrollRef}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <BrandTopBar
                rightAction={
                  <Pressable
                    style={styles.ghostPill}
                    onPress={() => {
                      setScreen('onboarding');
                      setStepIndex(0);
                    }}
                  >
                    <Text style={styles.skipText}>Intro</Text>
                  </Pressable>
                }
              />

              {authMode === 'login' && (
                <View style={styles.authBlock}>
                  <Text style={styles.authTitle}>Welcome Back</Text>
                  <Text style={styles.authSub}>Your next step toward audit readiness.</Text>

                  {authError ? (
                    <View style={styles.alertErrorBox}>
                      <Text style={styles.errorText}>{authError}</Text>
                    </View>
                  ) : null}
                  {authInfo ? (
                    <View style={styles.alertInfoBox}>
                      <Text style={styles.infoText}>{authInfo}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="you@company.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    onFocus={() => scrollAuthUp(80)}
                  />

                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      value={authPassword}
                      onChangeText={setAuthPassword}
                      onFocus={() => scrollAuthUp(140)}
                    />
                    <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                      <Text style={styles.eyeBtn}>{showPassword ? 'Hide' : '👁'}</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.forgotLinkWrap}
                    onPress={() => {
                      setAuthMode('forgot');
                      setOtpSent(false);
                      setOtpInput('');
                      setAuthError('');
                      setAuthInfo('');
                    }}
                  >
                    <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                  </Pressable>

                  <Pressable
                    style={styles.blueBtn}
                    onPress={handleAuthSubmit}
                    disabled={authLoading}
                  >
                    <Text style={styles.blueBtnText}>
                      {authLoading ? 'Signing In...' : 'Sign In'}
                    </Text>
                  </Pressable>

                  <View style={styles.centerRow}>
                    <Text style={styles.mutedSmall}>New to ComplianceGuard? </Text>
                    <Pressable
                      onPress={() => {
                        setAuthMode('signup');
                        setAuthError('');
                        setAuthInfo('');
                      }}
                    >
                      <Text style={styles.inlineBlueLink}>Sign Up</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.orDivider}>or</Text>

                  <Pressable style={styles.googleBtn} onPress={handleQuickDemoFill}>
                    <Text style={styles.googleLogo}>G</Text>
                    <Text style={styles.googleBtnText}>Continue with google (Demo Fill)</Text>
                  </Pressable>

                  <Text style={styles.secureFootnote}>
                    🔒 Secure access. Peace of mind.
                  </Text>
                </View>
              )}

              {authMode === 'signup' && (
                <View style={styles.authBlock}>
                  <Text style={styles.uppercaseSection}>CREATE YOUR ACCOUNT</Text>

                  {authError ? (
                    <View style={styles.alertErrorBox}>
                      <Text style={styles.errorText}>{authError}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Username</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Username"
                    placeholderTextColor="#94A3B8"
                    value={authName}
                    onChangeText={setAuthName}
                  />

                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Email"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={authEmail}
                    onChangeText={setAuthEmail}
                    onFocus={() => scrollAuthUp(80)}
                  />

                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      value={authPassword}
                      onChangeText={setAuthPassword}
                      onFocus={() => scrollAuthUp(140)}
                    />
                    <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                      <Text style={styles.eyeBtn}>{showPassword ? 'Hide' : '👁'}</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.fieldLabel}>Confirm password</Text>
                  <View style={styles.passwordWrap}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirm password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      value={authConfirmPassword}
                      onChangeText={setAuthConfirmPassword}
                      onFocus={() => scrollAuthUp(200)}
                    />
                    <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                      <Text style={styles.eyeBtn}>{showPassword ? 'Hide' : '👁'}</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.termsRow}
                    onPress={() => setAgreeTerms((prev) => !prev)}
                  >
                    <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                      {agreeTerms ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the{' '}
                      <Text style={styles.inlineBlueLink}>terms & conditions</Text> and{' '}
                      <Text style={styles.inlineBlueLink}>Privacy policy</Text>
                    </Text>
                  </Pressable>

                  <Pressable
                    style={styles.blueBtn}
                    onPress={handleAuthSubmit}
                    disabled={authLoading}
                  >
                    <Text style={styles.blueBtnText}>
                      {authLoading ? 'Creating Account...' : 'Sign Up'}
                    </Text>
                  </Pressable>

                  <View style={styles.centerRow}>
                    <Text style={styles.mutedSmall}>Already have an account? </Text>
                    <Pressable
                      onPress={() => {
                        setAuthMode('login');
                        setAuthError('');
                      }}
                    >
                      <Text style={styles.inlineBlueLink}>Sign In</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.orDivider}>or</Text>

                  <Pressable style={styles.googleBtn} onPress={handleQuickDemoFill}>
                    <Text style={styles.googleLogo}>G</Text>
                    <Text style={styles.googleBtnText}>Continue with google</Text>
                  </Pressable>

                  <Text style={styles.secureFootnote}>
                    🔒 Secure access. Peace of mind.
                  </Text>
                </View>
              )}

              {authMode === 'forgot' && (
                <View style={styles.authBlock}>
                  <View style={styles.lockIconBox}>
                    <Text style={styles.lockIconGlyph}>🔒</Text>
                  </View>
                  <Text style={styles.authTitle}>Reset Password</Text>
                  <Text style={styles.authSub}>
                    Enter your work email and we&apos;ll send you a link to securely reset your password.
                  </Text>

                  {authError ? (
                    <View style={styles.alertErrorBox}>
                      <Text style={styles.errorText}>{authError}</Text>
                    </View>
                  ) : null}
                  {authInfo ? (
                    <View style={styles.alertInfoBox}>
                      <Text style={styles.infoText}>{authInfo}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="you@company.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!otpSent}
                    value={authEmail}
                    onChangeText={setAuthEmail}
                  />

                  {!otpSent ? (
                    <Pressable
                      style={styles.blueBtn}
                      onPress={handleSendResetOtp}
                      disabled={authLoading}
                    >
                      <Text style={styles.blueBtnText}>
                        {authLoading ? 'Sending...' : 'Send Reset Link'}
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <Text style={styles.fieldLabel}>6-Digit Verification OTP</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="000000"
                        placeholderTextColor="#94A3B8"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otpInput}
                        onChangeText={setOtpInput}
                      />

                      <Text style={styles.fieldLabel}>New Password</Text>
                      <TextInput
                        style={styles.fieldInput}
                        placeholder="Enter new password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry
                        value={resetNewPassword}
                        onChangeText={setResetNewPassword}
                      />

                      <Pressable
                        style={styles.blueBtn}
                        onPress={handleVerifyOtpAndReset}
                        disabled={authLoading}
                      >
                        <Text style={styles.blueBtnText}>
                          {authLoading ? 'Updating...' : 'Verify OTP & Reset Password'}
                        </Text>
                      </Pressable>
                    </>
                  )}

                  <Pressable
                    style={styles.backToLoginBtn}
                    onPress={() => {
                      setAuthMode('login');
                      setOtpSent(false);
                      setOtpInput('');
                      setAuthError('');
                      setAuthInfo('');
                    }}
                  >
                    <Text style={styles.backToLoginText}>← Back to Login</Text>
                  </Pressable>

                  <View style={styles.infoHintCard}>
                    <Text style={styles.infoHintTitle}>✉ Can&apos;t find the email?</Text>
                    <Text style={styles.infoHintDesc}>
                      Check your spam folder or try again.
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // =========================================================
  // CREATE YOUR COMPANY SCREEN (SCREEN 15)
  // =========================================================
  if (screen === 'create_company') {
    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={styles.mobileFrame}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setScreen('workspace')}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <View>
                  <Text style={styles.subHeaderTitle}>Create Your Company</Text>
                  <Text style={styles.subHeaderSub}>Set up a fresh compliance workspace.</Text>
                </View>
              </View>

              {apiError ? (
                <View style={styles.alertErrorBox}>
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Company Name</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Enter your company name"
                placeholderTextColor="#94A3B8"
                value={orgName}
                onChangeText={setOrgName}
              />

              <Text style={styles.fieldLabel}>Contact Email</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="security@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={contactEmail}
                onChangeText={setContactEmail}
              />

              <Text style={styles.fieldLabel}>Industry</Text>
              <View style={styles.chipsWrap}>
                {INDUSTRIES.map((ind) => (
                  <Pressable
                    key={ind}
                    style={[styles.chip, industry === ind && styles.activeChip]}
                    onPress={() => setIndustry(ind)}
                  >
                    <Text style={[styles.chipText, industry === ind && styles.activeChipText]}>
                      {ind}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Company Size</Text>
              <View style={styles.chipsWrap}>
                {COMPANY_SIZES.map((sz) => (
                  <Pressable
                    key={sz}
                    style={[styles.chip, companySize === sz && styles.activeChip]}
                    onPress={() => setCompanySize(sz)}
                  >
                    <Text style={[styles.chipText, companySize === sz && styles.activeChipText]}>
                      {sz}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Compliance Framework</Text>
              <View style={styles.fwRow}>
                {FRAMEWORKS.map((fw) => {
                  const active = framework === fw;
                  return (
                    <Pressable
                      key={fw}
                      style={[styles.fwBox, active && styles.fwBoxActive]}
                      onPress={() => setFramework(fw)}
                    >
                      <View style={[styles.sqCheck, active && styles.sqCheckActive]}>
                        {active ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={[styles.fwBoxText, active && styles.fwBoxTextActive]}>
                        {fw}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Cloud Provider</Text>
              <View style={styles.chipsWrap}>
                {CLOUD_PROVIDERS.map((env) => (
                  <Pressable
                    key={env}
                    style={[styles.chip, cloudEnv === env && styles.activeChip]}
                    onPress={() => setCloudEnv(env)}
                  >
                    <Text style={[styles.chipText, cloudEnv === env && styles.activeChipText]}>
                      {env}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.mutedSmall}>AWS, Azure, Google Cloud or Other</Text>

              <Pressable
                style={styles.blueBtn}
                onPress={handleCreateOrganization}
                disabled={creatingOrg}
              >
                <Text style={styles.blueBtnText}>
                  {creatingOrg ? 'Creating Company...' : 'Create Company'}
                </Text>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // =========================================================
  // MAIN APP: HOME, CONTROLS, PROFILE, SETTINGS & SUB-SCREENS
  // =========================================================
  if (screen === 'dashboard') {
    const totalCount = controls.length;
    const compliantCount = controls.filter((c) => c.status === 'Compliant').length;
    const inProgressCount = controls.filter((c) => c.status === 'In Progress').length;
    const nonCompliantCount = controls.filter((c) => c.status === 'Non-Compliant').length;
    const readinessScore =
      totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const filteredControls = controls.filter((c) => {
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const displayCode = c.code || c.id || '';
      const displayTitle = c.title || c.name || '';
      const matchesQuery =
        !q ||
        displayCode.toLowerCase().includes(q) ||
        displayTitle.toLowerCase().includes(q) ||
        (c.framework || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    const filteredNotifs = notifications.filter(
      (n) => notifFilter === 'All' || n.type === notifFilter
    );
    const todayNotifs = filteredNotifs.filter((n) => n.section === 'TODAY');
    const yesterdayNotifs = filteredNotifs.filter((n) => n.section === 'YESTERDAY');

    const profileDisplayName =
      currentUser?.name ||
      (currentUser?.email ? currentUser.email.split('@')[0] : 'sathya');
    const profileDisplayEmail =
      currentUser?.email || 'sathya123@gmail.com';
    const companyDisplayName = selectedOrg?.name || 'Acme Inc.';

    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={styles.mobileFrame}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {statusBanner ? (
            <View style={styles.toastBox}>
              <Text style={styles.toastText}>{statusBanner}</Text>
            </View>
          ) : null}

          {/* SUB-SCREEN: NOTIFICATIONS (SCREEN 12) */}
          {subScreen === 'notifications' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.notifTopHeader}>
                <View style={styles.subHeaderRow}>
                  <Pressable onPress={() => setSubScreen(null)}>
                    <Text style={styles.backChevron}>‹</Text>
                  </Pressable>
                  <View>
                    <Text style={styles.subHeaderTitle}>Notifications</Text>
                    <Text style={styles.notifSubCount}>
                      {unreadCount} unread notifications
                    </Text>
                  </View>
                </View>
                <Pressable onPress={markAllNotificationsRead}>
                  <Text style={styles.markAllLink}>Mark all as read</Text>
                </Pressable>
              </View>

              <View style={styles.notifFilterRow}>
                {['All', 'Updates', 'Alerts'].map((f) => {
                  const active = notifFilter === f;
                  return (
                    <Pressable
                      key={f}
                      style={[styles.notifChip, active && styles.notifChipActive]}
                      onPress={() => setNotifFilter(f)}
                    >
                      <Text style={[styles.notifChipText, active && styles.notifChipTextActive]}>
                        {f}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {todayNotifs.length > 0 && (
                <>
                  <Text style={styles.sectionCaps}>TODAY</Text>
                  {todayNotifs.map((item) => (
                    <View
                      key={item.id}
                      style={[styles.notifCard, item.unread && styles.notifCardUnread]}
                    >
                      <Text style={styles.notifGlyph}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.notifTitleRow}>
                          <Text style={styles.notifTitle}>{item.title}</Text>
                          {item.unread ? <View style={styles.unreadDot} /> : null}
                        </View>
                        <Text style={styles.notifBody}>{item.body}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {yesterdayNotifs.length > 0 && (
                <>
                  <Text style={styles.sectionCaps}>YESTERDAY</Text>
                  {yesterdayNotifs.map((item) => (
                    <View key={item.id} style={styles.notifCard}>
                      <Text style={styles.notifGlyph}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.notifBody}>{item.body}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          )}

          {/* SUB-SCREEN: HELP & SUPPORT (SCREEN 13) */}
          {subScreen === 'support' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <Text style={styles.subHeaderTitle}>Help & Support</Text>
              </View>

              <View style={styles.supportHeroBox}>
                <View style={styles.supportCircle}>
                  <Text style={styles.supportHeadset}>🎧 ✓</Text>
                </View>
                <Text style={styles.supportTitle}>How can we help?</Text>
                <Text style={styles.supportSub}>
                  A little guidance, whenever you need it.
                </Text>
              </View>

              <Text style={styles.faqHeading}>Frequently Asked Questions</Text>
              {FAQ_ITEMS.map((item) => {
                const isOpen = openFaqId === item.id;
                return (
                  <View key={item.id} style={styles.faqCard}>
                    <Pressable
                      style={styles.faqQuestionRow}
                      onPress={() => setOpenFaqId(isOpen ? null : item.id)}
                    >
                      <Text style={styles.faqQuestion}>{item.q}</Text>
                      <Text style={styles.faqChevron}>{isOpen ? '⌃' : '⌄'}</Text>
                    </Pressable>
                    {isOpen ? <Text style={styles.faqAnswer}>{item.a}</Text> : null}
                  </View>
                );
              })}

              <TextInput
                style={[styles.fieldInput, { marginTop: 10 }]}
                placeholder="Write a message to support (optional)"
                placeholderTextColor="#94A3B8"
                value={supportMessage}
                onChangeText={setSupportMessage}
              />

              <Text style={styles.supportReplyNote}>
                Usually replies within one business day.
              </Text>

              <Pressable
                style={styles.blueBtn}
                onPress={() => {
                  showToast(
                    supportMessage.trim()
                      ? 'Support request sent'
                      : 'Support ticket opened'
                  );
                  setSupportMessage('');
                }}
              >
                <Text style={styles.blueBtnText}>✉ Contact Support</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* SUB-SCREEN: MY ACTIVITY */}
          {subScreen === 'activity' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <Text style={styles.subHeaderTitle}>My Activity</Text>
              </View>

              <View style={styles.listCard}>
                <Text style={styles.listCardTitle}>Recent Workspace Actions</Text>
                <Text style={styles.listCardSub}>
                  Signed in as {profileDisplayEmail} ({activeRole}) in {companyDisplayName}.
                </Text>
                <Text style={styles.listCardMeta}>
                  Controls tracked: {totalCount} • Compliant: {compliantCount}
                </Text>
              </View>
            </ScrollView>
          )}

          {/* SUB-SCREEN: ABOUT APPLICATION */}
          {subScreen === 'about' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <Text style={styles.subHeaderTitle}>About Application</Text>
              </View>

              <View style={styles.listCard}>
                <Text style={styles.listCardTitle}>ComplianceGuard</Text>
                <Text style={styles.listCardSub}>Version 1.0.0</Text>
                <Text style={styles.listCardMeta}>
                  Your workspace. Your compliance journey.
                </Text>
              </View>
            </ScrollView>
          )}

          {/* SUB-SCREEN: CONTROL DETAILS (SCREEN 08) */}
          {subScreen === 'detail' && selectedControl && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <Text style={styles.subHeaderTitle}>Control Details</Text>
              </View>

              <View style={styles.detailCard}>
                <View style={styles.detailTopMeta}>
                  <Text style={styles.codeLabel}>{selectedControl.id || selectedControl.code}</Text>
                  <View style={styles.amberBadge}>
                    <Text style={styles.amberBadgeText}>
                      • {selectedControl.status || 'In Progress'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailTitle}>
                  {selectedControl.name || selectedControl.title}
                </Text>
                <Text style={styles.detailSub}>
                  {selectedControl.framework || 'SOC 2'} • Logical & physical access
                </Text>

                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailBody}>
                  {selectedControl.description ||
                    'Review user access to critical systems every quarter. Confirm permissions follow least privilege and remove access that is no longer required.'}
                </Text>

                <View style={styles.detailMetaRow}>
                  <Text style={styles.mutedSmall}>Control owner</Text>
                  <Text style={styles.detailMetaVal}>
                    {selectedControl.updatedBy || 'Alex Morgan'}
                  </Text>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.mutedSmall}>Last Updated</Text>
                  <Text style={styles.detailMetaVal}>Nov 24, 2026</Text>
                </View>

                <Text style={styles.fieldLabel}>Evidence Note</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Add evidence note..."
                  placeholderTextColor="#94A3B8"
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                />

                <Pressable
                  style={styles.blueBtn}
                  onPress={() =>
                    handleUpdateControl(selectedControl, {
                      evidence: noteDraft,
                      evidenceNote: noteDraft,
                    })
                  }
                >
                  <Text style={styles.blueBtnText}>Update Status</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}

          {/* MAIN TAB: HOME / OVERVIEW (SCREENS 06 & 16) */}
          {!subScreen && activeTab === 'home' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.homeTopBar}>
                <View style={styles.brandRow}>
                  <View style={styles.logoBadge}>
                    <Text style={styles.logoText}>CG</Text>
                  </View>
                  <View>
                    <Pressable onPress={() => goToWorkspaceScreen()}>
                      <Text style={styles.homeOrgName}>{companyDisplayName} ⌄</Text>
                    </Pressable>
                    <Text style={styles.homeOrgSub}>
                      {selectedOrg ? `${selectedOrg.framework || 'SOC 2'} • ${activeRole}` : 'Your workspace • Admin'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.bellBtn}
                  onPress={() => setSubScreen('notifications')}
                >
                  <Text style={styles.bellGlyph}>🔔</Text>
                  {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
                </Pressable>
              </View>

              <View style={styles.overviewHeaderRow}>
                <Text style={styles.overviewHeading}>Overview</Text>
                <Text style={styles.dateLabel}>Tue, Nov 24</Text>
              </View>

              <View style={styles.blueHeroCard}>
                <View style={styles.blueHeroTop}>
                  <Text style={styles.blueHeroLabel}>Compliance Readiness</Text>
                  <Pressable onPress={() => setActiveTab('controls')}>
                    <Text style={styles.blueHeroChevron}>›</Text>
                  </Pressable>
                </View>
                <Text style={styles.blueHeroPercent}>{readinessScore}%</Text>
                <View style={styles.blueProgressTrack}>
                  <View style={[styles.blueProgressFill, { width: `${readinessScore}%` }]} />
                </View>
                <Text style={styles.blueHeroCaption}>
                  {totalCount === 0
                    ? '0 controls added'
                    : `${compliantCount} of ${totalCount} controls are compliant`}
                </Text>
              </View>

              <View style={styles.stats2x2}>
                <View style={styles.statTile}>
                  <Text style={styles.statNumBlue}>{totalCount}</Text>
                  <Text style={styles.statLabel}>Total Controls</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statNumBlue}>{compliantCount}</Text>
                  <Text style={styles.statLabel}>Compliant</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statNumBlue}>{inProgressCount}</Text>
                  <Text style={styles.statLabel}>In Progress</Text>
                </View>
                <View style={styles.statTile}>
                  <Text style={styles.statNumBlue}>{nonCompliantCount}</Text>
                  <Text style={styles.statLabel}>Non-Compliant</Text>
                </View>
              </View>

              {totalCount === 0 && !loadingControls ? (
                <View style={styles.emptyShieldCard}>
                  <View style={styles.shieldCircle}>
                    <Text style={styles.shieldEmoji}>🛡</Text>
                  </View>
                  <Text style={styles.emptyBoldTitle}>No controls added yet.</Text>
                  <Text style={styles.emptySubText}>
                    Start building your compliance readiness by adding your first control.
                  </Text>
                  {!isAuditor && (
                    <Pressable
                      style={[styles.blueBtn, { width: '100%' }]}
                      onPress={() => {
                        setActiveTab('controls');
                        setShowAddControl(true);
                      }}
                    >
                      <Text style={styles.blueBtnText}>Add Your First Control</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.listCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.listCardTitle}>Workspace Controls</Text>
                    <Pressable onPress={() => loadDashboardData(selectedOrg, true)}>
                      <Text style={styles.inlineBlueLink}>
                        {syncingData ? 'Syncing...' : 'Sync'}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    style={styles.blueBtn}
                    onPress={() => setActiveTab('controls')}
                  >
                    <Text style={styles.blueBtnText}>Manage Controls ({totalCount})</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          )}

          {/* MAIN TAB: CONTROLS (SCREENS 07, 09 & 17) */}
          {!subScreen && activeTab === 'controls' && (
            <ScrollView contentContainerStyle={styles.dashScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setActiveTab('home')}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <Text style={styles.subHeaderTitle}>Controls</Text>
              </View>

              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchTextInput}
                  placeholder="Search by ID or title"
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {['All', ...STATUS_OPTIONS].map((st) => {
                  const active = statusFilter === st;
                  return (
                    <Pressable
                      key={st}
                      style={[styles.filterPill, active && styles.activeFilterPill]}
                      onPress={() => setStatusFilter(st)}
                    >
                      <Text style={[styles.filterPillText, active && styles.activeFilterPillText]}>
                        {st}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.countMetaLine}>
                {totalCount} controls • {nonCompliantCount} need attention
              </Text>

              {showAddControl && !isAuditor && (
                <View style={styles.formCard}>
                  <Text style={styles.listCardTitle}>Add Control</Text>

                  <Text style={styles.fieldLabel}>Control ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. CC6.1"
                    placeholderTextColor="#94A3B8"
                    value={newCode}
                    onChangeText={setNewCode}
                  />

                  <Text style={styles.fieldLabel}>Control Title</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Enter a descriptive control title"
                    placeholderTextColor="#94A3B8"
                    value={newTitle}
                    onChangeText={setNewTitle}
                  />

                  <Text style={styles.fieldLabel}>Framework</Text>
                  <View style={styles.chipsWrap}>
                    {FRAMEWORKS.map((fw) => (
                      <Pressable
                        key={fw}
                        style={[styles.chip, newFramework === fw && styles.activeChip]}
                        onPress={() => setNewFramework(fw)}
                      >
                        <Text style={[styles.chipText, newFramework === fw && styles.activeChipText]}>
                          {fw}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Describe the control and its requirements"
                    placeholderTextColor="#94A3B8"
                    value={newDescription}
                    onChangeText={setNewDescription}
                  />

                  <Text style={styles.fieldLabel}>Status</Text>
                  <View style={styles.chipsWrap}>
                    {STATUS_OPTIONS.map((st) => (
                      <Pressable
                        key={st}
                        style={[styles.chip, newStatus === st && styles.activeChip]}
                        onPress={() => setNewStatus(st)}
                      >
                        <Text style={[styles.chipText, newStatus === st && styles.activeChipText]}>
                          {st}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Evidence Note</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="PDF, DOCX, PNG • Evidence note"
                    placeholderTextColor="#94A3B8"
                    value={newEvidence}
                    onChangeText={setNewEvidence}
                  />

                  <Text style={styles.fieldLabel}>Owner</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="Alex Morgan"
                    placeholderTextColor="#94A3B8"
                    value={newOwner}
                    onChangeText={setNewOwner}
                  />

                  <View style={styles.twoBtnRow}>
                    <Pressable
                      style={styles.cancelHalfBtn}
                      onPress={() => setShowAddControl(false)}
                    >
                      <Text style={styles.cancelHalfText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={styles.saveHalfBtn}
                      onPress={handleAddControl}
                      disabled={savingControl}
                    >
                      <Text style={styles.saveHalfText}>
                        {savingControl ? 'Saving...' : 'Save'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {loadingControls ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator size="small" color="#2554D7" />
                  <Text style={styles.mutedSmall}>Loading controls...</Text>
                </View>
              ) : filteredControls.length === 0 ? (
                <View style={styles.emptyShieldCard}>
                  <View style={styles.shieldCircle}>
                    <Text style={styles.shieldEmoji}>🛡</Text>
                  </View>
                  <Text style={styles.emptyBoldTitle}>No controls added yet.</Text>
                  <Text style={styles.emptySubText}>
                    Add your first control to start tracking compliance for your company.
                  </Text>
                  {!isAuditor && (
                    <Pressable
                      style={[styles.blueBtn, { width: '100%' }]}
                      onPress={() => setShowAddControl(true)}
                    >
                      <Text style={styles.blueBtnText}>Add Your First Control</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                filteredControls.map((ctrl, idx) => {
                  const id = ctrl._id || ctrl.id || idx;
                  const isEditingNote = editingNoteId === id;
                  const isConfirmingDel = confirmDeleteId === id;
                  const proofText = ctrl.evidence || ctrl.evidenceNote || '';

                  return (
                    <View key={id} style={styles.controlCard}>
                      <View style={styles.controlTopRow}>
                        <Text style={styles.codeLabel}>
                          {ctrl.code || ctrl.id || `CC${idx + 1}.1`}
                        </Text>
                        <Pressable
                          onPress={() => {
                            setSelectedControl(ctrl);
                            setNoteDraft(proofText);
                            setSubScreen('detail');
                          }}
                        >
                          <Text style={styles.dotsMore}>•••</Text>
                        </Pressable>
                      </View>

                      <Pressable
                        onPress={() => {
                          setSelectedControl(ctrl);
                          setNoteDraft(proofText);
                          setSubScreen('detail');
                        }}
                      >
                        <Text style={styles.controlTitle}>{ctrl.title || ctrl.name}</Text>
                      </Pressable>

                      <View style={styles.controlBottomMeta}>
                        <Text style={styles.fwLabel}>{ctrl.framework || 'SOC 2'}</Text>
                        <View
                          style={[
                            styles.statusTagBadge,
                            ctrl.status === 'Compliant'
                              ? styles.badgeGreen
                              : ctrl.status === 'In Progress'
                              ? styles.badgeYellow
                              : styles.badgeRed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusTagText,
                              ctrl.status === 'Compliant'
                                ? styles.textGreen
                                : ctrl.status === 'In Progress'
                                ? styles.textYellow
                                : styles.textRed,
                            ]}
                          >
                            • {ctrl.status || 'In Progress'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.statusRow}>
                        {STATUS_OPTIONS.map((st) => {
                          const active = ctrl.status === st;
                          return (
                            <Pressable
                              key={st}
                              style={[styles.miniStatusChip, active && styles.miniStatusActive]}
                              onPress={() => handleUpdateControl(ctrl, { status: st })}
                            >
                              <Text
                                style={[
                                  styles.miniStatusText,
                                  active && styles.miniStatusTextActive,
                                ]}
                              >
                                {st}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {isEditingNote ? (
                        <View style={styles.noteEditBox}>
                          <TextInput
                            style={styles.fieldInput}
                            placeholder="Add evidence note..."
                            placeholderTextColor="#94A3B8"
                            value={noteDraft}
                            onChangeText={setNoteDraft}
                          />
                          <View style={styles.twoBtnRow}>
                            <Pressable
                              style={styles.saveHalfBtn}
                              onPress={() => {
                                handleUpdateControl(ctrl, {
                                  evidence: noteDraft,
                                  evidenceNote: noteDraft,
                                });
                                setEditingNoteId(null);
                              }}
                            >
                              <Text style={styles.saveHalfText}>Save Proof</Text>
                            </Pressable>
                            <Pressable
                              style={styles.cancelHalfBtn}
                              onPress={() => setEditingNoteId(null)}
                            >
                              <Text style={styles.cancelHalfText}>Cancel</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.evidenceRow}>
                          <Text style={styles.evidenceText} numberOfLines={1}>
                            Evidence: {proofText || 'None'}
                          </Text>
                          {!isAuditor && (
                            <Pressable
                              onPress={() => {
                                setEditingNoteId(id);
                                setNoteDraft(proofText);
                              }}
                            >
                              <Text style={styles.inlineBlueLink}>
                                {proofText ? 'Edit' : '+ Proof'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}

                      {isSuperAdmin && (
                        <View style={styles.deleteBar}>
                          {isConfirmingDel ? (
                            <View style={styles.confirmDelRow}>
                              <Text style={styles.mutedSmall}>Delete control?</Text>
                              <Pressable onPress={() => handleDeleteControl(id)}>
                                <Text style={styles.dangerLink}>Yes, Delete</Text>
                              </Pressable>
                              <Pressable onPress={() => setConfirmDeleteId(null)}>
                                <Text style={styles.mutedSmall}>Cancel</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <Pressable onPress={() => setConfirmDeleteId(id)}>
                              <Text style={styles.dangerLink}>Delete Control</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {!isAuditor && (
                <Pressable
                  style={styles.blueBtn}
                  onPress={() => setShowAddControl((prev) => !prev)}
                >
                  <Text style={styles.blueBtnText}>
                    {showAddControl ? 'Close Form' : '+ Add Control'}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          )}

          {/* MAIN TAB: PROFILE (SCREEN 10) */}
          {!subScreen && activeTab === 'profile' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <Text style={styles.pageTitleLarge}>Profile</Text>

              <View style={styles.profileCenterBlock}>
                <View style={styles.avatarRing}>
                  {PROFILE_PHOTO ? (
                    <Image source={PROFILE_PHOTO} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarFallbackText}>
                      {profileDisplayName.slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.profileNameText}>{profileDisplayName}</Text>
                <Text style={styles.profileEmailText}>{profileDisplayEmail}</Text>
              </View>

              <Pressable style={styles.orgSummaryCard} onPress={() => goToWorkspaceScreen()}>
                <View style={styles.orgIconBox}>
                  <Text style={styles.orgIconGlyph}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgCardTitle}>{companyDisplayName}</Text>
                  <Text style={styles.orgCardSub}>Organization administrator</Text>
                </View>
              </Pressable>

              <Text style={styles.sectionCaps}>YOUR ACCOUNT</Text>

              <View style={styles.menuGroupCard}>
                <Pressable style={styles.menuRow} onPress={() => setSubScreen('activity')}>
                  <Text style={styles.menuLeftIcon}>📈</Text>
                  <Text style={styles.menuRowLabel}>My Activity</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>

                <View style={styles.rowDivider} />

                <Pressable style={styles.menuRow} onPress={() => setSubScreen('notifications')}>
                  <Text style={styles.menuLeftIcon}>🔔</Text>
                  <Text style={styles.menuRowLabel}>Notifications</Text>
                  {unreadCount > 0 ? (
                    <View style={styles.countCircleBadge}>
                      <Text style={styles.countCircleText}>{unreadCount}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>

                <View style={styles.rowDivider} />

                <Pressable style={styles.menuRow} onPress={() => setSubScreen('support')}>
                  <Text style={styles.menuLeftIcon}>🎧</Text>
                  <Text style={styles.menuRowLabel}>Help &amp; Support</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>

                <View style={styles.rowDivider} />

                <Pressable style={styles.menuRow} onPress={() => setSubScreen('about')}>
                  <Text style={styles.menuLeftIcon}>ⓘ</Text>
                  <Text style={styles.menuRowLabel}>About App</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>

                <View style={styles.rowDivider} />

                <Pressable style={styles.menuRow} onPress={handleSignOut}>
                  <Text style={styles.logoutIconRed}>↪</Text>
                  <Text style={styles.logoutLabelRed}>Logout</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>
              </View>

              <Text style={styles.footerTagline}>
                Your workspace. Your compliance journey.
              </Text>
            </ScrollView>
          )}

          {/* MAIN TAB: SETTINGS (SCREEN 11) */}
          {!subScreen && activeTab === 'settings' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <Text style={styles.pageTitleLarge}>Settings</Text>
              <Text style={styles.pageSubMuted}>Make ComplianceGuard work for you.</Text>

              <Text style={styles.sectionCaps}>PREFERENCES</Text>
              <View style={styles.menuGroupCard}>
                <View style={styles.menuRow}>
                  <Text style={styles.menuLeftIcon}>☀</Text>
                  <Text style={styles.menuRowLabel}>Appearance</Text>
                  <Text style={styles.menuRightValue}>Light ›</Text>
                </View>

                <View style={styles.rowDivider} />

                <View style={styles.menuRow}>
                  <Text style={styles.menuLeftIcon}>🌐</Text>
                  <Text style={styles.menuRowLabel}>Language</Text>
                  <Text style={styles.menuRightValue}>English ›</Text>
                </View>
              </View>

              <Text style={styles.sectionCaps}>SECURITY &amp; DATA</Text>
              <View style={styles.menuGroupCard}>
                <Pressable
                  style={styles.menuRow}
                  onPress={() => showToast('Password, biometrics & permissions active')}
                >
                  <Text style={styles.menuLeftIcon}>🛡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowLabel}>Security &amp; Privacy</Text>
                    <Text style={styles.menuRowSub}>
                      Password, biometrics &amp; permissions
                    </Text>
                  </View>
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>

                <View style={styles.rowDivider} />

                <Pressable
                  style={styles.menuRow}
                  onPress={() => loadDashboardData(selectedOrg, true)}
                >
                  <Text style={styles.menuLeftIcon}>🔄</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowLabel}>Data Sync</Text>
                    <Text style={styles.menuRowSub}>
                      Synced just now • Auto-sync on
                    </Text>
                  </View>
                  <Text style={styles.menuChevron}>›</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionCaps}>APPLICATION</Text>
              <View style={styles.menuGroupCard}>
                <Pressable style={styles.menuRow} onPress={() => setSubScreen('about')}>
                  <Text style={styles.menuLeftIcon}>ⓘ</Text>
                  <Text style={styles.menuRowLabel}>About Application</Text>
                  <Text style={styles.menuRightValue}>v1.0.0 ›</Text>
                </Pressable>
              </View>

              <Pressable style={styles.logoutCardBtn} onPress={handleSignOut}>
                <Text style={styles.logoutIconRed}>↪</Text>
                <Text style={styles.logoutLabelRed}>Logout</Text>
                <Text style={styles.menuChevron}>›</Text>
              </Pressable>

              <Text style={styles.footerTagline}>ComplianceGuard • Version 1.0.0</Text>
            </ScrollView>
          )}

          {/* BOTTOM NAVIGATION BAR (HOME, CONTROLS, PROFILE, SETTINGS) */}
          <View style={styles.bottomNav}>
            {[
              { id: 'home', icon: '⌂', label: 'Home' },
              { id: 'controls', icon: '☰', label: 'Controls' },
              { id: 'profile', icon: '👤', label: 'Profile' },
              { id: 'settings', icon: '⚙', label: 'Settings' },
            ].map((tab) => {
              const active = !subScreen && activeTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={styles.navTabBtn}
                  onPress={() => {
                    setSubScreen(null);
                    setActiveTab(tab.id);
                  }}
                >
                  <Text style={[styles.navIcon, active && styles.navActiveColor]}>
                    {tab.icon}
                  </Text>
                  <Text style={[styles.navLabel, active && styles.navActiveColor]}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // =========================================================
  // WORKSPACE / EMPTY WORKSPACE SCREEN (SCREEN 14)
  // =========================================================
  if (screen === 'workspace') {
    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={styles.mobileFrame}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <BrandTopBar
              rightAction={
                <Pressable style={styles.ghostPill} onPress={handleSignOut}>
                  <Text style={styles.skipText}>Logout</Text>
                </Pressable>
              }
            />

            {apiError ? (
              <View style={styles.alertErrorBox}>
                <Text style={styles.errorText}>{apiError}</Text>
              </View>
            ) : null}

            {loadingOrgs ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color="#2554D7" />
                <Text style={styles.mutedSmall}>Loading workspace...</Text>
              </View>
            ) : orgs.length === 0 ? (
              <View style={styles.emptyWorkspaceCenter}>
                <Text style={styles.welcomeBigTitle}>Welcome to{'\n'}ComplianceGuard!</Text>
                <Text style={styles.welcomeSubLine}>
                  Your workspace is ready to get started.
                </Text>

                <View style={styles.shieldCircleLarge}>
                  <Text style={styles.shieldEmojiLarge}>🛡</Text>
                </View>

                <Text style={styles.createPromptText}>
                  Create your company to begin tracking compliance and audit readiness.
                </Text>

                <Pressable
                  style={[styles.blueBtn, { width: '100%' }]}
                  onPress={openCreateCompanyScreen}
                >
                  <Text style={styles.blueBtnText}>Create Your Company</Text>
                </Pressable>

                <Pressable onPress={() => loadOrganizations()}>
                  <Text style={styles.learnMoreLink}>Refresh Workspaces</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.authBlock}>
                <Text style={styles.uppercaseSection}>YOUR WORKSPACES</Text>
                <Text style={styles.authSub}>
                  {currentUser?.email} • {activeRole}
                </Text>

                <View style={styles.listGap}>
                  {orgs.map((item, idx) => {
                    const id = item._id || item.id || idx;
                    return (
                      <Pressable
                        key={id}
                        style={styles.orgSelectCard}
                        onPress={() => openWorkspaceDashboard(item)}
                      >
                        <Text style={styles.orgSelectName}>
                          {item.name || 'Your Company'}
                        </Text>
                        <Text style={styles.orgSelectMeta}>
                          {item.framework || 'SOC 2'} • {item.cloud || 'AWS'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable style={styles.blueBtn} onPress={openCreateCompanyScreen}>
                  <Text style={styles.blueBtnText}>Create Your Company</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // =========================================================
  // ONBOARDING SCREENS (SCREENS 01, 02 & 03)
  // =========================================================
  return (
    <View style={styles.outerFrame}>
      <SafeAreaView style={styles.mobileFrame}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        <BrandTopBar
          rightAction={
            !isLastStep ? (
              <Pressable style={styles.ghostPill} onPress={() => goToAuthScreen('login')}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            ) : null
          }
        />

        <View style={styles.onboardCenter}>
          <View style={styles.shieldCircleLarge}>
            <Text style={styles.shieldEmojiLarge}>🛡</Text>
          </View>

          <Text style={styles.onboardEyebrow}>{currentSlide.eyebrow}</Text>
          <Text style={styles.onboardTitle}>{currentSlide.title}</Text>
          <Text style={styles.onboardSubtitle}>{currentSlide.subtitle}</Text>

          <View style={styles.dotsRow}>
            {ONBOARDING_SLIDES.map((_, idx) => (
              <View
                key={idx}
                style={[styles.dot, idx === stepIndex ? styles.activeDot : styles.inactiveDot]}
              />
            ))}
          </View>
        </View>

        <View style={styles.onboardBottom}>
          <Pressable style={styles.blueBtn} onPress={handleNext}>
            <Text style={styles.blueBtnText}>{currentSlide.cta}   →</Text>
          </Pressable>

          <View style={styles.centerRow}>
            <Text style={styles.mutedSmall}>Already have an account? </Text>
            <Pressable onPress={() => goToAuthScreen('login')}>
              <Text style={styles.inlineBlueLink}>Sign in</Text>
            </Pressable>
            {stepIndex > 0 && (
              <Pressable onPress={handleBack} style={{ marginLeft: 14 }}>
                <Text style={styles.mutedSmall}>Back</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const TOP_SAFE = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12;
const BLUE_PRIMARY = '#2554D7';

const styles = StyleSheet.create({
  outerFrame: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  mobileFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: '#FFFFFF',
    paddingTop: TOP_SAFE,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  dashScroll: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    backgroundColor: BLUE_PRIMARY,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE_PRIMARY,
    letterSpacing: -0.2,
  },
  ghostPill: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  onboardCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  onboardEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.7,
    marginTop: 22,
    textAlign: 'center',
  },
  onboardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 35,
  },
  onboardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
  },
  dot: {
    height: 6,
    borderRadius: 999,
  },
  activeDot: {
    width: 22,
    backgroundColor: BLUE_PRIMARY,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#CBD5E1',
  },
  onboardBottom: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  authBlock: {
    marginTop: 10,
  },
  uppercaseSection: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  authSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeBtn: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
  forgotLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_PRIMARY,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: BLUE_PRIMARY,
    borderColor: BLUE_PRIMARY,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
  blueBtn: {
    backgroundColor: BLUE_PRIMARY,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  blueBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  centerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  mutedSmall: {
    fontSize: 12,
    color: '#64748B',
  },
  inlineBlueLink: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_PRIMARY,
  },
  orDivider: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginVertical: 12,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 11,
  },
  googleLogo: {
    fontSize: 15,
    fontWeight: '800',
    color: BLUE_PRIMARY,
  },
  googleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  secureFootnote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 14,
  },
  lockIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockIconGlyph: {
    fontSize: 20,
  },
  backToLoginBtn: {
    alignItems: 'center',
    marginTop: 14,
  },
  backToLoginText: {
    fontSize: 13,
    fontWeight: '600',
    color: BLUE_PRIMARY,
  },
  infoHintCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 18,
  },
  infoHintTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  infoHintDesc: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
  },
  alertErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  alertInfoBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  infoText: {
    color: BLUE_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyWorkspaceCenter: {
    alignItems: 'center',
    paddingTop: 18,
    paddingHorizontal: 8,
  },
  welcomeBigTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 32,
  },
  welcomeSubLine: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
  },
  shieldCircleLarge: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldEmojiLarge: {
    fontSize: 54,
  },
  shieldCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shieldEmoji: {
    fontSize: 38,
  },
  createPromptText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    lineHeight: 19,
  },
  learnMoreLink: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_PRIMARY,
    marginTop: 14,
  },
  listGap: {
    gap: 10,
    marginTop: 10,
  },
  orgSelectCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  orgSelectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  orgSelectMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  backChevron: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 28,
  },
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subHeaderSub: {
    fontSize: 12,
    color: '#64748B',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  activeChip: {
    backgroundColor: BLUE_PRIMARY,
    borderColor: BLUE_PRIMARY,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  fwRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  fwBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  fwBoxActive: {
    borderColor: BLUE_PRIMARY,
    backgroundColor: '#EFF6FF',
  },
  sqCheck: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sqCheckActive: {
    backgroundColor: BLUE_PRIMARY,
    borderColor: BLUE_PRIMARY,
  },
  fwBoxText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  fwBoxTextActive: {
    color: BLUE_PRIMARY,
  },
  toastBox: {
    backgroundColor: '#EFF6FF',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_PRIMARY,
  },
  homeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  homeOrgName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  homeOrgSub: {
    fontSize: 11,
    color: '#64748B',
  },
  bellBtn: {
    padding: 6,
    position: 'relative',
  },
  bellGlyph: {
    fontSize: 18,
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  overviewHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  blueHeroCard: {
    backgroundColor: BLUE_PRIMARY,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  blueHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blueHeroLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  blueHeroChevron: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  blueHeroPercent: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  blueProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  blueProgressFill: {
    height: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  blueHeroCaption: {
    fontSize: 11,
    color: '#DBEAFE',
    marginTop: 8,
  },
  stats2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  statTile: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statNumBlue: {
    fontSize: 20,
    fontWeight: '800',
    color: BLUE_PRIMARY,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 3,
  },
  emptyShieldCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  emptyBoldTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  listCardSub: {
    fontSize: 13,
    color: '#475569',
  },
  listCardMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 6,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchTextInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  filterRow: {
    gap: 8,
    marginBottom: 8,
  },
  filterPill: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  activeFilterPill: {
    backgroundColor: BLUE_PRIMARY,
    borderColor: BLUE_PRIMARY,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
  },
  countMetaLine: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  formCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  twoBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelHalfBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelHalfText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  saveHalfBtn: {
    flex: 1,
    backgroundColor: BLUE_PRIMARY,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveHalfText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loaderBox: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  controlCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  controlTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  dotsMore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  controlTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  controlBottomMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  fwLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgeYellow: {
    backgroundColor: '#FFFBEB',
  },
  badgeRed: {
    backgroundColor: '#FEF2F2',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textGreen: {
    color: '#059669',
  },
  textYellow: {
    color: '#D97706',
  },
  textRed: {
    color: '#DC2626',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  miniStatusChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F8FAFC',
  },
  miniStatusActive: {
    backgroundColor: '#EFF6FF',
    borderColor: BLUE_PRIMARY,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  miniStatusTextActive: {
    color: BLUE_PRIMARY,
    fontWeight: '700',
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  evidenceText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
  },
  noteEditBox: {
    marginTop: 8,
  },
  deleteBar: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmDelRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  dangerLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  detailCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  detailTopMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amberBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  amberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
  },
  detailSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 4,
  },
  detailBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  detailMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  pageTitleLarge: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  pageSubMuted: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  profileCenterBlock: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  avatarRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallbackText: {
    fontSize: 24,
    fontWeight: '800',
    color: BLUE_PRIMARY,
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 10,
  },
  profileEmailText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  orgSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  orgIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgIconGlyph: {
    fontSize: 16,
  },
  orgCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  orgCardSub: {
    fontSize: 11,
    color: '#64748B',
  },
  sectionCaps: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 6,
  },
  menuGroupCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 10,
  },
  menuLeftIcon: {
    fontSize: 14,
    color: '#475569',
    width: 20,
    textAlign: 'center',
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuRowSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  menuRightValue: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  menuChevron: {
    fontSize: 16,
    color: '#94A3B8',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 44,
  },
  countCircleBadge: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countCircleText: {
    fontSize: 11,
    fontWeight: '800',
    color: BLUE_PRIMARY,
  },
  logoutIconRed: {
    fontSize: 14,
    color: '#EF4444',
    width: 20,
    textAlign: 'center',
    fontWeight: '700',
  },
  logoutLabelRed: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  logoutCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
    gap: 10,
  },
  footerTagline: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 14,
    marginBottom: 6,
  },
  notifTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notifSubCount: {
    fontSize: 11,
    color: '#64748B',
  },
  markAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE_PRIMARY,
  },
  notifFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  notifChip: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
  },
  notifChipActive: {
    backgroundColor: BLUE_PRIMARY,
    borderColor: BLUE_PRIMARY,
  },
  notifChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  notifChipTextActive: {
    color: '#FFFFFF',
  },
  notifCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  notifCardUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#DBEAFE',
  },
  notifGlyph: {
    fontSize: 15,
    marginTop: 2,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: BLUE_PRIMARY,
  },
  notifBody: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 17,
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  supportHeroBox: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  supportCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  supportHeadset: {
    fontSize: 26,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  supportSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  faqHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 8,
  },
  faqCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  faqChevron: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  faqAnswer: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 17,
  },
  supportReplyNote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 6,
  },
  navTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navIcon: {
    fontSize: 15,
    color: '#64748B',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  navActiveColor: {
    color: BLUE_PRIMARY,
    fontWeight: '700',
  },
});