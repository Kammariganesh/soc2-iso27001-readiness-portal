import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Platform,
  BackHandler,
} from 'react-native';

const API_BASE = 'https://soc2-iso27001-readiness-portal.onrender.com/api';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

const ONBOARDING_SLIDES = [
  {
    badge: 'STEP 1 OF 3 • ONBOARDING',
    title: 'Simple and Clear App Onboarding',
    subtitle:
      'Set up SOC 2 and ISO 27001 readiness from your phone with clear mobile-first flows.',
    highlight: 'SOC 2 • ISO 27001',
  },
  {
    badge: 'STEP 2 OF 3 • CONTROLS & EVIDENCE',
    title: 'Track Controls & Audit Evidence',
    subtitle:
      'Monitor control statuses, attach audit proof notes, and switch roles (Super Admin, Editor, Auditor).',
    highlight: 'Real-Time MongoDB Sync',
  },
  {
    badge: 'STEP 3 OF 3 • AUDIT READINESS',
    title: 'Stay Ready for Audits Anywhere',
    subtitle:
      'Check organization readiness scores, manage team access, and review audit reports smoothly.',
    highlight: 'Connected to Live API',
  },
];

const STATUS_OPTIONS = ['Compliant', 'In Progress', 'Non-Compliant'];
const ROLES = ['Super Admin', 'Editor', 'Auditor'];

export default function App() {
  // 'onboarding' | 'auth' | 'workspace' | 'dashboard'
  const [screen, setScreen] = useState('onboarding');
  const [stepIndex, setStepIndex] = useState(0);

  // Auth state ('login' | 'signup' | 'forgot')
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Forgot Password OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const [authRole, setAuthRole] = useState('Super Admin');
  const [authError, setAuthError] = useState('');
  const [authInfo, setAuthInfo] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Screen 2: Workspaces
  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [apiError, setApiError] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [framework, setFramework] = useState('SOC 2 Type II');
  const [cloudEnv, setCloudEnv] = useState('AWS');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Dashboard Tabs ('dashboard' | 'controls' | 'profile' | 'settings')
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRole, setActiveRole] = useState('Super Admin');
  const [syncingData, setSyncingData] = useState(false);

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
  const [newCategory, setNewCategory] = useState('Access Control');
  const [newOwner, setNewOwner] = useState('Security Lead');
  const [savingControl, setSavingControl] = useState(false);

  // Members state (Profile / Team)
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

  const showToast = (msg) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(''), 3000);
  };

  // Handle Android Hardware Back Button inside App
  useEffect(() => {
    const onHardwareBack = () => {
      if (screen === 'dashboard') {
        if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
          return true;
        }
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
      return false; // Only exit on first onboarding screen
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => subscription.remove();
  }, [screen, activeTab, authMode, stepIndex]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    setApiError('');
    try {
      const res = await fetch(`${API_BASE}/organizations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.organizations || [];
      setOrgs(list);
    } catch (err) {
      setApiError('Unable to load workspaces from server. You can retry or create one.');
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

  const goToAuthScreen = () => {
    setAuthError('');
    setAuthInfo('');
    setScreen('auth');
  };

  const goToWorkspaceScreen = () => {
    setScreen('workspace');
    loadOrganizations();
  };

  const openWorkspaceDashboard = (org) => {
    setSelectedOrg(org);
    setActiveTab('dashboard');
    setScreen('dashboard');
    loadDashboardData(org, false);
  };

  const handleNext = () => {
    if (!isLastStep) {
      setStepIndex((prev) => prev + 1);
    } else {
      goToAuthScreen();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((prev) => prev - 1);
  };

  const handleAuthSubmit = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanPassword = authPassword.trim();
    const cleanName = authName.trim();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setAuthError('Enter a valid email address (e.g. name@company.com or name@gmail.com).');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setAuthError('Password must be at least 4 characters.');
      return;
    }
    if (authMode === 'signup' && !cleanName) {
      setAuthError('Please enter your full name to sign up.');
      return;
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

      setCurrentUser({
        name: verifiedUser.name,
        email: verifiedUser.email,
        role: verifiedUser.role || authRole,
        authMethod: authMode === 'signup' ? 'Signed Up' : 'Signed In',
      });
      setActiveRole(verifiedUser.role || authRole);
      goToWorkspaceScreen();
    } catch (err) {
      setAuthError('Could not reach server. Please check internet and try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendResetOtp = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail)) {
      setAuthError('Enter a valid registered email (e.g. name@company.com).');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    setAuthInfo('');

    try {
      const res = await fetch(`${API_BASE}/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAuthError(data.error || 'Could not send OTP.');
        return;
      }

      setOtpSent(true);
      setAuthInfo(
        data.demoOtp
          ? `OTP Sent! Verification Code: ${data.demoOtp}`
          : '6-digit OTP sent to your registered email.'
      );
    } catch (err) {
      setAuthError('Server error while sending OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtpAndReset = async () => {
    const cleanEmail = authEmail.trim().toLowerCase();
    const cleanOtp = otpInput.trim();
    const cleanNewPass = resetNewPassword.trim();

    if (cleanOtp.length !== 6) {
      setAuthError('Enter the 6-digit OTP.');
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
    setAuthRole('Super Admin');
    setAuthError('');
    setAuthInfo('Demo credentials filled. Tap Sign In.');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setSelectedOrg(null);
    setAuthPassword('');
    setAuthInfo('');
    setAuthMode('login');
    setScreen('auth');
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim() || !EMAIL_REGEX.test(contactEmail.trim())) {
      setApiError('Enter Organization Name and a valid Contact Email (e.g. security@company.com).');
      return;
    }
    setCreatingOrg(true);
    setApiError('');
    try {
      const res = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          email: contactEmail.trim(),
          framework,
          cloud: cloudEnv,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = await res.json();
      const newOrgObj = created.organization || created;
      setOrgName('');
      setContactEmail('');
      setShowCreateForm(false);
      await loadOrganizations();
      if (newOrgObj && (newOrgObj._id || newOrgObj.id || newOrgObj.name)) {
        openWorkspaceDashboard(newOrgObj);
      }
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

    try {
      await fetch(`${API_BASE}/controls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...control, ...updates }),
      });
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
      framework: selectedOrg?.framework || 'SOC 2',
      status: 'In Progress',
      evidence: '',
      orgId: selectedOrg?.id || selectedOrg?._id || 'ORG-101',
      updatedBy: activeRole,
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
        showToast('New control added');
      } else {
        setControls((prev) => [{ ...payload, _id: Date.now().toString() }, ...prev]);
        showToast('Control added locally');
      }
      setNewCode('');
      setNewTitle('');
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
      email: memberEmail.trim(),
      role: memberRole,
      orgId: selectedOrg?.id || selectedOrg?._id || 'ORG-101',
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

  // =========================================================
  // LOGIN, SIGN UP & FORGOT PASSWORD (OTP) SCREEN
  // =========================================================
  if (screen === 'auth') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>CG</Text>
              </View>
              <Text style={styles.brandName}>ComplianceGuard</Text>
            </View>

            <Pressable
              onPress={() => {
                setScreen('onboarding');
                setStepIndex(0);
              }}
            >
              <Text style={styles.skipText}>Back to Intro</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.badgeText}>ACCOUNT ACCESS • STEP 4</Text>
            <Text style={styles.sectionTitle}>
              {authMode === 'login'
                ? 'Sign In to Workspace'
                : authMode === 'signup'
                ? 'Create Account (Sign Up)'
                : 'Reset Password with OTP'}
            </Text>
            <Text style={styles.subtitle}>
              {authMode === 'login'
                ? 'Enter your registered email and password to continue.'
                : authMode === 'signup'
                ? 'Register with a valid domain email (e.g. name@company.com).'
                : otpSent
                ? 'Enter the 6-digit OTP sent to your email and set a new password.'
                : 'Enter your registered email to receive a 6-digit OTP.'}
            </Text>

            {authMode !== 'forgot' && (
              <View style={styles.modeToggleRow}>
                <Pressable
                  style={[styles.modeBtn, authMode === 'login' && styles.activeModeBtn]}
                  onPress={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthInfo('');
                  }}
                >
                  <Text
                    style={[
                      styles.modeBtnText,
                      authMode === 'login' && styles.activeModeBtnText,
                    ]}
                  >
                    Login
                  </Text>
                </Pressable>

                <Pressable
                  style={[styles.modeBtn, authMode === 'signup' && styles.activeModeBtn]}
                  onPress={() => {
                    setAuthMode('signup');
                    setAuthError('');
                    setAuthInfo('');
                  }}
                >
                  <Text
                    style={[
                      styles.modeBtnText,
                      authMode === 'signup' && styles.activeModeBtnText,
                    ]}
                  >
                    Sign Up
                  </Text>
                </Pressable>
              </View>
            )}

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
            {authInfo ? <Text style={styles.infoText}>{authInfo}</Text> : null}

            {authMode === 'forgot' ? (
              <>
                <Text style={styles.formLabel}>Registered Work Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!otpSent}
                  value={authEmail}
                  onChangeText={setAuthEmail}
                />

                {!otpSent ? (
                  <Pressable
                    style={[styles.primaryBtn, { marginTop: 14 }]}
                    onPress={handleSendResetOtp}
                    disabled={authLoading}
                  >
                    <Text style={styles.primaryBtnText}>
                      {authLoading ? 'Sending OTP...' : 'Send 6-Digit OTP →'}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <Text style={styles.formLabel}>Enter 6-Digit OTP</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 482910"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpInput}
                      onChangeText={setOtpInput}
                    />

                    <Text style={styles.formLabel}>New Password</Text>
                    <TextInput
                      style={[styles.input, { marginBottom: 14 }]}
                      placeholder="Enter new password (min 4 chars)"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      value={resetNewPassword}
                      onChangeText={setResetNewPassword}
                    />

                    <Pressable
                      style={styles.primaryBtn}
                      onPress={handleVerifyOtpAndReset}
                      disabled={authLoading}
                    >
                      <Text style={styles.primaryBtnText}>
                        {authLoading ? 'Verifying...' : 'Verify OTP & Save Password'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={styles.demoFillBtn}
                      onPress={handleSendResetOtp}
                      disabled={authLoading}
                    >
                      <Text style={styles.demoFillText}>Resend OTP</Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  style={styles.demoFillBtn}
                  onPress={() => {
                    setAuthMode('login');
                    setOtpSent(false);
                    setOtpInput('');
                    setAuthError('');
                    setAuthInfo('');
                  }}
                >
                  <Text style={styles.demoFillText}>← Back to Sign In</Text>
                </Pressable>
              </>
            ) : (
              <>
                {authMode === 'signup' && (
                  <>
                    <Text style={styles.formLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Ganesh Kumar"
                      placeholderTextColor="#94A3B8"
                      value={authName}
                      onChangeText={setAuthName}
                    />
                  </>
                )}

                <Text style={styles.formLabel}>Work Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@company.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                />

                <Text style={styles.formLabel}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter password (min 4 chars)"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  value={authPassword}
                  onChangeText={setAuthPassword}
                />

                {authMode === 'login' && (
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
                    <Text style={styles.forgotLinkText}>Forgot password? Reset via OTP</Text>
                  </Pressable>
                )}

                <Text style={styles.formLabel}>Select Access Role</Text>
                <View style={styles.chipsWrap}>
                  {ROLES.map((r) => (
                    <Pressable
                      key={r}
                      style={[styles.chip, authRole === r && styles.activeChip]}
                      onPress={() => setAuthRole(r)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          authRole === r && styles.activeChipText,
                        ]}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={styles.primaryBtn}
                  onPress={handleAuthSubmit}
                  disabled={authLoading}
                >
                  <Text style={styles.primaryBtnText}>
                    {authLoading
                      ? 'Please wait...'
                      : authMode === 'login'
                      ? 'Sign In →'
                      : 'Create Account & Continue →'}
                  </Text>
                </Pressable>

                <Pressable style={styles.demoFillBtn} onPress={handleQuickDemoFill}>
                  <Text style={styles.demoFillText}>Quick Fill Demo Credentials</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================
  // DASHBOARD + CONTROLS + PROFILE + SETTINGS TABS
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
        (c.framework || '').toLowerCase().includes(q) ||
        (c.updatedBy || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });

    return (
      <SafeAreaView style={styles.dashboardShell}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.dashHeader}>
          <View>
            <Text style={styles.dashOrgName} numberOfLines={1}>
              {selectedOrg?.name || 'ComplianceGuard'}
            </Text>
            <Text style={styles.dashSubMeta}>
              {activeRole} • {currentUser?.email || 'Member'}
            </Text>
          </View>

          <Pressable style={styles.switchPill} onPress={goToWorkspaceScreen}>
            <Text style={styles.switchPillText}>Workspaces</Text>
          </Pressable>
        </View>

        {statusBanner ? (
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{statusBanner}</Text>
          </View>
        ) : null}

        {activeTab === 'dashboard' && (
          <ScrollView contentContainerStyle={styles.dashScroll}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Text style={styles.summaryLabel}>COMPLIANCE READINESS DASHBOARD</Text>
                <Text style={styles.summaryPercent}>{readinessScore}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${readinessScore}%` }]} />
              </View>
              <Text style={styles.helperText}>
                Framework: {selectedOrg?.framework || 'SOC 2 Type II'} • Cloud:{' '}
                {selectedOrg?.cloud || selectedOrg?.cloudEnvironment || 'AWS'}
              </Text>
            </View>

            <View style={styles.reportGrid}>
              <View style={styles.reportBox}>
                <Text style={styles.reportNum}>{totalCount}</Text>
                <Text style={styles.reportLabel}>Total Controls</Text>
              </View>
              <View style={styles.reportBox}>
                <Text style={[styles.reportNum, { color: '#15803D' }]}>
                  {compliantCount}
                </Text>
                <Text style={styles.reportLabel}>Compliant</Text>
              </View>
              <View style={styles.reportBox}>
                <Text style={[styles.reportNum, { color: '#B45309' }]}>
                  {inProgressCount}
                </Text>
                <Text style={styles.reportLabel}>In Progress</Text>
              </View>
              <View style={styles.reportBox}>
                <Text style={[styles.reportNum, { color: '#B91C1C' }]}>
                  {nonCompliantCount}
                </Text>
                <Text style={styles.reportLabel}>Non-Compliant</Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.badgeText}>QUICK ACTIONS</Text>
              <Text style={styles.sectionTitleSmall}>Manage Compliance & Evidence</Text>
              <View style={styles.buttonRow}>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => setActiveTab('controls')}
                >
                  <Text style={styles.primaryBtnText}>Open Controls →</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => loadDashboardData(selectedOrg, true)}
                  disabled={syncingData}
                >
                  <Text style={styles.secondaryBtnText}>
                    {syncingData ? 'Syncing...' : 'Sync Data'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.helperText}>
                Sync Data refreshes controls & team records directly from MongoDB.
              </Text>
            </View>
          </ScrollView>
        )}

        {activeTab === 'controls' && (
          <ScrollView contentContainerStyle={styles.dashScroll}>
            <View style={styles.searchActionRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search ID, title, framework..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {!isAuditor && (
                <Pressable
                  style={styles.addBtn}
                  onPress={() => setShowAddControl((prev) => !prev)}
                >
                  <Text style={styles.addBtnText}>
                    {showAddControl ? 'Close' : '+ Control'}
                  </Text>
                </Pressable>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {['All', ...STATUS_OPTIONS].map((st) => (
                <Pressable
                  key={st}
                  style={[
                    styles.filterPill,
                    statusFilter === st && styles.activeFilterPill,
                  ]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      statusFilter === st && styles.activeFilterPillText,
                    ]}
                  >
                    {st}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {showAddControl && !isAuditor && (
              <View style={styles.formBox}>
                <Text style={styles.sectionTitleSmall}>New Compliance Control</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Control ID (e.g. CC6.1 or A.9.2)"
                  placeholderTextColor="#94A3B8"
                  value={newCode}
                  onChangeText={setNewCode}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Control Title (e.g. Enforce MFA for Admins)"
                  placeholderTextColor="#94A3B8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Category (e.g. Access Control)"
                  placeholderTextColor="#94A3B8"
                  value={newCategory}
                  onChangeText={setNewCategory}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8, marginBottom: 10 }]}
                  placeholder="Owner (e.g. Security Lead)"
                  placeholderTextColor="#94A3B8"
                  value={newOwner}
                  onChangeText={setNewOwner}
                />
                <Pressable
                  style={styles.primaryBtn}
                  onPress={handleAddControl}
                  disabled={savingControl}
                >
                  <Text style={styles.primaryBtnText}>
                    {savingControl ? 'Saving...' : 'Save Control'}
                  </Text>
                </Pressable>
              </View>
            )}

            {loadingControls ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color="#1D4ED8" />
                <Text style={styles.helperText}>Loading controls...</Text>
              </View>
            ) : filteredControls.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.helperText}>
                  No controls match this filter. Tap "+ Control" to add one.
                </Text>
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
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>
                          {ctrl.code || ctrl.id || `C-${idx + 1}`}
                        </Text>
                      </View>
                      <Text style={styles.categoryTag}>
                        {ctrl.framework || 'SOC 2'} • {ctrl.updatedBy || 'Admin'}
                      </Text>
                    </View>

                    <Text style={styles.controlTitle}>{ctrl.title || ctrl.name}</Text>

                    <View style={styles.statusRow}>
                      {STATUS_OPTIONS.map((st) => {
                        const active = ctrl.status === st;
                        return (
                          <Pressable
                            key={st}
                            style={[
                              styles.statusChip,
                              active &&
                                (st === 'Compliant'
                                  ? styles.statusCompliant
                                  : st === 'In Progress'
                                  ? styles.statusProgress
                                  : styles.statusNonCompliant),
                            ]}
                            onPress={() => handleUpdateControl(ctrl, { status: st })}
                          >
                            <Text
                              style={[
                                styles.statusChipText,
                                active && styles.statusChipTextActive,
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
                          style={styles.input}
                          placeholder="Add audit evidence link or proof note..."
                          placeholderTextColor="#94A3B8"
                          value={noteDraft}
                          onChangeText={setNoteDraft}
                        />
                        <View style={styles.noteBtnRow}>
                          <Pressable
                            style={styles.smallPrimaryBtn}
                            onPress={() => {
                              handleUpdateControl(ctrl, {
                                evidence: noteDraft,
                                evidenceNote: noteDraft,
                              });
                              setEditingNoteId(null);
                            }}
                          >
                            <Text style={styles.smallPrimaryBtnText}>Save Proof</Text>
                          </Pressable>
                          <Pressable
                            style={styles.smallSecondaryBtn}
                            onPress={() => setEditingNoteId(null)}
                          >
                            <Text style={styles.smallSecondaryBtnText}>Cancel</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.evidenceRow}>
                        <Text style={styles.evidenceText} numberOfLines={2}>
                          Evidence: {proofText || 'No proof note added yet'}
                        </Text>
                        {!isAuditor && (
                          <Pressable
                            onPress={() => {
                              setEditingNoteId(id);
                              setNoteDraft(proofText);
                            }}
                          >
                            <Text style={styles.linkAction}>
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
                            <Text style={styles.confirmDelLabel}>Delete control?</Text>
                            <Pressable onPress={() => handleDeleteControl(id)}>
                              <Text style={styles.dangerLink}>Yes, Delete</Text>
                            </Pressable>
                            <Pressable onPress={() => setConfirmDeleteId(null)}>
                              <Text style={styles.mutedLink}>Cancel</Text>
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
          </ScrollView>
        )}

        {activeTab === 'profile' && (
          <ScrollView contentContainerStyle={styles.dashScroll}>
            <View style={styles.card}>
              <Text style={styles.badgeText}>USER PROFILE</Text>
              <Text style={styles.sectionTitle}>
                {currentUser?.name || 'Compliance User'}
              </Text>
              <Text style={styles.subtitle}>
                Email: {currentUser?.email || 'user@complianceguard.app'}
              </Text>
              <Text style={styles.helperText}>
                Active Role: {activeRole} • Session: {currentUser?.authMethod || 'Active'}
              </Text>
              <Text style={styles.helperText}>
                Current Organization: {selectedOrg?.name || 'None'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.badgeText}>WORKSPACE TEAM</Text>
              <Text style={styles.sectionTitleSmall}>Members & Access</Text>

              {isSuperAdmin && (
                <View style={[styles.formBox, { marginTop: 10 }]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Member Full Name"
                    placeholderTextColor="#94A3B8"
                    value={memberName}
                    onChangeText={setMemberName}
                  />
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="Member Email (name@domain.com)"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    value={memberEmail}
                    onChangeText={setMemberEmail}
                  />
                  <View style={[styles.chipsWrap, { marginTop: 10 }]}>
                    {ROLES.map((r) => (
                      <Pressable
                        key={r}
                        style={[styles.chip, memberRole === r && styles.activeChip]}
                        onPress={() => setMemberRole(r)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            memberRole === r && styles.activeChipText,
                          ]}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={handleAddMember}
                    disabled={addingMember}
                  >
                    <Text style={styles.primaryBtnText}>
                      {addingMember ? 'Adding...' : '+ Add Team Member'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {loadingMembers ? (
                <ActivityIndicator size="small" color="#1D4ED8" />
              ) : members.length === 0 ? (
                <Text style={styles.helperText}>
                  No additional members listed yet.
                </Text>
              ) : (
                <View style={styles.listGap}>
                  {members.map((m, idx) => (
                    <View key={m._id || m.id || idx} style={styles.memberRow}>
                      <View>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberEmail}>{m.email}</Text>
                      </View>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{m.role}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {activeTab === 'settings' && (
          <ScrollView contentContainerStyle={styles.dashScroll}>
            <View style={styles.card}>
              <Text style={styles.badgeText}>APP SETTINGS</Text>
              <Text style={styles.sectionTitle}>Role & Workspace Preferences</Text>

              <Text style={styles.formLabel}>Switch Active Permission Role</Text>
              <View style={styles.chipsWrap}>
                {ROLES.map((r) => (
                  <Pressable
                    key={r}
                    style={[styles.chip, activeRole === r && styles.activeChip]}
                    onPress={() => {
                      setActiveRole(r);
                      showToast(`Role switched to ${r}`);
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        activeRole === r && styles.activeChipText,
                      ]}
                    >
                      {r}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.helperText}>Backend API: {API_BASE}</Text>

              <View style={styles.buttonRow}>
                <Pressable style={styles.secondaryBtn} onPress={goToWorkspaceScreen}>
                  <Text style={styles.secondaryBtnText}>Change Workspace</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => {
                    setStepIndex(0);
                    setScreen('onboarding');
                  }}
                >
                  <Text style={styles.secondaryBtnText}>Replay Onboarding</Text>
                </Pressable>
              </View>

              <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        <View style={styles.bottomNav}>
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'controls', label: `Controls (${totalCount})` },
            { id: 'profile', label: 'Profile' },
            { id: 'settings', label: 'Settings' },
          ].map((tab) => (
            <Pressable
              key={tab.id}
              style={[styles.navItem, activeTab === tab.id && styles.navItemActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.navText,
                  activeTab === tab.id && styles.navTextActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================
  // SCREEN 2: WORKSPACE SELECTOR & ONBOARDING
  // =========================================================
  if (screen === 'workspace') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>CG</Text>
              </View>
              <Text style={styles.brandName}>ComplianceGuard</Text>
            </View>

            <Pressable onPress={goToAuthScreen}>
              <Text style={styles.skipText}>Account</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.badgeText}>STEP 2 • WORKSPACE & BACKEND SYNC</Text>
            <Text style={styles.sectionTitle}>Select or Create Organization</Text>
            <Text style={styles.subtitle}>
              Signed in as {currentUser?.email || 'Guest'} ({activeRole}).
            </Text>

            <View style={styles.actionBar}>
              <Pressable
                style={styles.smallPrimaryBtn}
                onPress={() => setShowCreateForm((prev) => !prev)}
              >
                <Text style={styles.smallPrimaryBtnText}>
                  {showCreateForm ? 'Close Form' : '+ New Workspace'}
                </Text>
              </Pressable>

              <Pressable style={styles.smallSecondaryBtn} onPress={loadOrganizations}>
                <Text style={styles.smallSecondaryBtnText}>Refresh</Text>
              </Pressable>
            </View>

            {apiError ? <Text style={styles.errorText}>{apiError}</Text> : null}

            {showCreateForm && (
              <View style={styles.formBox}>
                <Text style={styles.formLabel}>Organization Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Acme Cloud Inc"
                  placeholderTextColor="#94A3B8"
                  value={orgName}
                  onChangeText={setOrgName}
                />

                <Text style={styles.formLabel}>Primary Contact Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="security@acmecloud.com"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={contactEmail}
                  onChangeText={setContactEmail}
                />

                <Text style={styles.formLabel}>Target Framework</Text>
                <View style={styles.chipsWrap}>
                  {['SOC 2 Type II', 'ISO 27001', 'Both (SOC 2 & ISO)'].map((fw) => (
                    <Pressable
                      key={fw}
                      style={[styles.chip, framework === fw && styles.activeChip]}
                      onPress={() => setFramework(fw)}
                    >
                      <Text style={[styles.chipText, framework === fw && styles.activeChipText]}>
                        {fw}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.formLabel}>Cloud Environment</Text>
                <View style={styles.chipsWrap}>
                  {['AWS', 'GCP', 'Azure', 'Hybrid'].map((env) => (
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

                <Pressable
                  style={styles.primaryBtn}
                  onPress={handleCreateOrganization}
                  disabled={creatingOrg}
                >
                  <Text style={styles.primaryBtnText}>
                    {creatingOrg ? 'Creating...' : 'Create & Continue →'}
                  </Text>
                </Pressable>
              </View>
            )}

            {loadingOrgs ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color="#1D4ED8" />
                <Text style={styles.helperText}>Loading organizations...</Text>
              </View>
            ) : orgs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.helperText}>
                  No workspaces found yet. Tap "+ New Workspace" above to onboard one.
                </Text>
              </View>
            ) : (
              <View style={styles.listGap}>
                {orgs.map((item, idx) => {
                  const id = item._id || item.id || idx;
                  return (
                    <Pressable
                      key={id}
                      style={styles.orgCard}
                      onPress={() => openWorkspaceDashboard(item)}
                    >
                      <Text style={styles.orgName}>{item.name || 'Untitled Workspace'}</Text>
                      <Text style={styles.orgMeta}>
                        {item.framework || 'Compliance'} • {item.cloud || item.cloudEnvironment || 'Cloud'}
                      </Text>
                      <Text style={styles.tapHint}>Tap to open workspace →</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =========================================================
  // SCREEN 1: MOBILE ONBOARDING
  // =========================================================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>CG</Text>
          </View>
          <Text style={styles.brandName}>ComplianceGuard</Text>
        </View>

        {!isLastStep && (
          <Pressable onPress={goToAuthScreen}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.badgeText}>{currentSlide.badge}</Text>

        <View style={styles.pillBox}>
          <Text style={styles.pillText}>{currentSlide.highlight}</Text>
        </View>

        <Text style={styles.title}>{currentSlide.title}</Text>
        <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>

        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === stepIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {stepIndex > 0 ? (
          <Pressable style={styles.secondaryBtn} onPress={handleBack}>
            <Text style={styles.secondaryBtnText}>Back</Text>
          </Pressable>
        ) : (
          <View style={{ width: 90 }} />
        )}

        <Pressable style={styles.primaryBtn} onPress={handleNext}>
          <Text style={styles.primaryBtnText}>
            {isLastStep ? 'Get Started →' : 'Next →'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const TOP_SAFE_SPACE =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    justifyContent: 'space-between',
    paddingTop: TOP_SAFE_SPACE,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dashboardShell: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    paddingTop: TOP_SAFE_SPACE,
  },
  scrollContent: {
    paddingBottom: 28,
    gap: 14,
  },
  dashScroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  sectionTitleSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  pillBox: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 14,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    lineHeight: 33,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    lineHeight: 21,
  },
  helperText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 19,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginTop: 16,
    marginBottom: 6,
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeModeBtn: {
    backgroundColor: '#1D4ED8',
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activeModeBtnText: {
    color: '#FFFFFF',
  },
  forgotLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  demoFillBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  demoFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  smallPrimaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  smallSecondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  smallSecondaryBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  infoText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  formBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  activeChip: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  loaderBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listGap: {
    gap: 10,
    marginTop: 10,
  },
  orgCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 14,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  orgMeta: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  tapHint: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
    marginTop: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#1D4ED8',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryBtnText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  signOutBtn: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 14,
  },
  dashHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dashOrgName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    maxWidth: 220,
  },
  dashSubMeta: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  switchPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  switchPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  toastBox: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  summaryPercent: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
  },
  searchActionRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  addBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  filterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeFilterPill: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
  },
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  controlTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  categoryTag: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  controlTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  statusChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusCompliant: {
    backgroundColor: '#DCFCE7',
  },
  statusProgress: {
    backgroundColor: '#FEF3C7',
  },
  statusNonCompliant: {
    backgroundColor: '#FEE2E2',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  statusChipTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  evidenceText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
  linkAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  noteEditBox: {
    marginTop: 10,
    gap: 8,
  },
  noteBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteBar: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  confirmDelRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  confirmDelLabel: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  dangerLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  mutedLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  reportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  reportNum: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  reportLabel: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontWeight: '600',
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  memberEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 6,
    gap: 6,
  },
  navItem: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  navItemActive: {
    backgroundColor: '#1D4ED8',
  },
  navText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  navTextActive: {
    color: '#FFFFFF',
  },
});