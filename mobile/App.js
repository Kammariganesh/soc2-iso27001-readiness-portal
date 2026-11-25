import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://soc2-iso27001-readiness-portal.onrender.com';
const DEFAULT_EAS_BUILD_URL = 'https://expo.dev';

const ROLES = ['Super Admin', 'Admin', 'Auditor'];

const ROLE_META = {
  'Super Admin': {
    label: 'Super Admin',
    shortDesc: 'Full access: view, add/edit, delete, export Excel, and download EAS build.',
    canEdit: true,
    canDelete: true,
    canExportExcel: true,
    canDownloadEas: true,
  },
  Admin: {
    label: 'Admin',
    shortDesc: 'Can view, add/edit controls, and download Excel file; cannot delete.',
    canEdit: true,
    canDelete: false,
    canExportExcel: true,
    canDownloadEas: false,
  },
  Auditor: {
    label: 'Auditor',
    shortDesc: 'Read-only access: can only view data; cannot edit, delete, or export.',
    canEdit: false,
    canDelete: false,
    canExportExcel: false,
    canDownloadEas: false,
  },
};

const GOOGLE_ACCOUNTS = [
  { email: 'ganeshpaidi@gmail.com', name: 'Ganesh Pydi', suggestedRole: 'Super Admin' },
  { email: 'sharath@company.com', name: 'Sharath', suggestedRole: 'Admin' },
  { email: 'auditor@company.com', name: 'Auditor', suggestedRole: 'Auditor' },
];

const ONBOARDING_SLIDES = [
  {
    eyebrow: 'COMPLIANCE SIMPLIFIED',
    title: 'Compliance made\neffortless',
    subtitle: 'Track controls, policies, and audit readiness in one calm workspace.',
    cta: 'Get Started',
  },
  {
    eyebrow: 'AUTOMATED EVIDENCE',
    title: 'Evidence that stays\nup to date',
    subtitle: 'Connect your stack and collect compliance proof without spreadsheets.',
    cta: 'Continue',
  },
  {
    eyebrow: 'AUDIT CONFIDENCE',
    title: 'Ready whenever\nauditors ask',
    subtitle: 'Share clean, verifiable compliance status with your team and auditors.',
    cta: 'Start Free',
  },
];

const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'HIPAA', 'GDPR'];
const CLOUD_PROVIDERS = ['AWS', 'Azure', 'Google Cloud', 'Other'];
const STATUS_OPTIONS = ['Compliant', 'In Progress', 'Non-Compliant'];

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    section: 'TODAY',
    type: 'Alerts',
    icon: '⚠',
    title: 'Control Review Overdue',
    body: 'CC6.1 (Logical Access) requires quarterly evidence verification.',
    time: '18 mins ago',
    unread: true,
  },
  {
    id: 'n2',
    section: 'TODAY',
    type: 'Updates',
    icon: '✓',
    title: 'Evidence Uploaded',
    body: 'MFA enforcement screenshot added to IAM-02.',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 'n3',
    section: 'YESTERDAY',
    type: 'Updates',
    icon: '🛡',
    title: 'Workspace Synced',
    body: 'ComplianceGuard workspace controls synced.',
    time: 'Yesterday, 4:15 PM',
    unread: false,
  },
];

const FAQ_ITEMS = [
  {
    id: 'f1',
    q: 'How do Super Admin, Admin, and Auditor roles work?',
    a: 'Select your role on Create Account. Super Admin has full access, Admin can edit & download Excel file, and Auditor has view-only access.',
  },
  {
    id: 'f2',
    q: 'How does Sign In verify my password?',
    a: 'Sign In checks your registered email and exact password. Wrong passwords are rejected with an error.',
  },
  {
    id: 'f3',
    q: 'Why is the OTP not shown on the screen?',
    a: 'For security, OTP codes are never displayed on screen. The OTP is dispatched to your registered email address.',
  },
];

const ALL_FRAMEWORKS_OVERVIEW = [
  { name: 'SOC 2', fallbackPct: 75 },
  { name: 'ISO 27001', fallbackPct: 60 },
  { name: 'HIPAA', fallbackPct: 50 },
  { name: 'GDPR', fallbackPct: 65 },
];

const PROFILE_PHOTO = null;

function getOrgIdValue(orgObj) {
  if (!orgObj) return '';
  return String(orgObj._id || orgObj.id || '').trim();
}

function getOrgKey(orgObj) {
  if (!orgObj) return 'default_org';
  const rawId = orgObj._id || orgObj.id || orgObj.name || 'default_org';
  return String(rawId).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

function BrandTopBar({ rightAction, isDark }) {
  const { width } = useWindowDimensions();
  const frameWidth = Math.min(width, 430);
  const scale = frameWidth / 390;
  const styles = useMemo(() => createStyles(scale, 1, isDark), [scale, isDark]);

  return (
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
}

function OnboardingArtwork({ index, styles }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    floatAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [index, floatAnim]);

  return (
    <Animated.View style={[styles.artStage, { transform: [{ translateY: floatAnim }] }]}>
      {index === 0 && (
        <View style={styles.artBackdropCircle}>
          <Text style={[styles.sparkle, { top: 20, left: 26, color: '#3B82F6' }]}>✦</Text>
          <Text style={[styles.sparkle, { top: 30, right: 24, color: '#10B981' }]}>✦</Text>
          <Text style={[styles.sparkle, { bottom: 26, left: 28, color: '#F59E0B' }]}>✦</Text>

          <View style={styles.shieldOuter}>
            <View style={styles.shieldInnerLeft} />
            <View style={styles.shieldInnerRight} />
            <Text style={styles.shieldCheckMark}>✓</Text>
          </View>

          <View style={styles.lockBadgeCard}>
            <View style={styles.lockShackle} />
            <View style={styles.lockBody}>
              <View style={styles.lockKeyhole} />
            </View>
          </View>
        </View>
      )}

      {index === 1 && (
        <View style={styles.artBackdropCircle}>
          <Text style={[styles.sparkle, { top: 22, left: 24, color: '#3B82F6' }]}>✦</Text>
          <Text style={[styles.sparkle, { bottom: 24, right: 26, color: '#10B981' }]}>✦</Text>

          <View style={styles.docSheet}>
            <View style={styles.docClip} />
            <View style={styles.docRow}>
              <View style={styles.docDot} />
              <View style={styles.docLine} />
            </View>
            <View style={styles.docRow}>
              <View style={styles.docDot} />
              <View style={styles.docLine} />
            </View>
            <View style={styles.docRow}>
              <View style={styles.docDot} />
              <View style={styles.docLine} />
            </View>
          </View>

          <View style={styles.gearBadge}>
            <Text style={styles.gearGlyph}>⚙</Text>
          </View>
          <View style={styles.checkBadgeBlue}>
            <Text style={styles.checkBadgeGlyph}>✓</Text>
          </View>
        </View>
      )}

      {index === 2 && (
        <View style={styles.artBackdropCircle}>
          <Text style={[styles.sparkle, { top: 20, right: 26, color: '#3B82F6' }]}>✦</Text>
          <Text style={[styles.sparkle, { bottom: 22, left: 24, color: '#F59E0B' }]}>✦</Text>

          <View style={styles.chartMiniCard}>
            <View style={[styles.chartBar, { height: 14, backgroundColor: '#93C5FD' }]} />
            <View style={[styles.chartBar, { height: 22, backgroundColor: '#3B82F6' }]} />
            <View style={[styles.chartBar, { height: 30, backgroundColor: '#1D4ED8' }]} />
          </View>

          <View style={styles.certSheet}>
            <View style={styles.certLineLong} />
            <View style={styles.certLineMed} />
            <View style={styles.certLineShort} />
            <View style={styles.certSealCircle}>
              <Text style={styles.certSealCheck}>✓</Text>
            </View>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

function WelcomeShieldArtwork({ styles }) {
  return (
    <View style={styles.welcomeShieldStage}>
      <View style={styles.welcomeShieldCircle}>
        <Text style={[styles.sparkle, { top: 12, left: 16, color: '#3B82F6' }]}>✦</Text>
        <Text style={[styles.sparkle, { top: 18, right: 14, color: '#10B981' }]}>✦</Text>
        <Text style={[styles.sparkle, { bottom: 14, left: 18, color: '#F59E0B' }]}>✦</Text>

        <View style={styles.shieldOuter}>
          <View style={styles.shieldInnerLeft} />
          <View style={styles.shieldInnerRight} />
          <Text style={styles.shieldCheckMark}>✓</Text>
        </View>

        <View style={styles.lockBadgeCard}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody}>
            <View style={styles.lockKeyhole} />
          </View>
        </View>
      </View>
    </View>
  );
}

function EyeToggleIcon({ visible, styles }) {
  return (
    <View style={styles.eyeIconBox}>
      <View style={styles.eyeOuterOval}>
        <View style={styles.eyeInnerCircle} />
      </View>
      {!visible && <View style={styles.eyeDiagonalSlash} />}
    </View>
  );
}

export default function App() {
  const { width, height } = useWindowDimensions();
  const frameWidth = Math.min(width, 430);
  const wScale = frameWidth / 390;
  const hScale = height < 740 ? Math.max(0.84, height / 760) : 1;

  const [themeMode, setThemeMode] = useState('light');
  const isDark = themeMode === 'dark';
  const styles = useMemo(() => createStyles(wScale, hScale, isDark), [wScale, hScale, isDark]);

  const [stepIndex, setStepIndex] = useState(0);
  const [screen, setScreen] = useState('onboarding');
  const [authMode, setAuthMode] = useState('login');

  const [registeredUsers, setRegisteredUsers] = useState({});
  const [signupRole, setSignupRole] = useState('Super Admin');
  const [activeRole, setActiveRole] = useState('Super Admin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  const [resetEmail, setResetEmail] = useState('');
  const [otpSentNotice, setOtpSentNotice] = useState('');
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const [roleTargetEmail, setRoleTargetEmail] = useState('');
  const [roleTargetName, setRoleTargetName] = useState('');
  const [roleDraftChoice, setRoleDraftChoice] = useState('Super Admin');

  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState(GOOGLE_ACCOUNTS[0].email);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');

  const [authToken, setAuthToken] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [orgs, setOrgs] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [confirmDeleteOrgId, setConfirmDeleteOrgId] = useState(null);
  const [deletingOrgId, setDeletingOrgId] = useState(null);

  const [orgName, setOrgName] = useState('');
  const [framework, setFramework] = useState('SOC 2');
  const [cloudEnv, setCloudEnv] = useState('AWS');
  const [creatingOrg, setCreatingOrg] = useState(false);

  const [activeTab, setActiveTab] = useState('home');
  const [subScreen, setSubScreen] = useState(null);
  const [controlsByOrg, setControlsByOrg] = useState({});
  const [loadingControls, setLoadingControls] = useState(false);
  const [syncingData, setSyncingData] = useState(false);
  const [statusBanner, setStatusBanner] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddControl, setShowAddControl] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newDescription, setNewDescription] = useState('');
  const [newStatus, setNewStatus] = useState('In Progress');
  const [newEvidence, setNewEvidence] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [savingControl, setSavingControl] = useState(false);

  const [selectedControl, setSelectedControl] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [showAllFrameworks, setShowAllFrameworks] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [notifFilter, setNotifFilter] = useState('All');
  const [openFaqId, setOpenFaqId] = useState('f1');
  const [supportMessage, setSupportMessage] = useState('');
  const [easBuildUrl, setEasBuildUrl] = useState(DEFAULT_EAS_BUILD_URL);
  const [downloadingEas, setDownloadingEas] = useState(false);

  const activeOrgKey = getOrgKey(selectedOrg);
  const controls = controlsByOrg[activeOrgKey] || [];

  const roleConfig = ROLE_META[activeRole] || ROLE_META['Super Admin'];
  const canEdit = roleConfig.canEdit;
  const canDelete = roleConfig.canDelete;
  const canExportExcel = roleConfig.canExportExcel;
  const canDownloadEas = roleConfig.canDownloadEas;

  const currentSlide = ONBOARDING_SLIDES[stepIndex];
  const isLastStep = stepIndex === ONBOARDING_SLIDES.length - 1;
  const unreadCount = notifications.filter((n) => n.unread).length;

  const todayFormatted = useMemo(() => {
    try {
      return new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Nov 25, 2026';
    }
  }, []);

  function showToast(msg) {
    setStatusBanner(msg);
  }

  async function toggleAppearanceTheme() {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    showToast(`Appearance set to ${nextMode === 'dark' ? 'Dark' : 'Light'} mode`);
    try {
      await AsyncStorage.setItem('cg_theme_mode', nextMode);
    } catch {
      // ignore storage error
    }
  }

  useEffect(() => {
    if (!statusBanner) return;
    const t = setTimeout(() => setStatusBanner(''), 3200);
    return () => clearTimeout(t);
  }, [statusBanner]);

  async function persistRegisteredUsers(nextUsersMap) {
    setRegisteredUsers(nextUsersMap);
    try {
      await AsyncStorage.setItem('cg_registered_users', JSON.stringify(nextUsersMap));
    } catch {
      // ignore storage error
    }
  }

  async function saveSession(token, userObj) {
    setAuthToken(token || '');
    setCurrentUser(userObj || null);
    try {
      if (token) {
        await AsyncStorage.setItem('cg_token', token);
      } else {
        await AsyncStorage.removeItem('cg_token');
      }
      if (userObj) {
        await AsyncStorage.setItem('cg_user', JSON.stringify(userObj));
      } else {
        await AsyncStorage.removeItem('cg_user');
      }
    } catch {
      // ignore storage error
    }
  }

  async function saveLocalOrgs(nextOrgs) {
    setOrgs(nextOrgs);
    try {
      await AsyncStorage.setItem('cg_local_orgs', JSON.stringify(nextOrgs));
    } catch {
      // ignore storage error
    }
  }

  async function loadLocalOrgs() {
    try {
      const raw = await AsyncStorage.getItem('cg_local_orgs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async function saveOrgControlsMap(nextMap) {
    setControlsByOrg(nextMap);
    try {
      await AsyncStorage.setItem('cg_controls_by_org', JSON.stringify(nextMap));
    } catch {
      // ignore storage error
    }
  }

  async function setControlsForOrg(orgObj, updaterOrList) {
    const key = getOrgKey(orgObj);
    setControlsByOrg((prev) => {
      const currentList = prev[key] || [];
      const nextList =
        typeof updaterOrList === 'function' ? updaterOrList(currentList) : updaterOrList;
      const updatedMap = {
        ...prev,
        [key]: nextList,
      };
      AsyncStorage.setItem('cg_controls_by_org', JSON.stringify(updatedMap)).catch(() => {});
      return updatedMap;
    });
  }

  function buildAuthHeaders(extra = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-User-Role': activeRole,
      ...extra,
    };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return headers;
  }

  async function parseResponseSafely(res) {
    const rawText = await res.text();
    try {
      return { data: JSON.parse(rawText), rawText };
    } catch {
      return { data: null, rawText };
    }
  }

  async function wakeBackendServer() {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      await fetch(`${API_BASE_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(tid);
    } catch {
      // ignore health wake error
    }
  }

  function goToAuthScreen(mode = 'login') {
    setApiError('');
    setAuthMode(mode);
    setScreen('auth');
  }

  function openForgotPasswordScreen() {
    setApiError('');
    setResetSuccessMsg('');
    setOtpSentNotice('');
    setOtpTargetEmail('');
    setOtpInput('');
    setNewPasswordInput('');
    setShowNewPassword(false);
    setResetEmail(email.trim());
    setScreen('reset_password');
    wakeBackendServer();
  }

  function handleResetEmailChange(nextVal) {
    setResetEmail(nextVal);
    if (otpTargetEmail && nextVal.trim().toLowerCase() !== otpTargetEmail.toLowerCase()) {
      setOtpSentNotice('');
      setOtpTargetEmail('');
      setOtpInput('');
      setResetSuccessMsg('');
    }
  }

  function goToWorkspaceScreen() {
    setApiError('');
    setConfirmDeleteOrgId(null);
    setScreen('workspace');
  }

  function openCreateCompanyScreen() {
    if (!canEdit) {
      showToast(`${activeRole} cannot create a company.`);
      return;
    }
    setApiError('');
    setOrgName('');
    setFramework('SOC 2');
    setCloudEnv('AWS');
    setScreen('create_org');
  }

  function handleNext() {
    setApiError('');
    if (!isLastStep) {
      setStepIndex((prev) => prev + 1);
    } else {
      goToAuthScreen('login');
    }
  }

  function handleBack() {
    setApiError('');
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }

  async function handleDemoFill() {
    setApiError('');
    const demoEmail = 'ganeshpaidi@gmail.com';
    const demoPass = 'Password@123';
    const demoRole = 'Super Admin';
    setEmail(demoEmail);
    setPassword(demoPass);
    setSignupRole(demoRole);
    setAgreedTerms(true);

    const key = demoEmail.toLowerCase();
    if (!registeredUsers[key]) {
      const nextUsers = {
        ...registeredUsers,
        [key]: {
          name: 'Ganesh Pydi',
          email: demoEmail,
          password: demoPass,
          role: demoRole,
        },
      };
      await persistRegisteredUsers(nextUsers);
    }
  }

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const onBackPress = () => {
      if (googleModalVisible) {
        setGoogleModalVisible(false);
        return true;
      }
      if (screen === 'dashboard') {
        if (subScreen) {
          setSubScreen(null);
          return true;
        }
        if (activeTab !== 'home') {
          setActiveTab('home');
          return true;
        }
        goToWorkspaceScreen();
        return true;
      }
      if (screen === 'create_org') {
        goToWorkspaceScreen();
        return true;
      }
      if (screen === 'workspace') {
        goToAuthScreen('login');
        return true;
      }
      if (screen === 'reset_password') {
        goToAuthScreen('login');
        return true;
      }
      if (screen === 'auth') {
        setScreen('onboarding');
        return true;
      }
      if (screen === 'onboarding' && stepIndex > 0) {
        setStepIndex((prev) => prev - 1);
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [screen, subScreen, activeTab, stepIndex, googleModalVisible]);

  async function loadOrganizations(overrideToken, overrideRole) {
    const tokenToUse = overrideToken || authToken;
    const roleToUse = overrideRole || activeRole;
    setLoadingOrgs(true);
    setApiError('');
    const cachedOrgs = await loadLocalOrgs();

    try {
      const res = await fetch(`${API_BASE_URL}/api/organizations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': roleToUse,
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {}),
        },
      });
      const { data } = await parseResponseSafely(res);

      if (res.ok && data) {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.organizations)
            ? data.organizations
            : Array.isArray(data.data)
              ? data.data
              : [];

        const merged = list.length > 0 ? list : cachedOrgs;
        setOrgs(merged);
        if (list.length > 0) {
          await saveLocalOrgs(list);
        }
      } else {
        setOrgs(cachedOrgs);
      }
    } catch {
      setOrgs(cachedOrgs);
    } finally {
      setLoadingOrgs(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('cg_theme_mode');
        if (mounted && (savedTheme === 'light' || savedTheme === 'dark')) {
          setThemeMode(savedTheme);
        }

        const rawUsers = await AsyncStorage.getItem('cg_registered_users');
        const parsedUsers = rawUsers ? JSON.parse(rawUsers) : {};
        const usersMap =
          parsedUsers && typeof parsedUsers === 'object' ? parsedUsers : {};

        const rawOrgControls = await AsyncStorage.getItem('cg_controls_by_org');
        const parsedOrgControls = rawOrgControls ? JSON.parse(rawOrgControls) : {};
        const orgControlsMap =
          parsedOrgControls && typeof parsedOrgControls === 'object' ? parsedOrgControls : {};

        if (mounted) {
          setRegisteredUsers(usersMap);
          setControlsByOrg(orgControlsMap);
        }

        const savedToken = await AsyncStorage.getItem('cg_token');
        const savedUser = await AsyncStorage.getItem('cg_user');
        if (mounted && (savedToken || savedUser)) {
          const parsedUser = savedUser ? JSON.parse(savedUser) : null;
          const userEmailKey = (parsedUser?.email || '').trim().toLowerCase();
          const latestUserRecord =
            (userEmailKey && usersMap[userEmailKey]) || parsedUser;
          const effectiveRole = latestUserRecord?.role || 'Super Admin';

          const finalUser = {
            ...parsedUser,
            name: latestUserRecord?.name || parsedUser?.name || 'User',
            email: parsedUser?.email || '',
            role: effectiveRole,
          };

          setAuthToken(savedToken || '');
          setCurrentUser(finalUser);
          setActiveRole(effectiveRole);
          setRoleTargetEmail(finalUser.email);
          setRoleTargetName(finalUser.name);
          setRoleDraftChoice(effectiveRole);
          setScreen('workspace');
          await loadOrganizations(savedToken || '', effectiveRole);
        }
      } catch {
        // ignore startup restore error
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function openChangeRoleSubScreen() {
    const signedInEmail = currentUser?.email || '';
    const key = signedInEmail.trim().toLowerCase();
    const record = registeredUsers[key];
    setRoleTargetEmail(signedInEmail);
    setRoleTargetName(record?.name || currentUser?.name || signedInEmail.split('@')[0]);
    setRoleDraftChoice(record?.role || activeRole);
    setSubScreen('change_role');
  }

  async function handleSaveRoleChange() {
    const targetEmail = roleTargetEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('Enter a valid email to change role.');
      return;
    }

    const key = targetEmail.toLowerCase();
    const existing = registeredUsers[key];
    if (!existing) {
      showToast('Account not found. Create account first.');
      return;
    }

    const displayName = roleTargetName.trim() || existing.name || targetEmail.split('@')[0];

    const updatedUsers = {
      ...registeredUsers,
      [key]: {
        ...existing,
        name: displayName,
        role: roleDraftChoice,
      },
    };
    await persistRegisteredUsers(updatedUsers);

    const currentKey = (currentUser?.email || '').trim().toLowerCase();
    if (currentKey === key) {
      setActiveRole(roleDraftChoice);
      const updatedUserObj = {
        ...currentUser,
        email: targetEmail,
        name: displayName,
        role: roleDraftChoice,
      };
      await saveSession(authToken || 'local-session', updatedUserObj);
    }

    showToast(`Saved: ${displayName} (${targetEmail}) is now ${roleDraftChoice}`);
  }

  async function handleAuthSubmit() {
    setApiError('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();
    const key = cleanEmail.toLowerCase();

    if (!cleanEmail || !cleanPass) {
      setApiError('Please enter both email and password.');
      return;
    }

    if (authMode === 'signup') {
      if (registeredUsers[key]) {
        setApiError('This email is already registered, please use another email.');
        return;
      }

      if (!agreedTerms) {
        setApiError('Please agree to the Terms of Service and Privacy Policy.');
        return;
      }

      const userName = cleanEmail.split('@')[0] || 'User';
      const nextUsers = {
        ...registeredUsers,
        [key]: {
          name: userName,
          email: cleanEmail,
          password: cleanPass,
          role: signupRole,
        },
      };
      await persistRegisteredUsers(nextUsers);

      setActiveRole(signupRole);
      setRoleTargetEmail(cleanEmail);
      setRoleTargetName(userName);
      setRoleDraftChoice(signupRole);

      const userObj = {
        email: cleanEmail,
        name: userName,
        role: signupRole,
      };

      await saveSession('local-session', userObj);
      setScreen('workspace');
      await loadOrganizations('local-session', signupRole);
      showToast(`Account created as ${signupRole}`);
      return;
    }

    const account = registeredUsers[key];
    if (!account) {
      setApiError('This email is not registered. Please create an account first.');
      return;
    }

    if (account.password !== cleanPass) {
      setApiError('Incorrect password. Please enter the correct password.');
      return;
    }

    setAuthLoading(true);
    try {
      const assignedRole = account.role || 'Super Admin';
      setActiveRole(assignedRole);
      setRoleTargetEmail(account.email);
      setRoleTargetName(account.name);
      setRoleDraftChoice(assignedRole);

      const userObj = {
        email: account.email,
        name: account.name,
        role: assignedRole,
      };

      await saveSession('local-session', userObj);
      setScreen('workspace');
      await loadOrganizations('local-session', assignedRole);
      showToast(`Signed in as ${account.email} (${assignedRole})`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleGoogleContinue() {
    const chosen = (customGoogleEmail || selectedGoogleEmail || '').trim();
    if (!chosen) {
      setApiError('Please select or enter an email.');
      return;
    }
    setGoogleModalVisible(false);
    setEmail(chosen);
    setAuthLoading(true);
    try {
      const key = chosen.toLowerCase();
      const matchAccount = GOOGLE_ACCOUNTS.find(
        (acc) => acc.email.toLowerCase() === key
      );
      const existingRecord = registeredUsers[key];
      const roleForGoogle =
        existingRecord?.role ||
        matchAccount?.suggestedRole ||
        (authMode === 'signup' ? signupRole : 'Super Admin');
      const displayName =
        existingRecord?.name || matchAccount?.name || chosen.split('@')[0];

      const nextUsers = {
        ...registeredUsers,
        [key]: {
          name: displayName,
          email: chosen,
          password: existingRecord?.password || 'Password@123',
          role: roleForGoogle,
        },
      };
      await persistRegisteredUsers(nextUsers);

      setActiveRole(roleForGoogle);
      setRoleTargetEmail(chosen);
      setRoleTargetName(displayName);
      setRoleDraftChoice(roleForGoogle);

      const userObj = {
        email: chosen,
        name: displayName,
        role: roleForGoogle,
      };
      await saveSession('google-session', userObj);
      setScreen('workspace');
      await loadOrganizations('google-session', roleForGoogle);
      showToast(`Signed in with ${chosen} (${roleForGoogle})`);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSendOtp() {
    setApiError('');
    setResetSuccessMsg('');
    setOtpSentNotice('');
    const target = resetEmail.trim();

    if (!target || !target.includes('@')) {
      setApiError('Please enter a valid email address.');
      return;
    }

    setAuthLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const { data } = await parseResponseSafely(res);

      if (!res.ok) {
        setApiError(
          (data && (data.error || data.message)) ||
            `Server error (${res.status}). Check Render Logs.`
        );
        return;
      }

      setOtpTargetEmail(target);
      setOtpInput('');
      setOtpSentNotice(
        (data && data.message) || `OTP sent to ${target}. Check Inbox or Spam.`
      );
      showToast(`OTP sent to ${target}`);
    } catch {
      setApiError(
        'Request failed to reach backend server. Check internet or Render server status.'
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleVerifyOtpAndReset() {
    setApiError('');
    setResetSuccessMsg('');
    setOtpSentNotice('');

    const target = (otpTargetEmail || resetEmail || '').trim().toLowerCase();
    const code = otpInput.trim();

    if (!target || !target.includes('@')) {
      setApiError('Please enter a valid email address.');
      return;
    }

    if (!code) {
      setApiError('You entered a wrong OTP. Please check and correct it.');
      return;
    }

    if (!newPasswordInput) {
      setApiError('Please enter a new password.');
      return;
    }

    setAuthLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: target,
          otp: code,
          newPassword: newPasswordInput,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const { data } = await parseResponseSafely(res);

      if (!res.ok) {
        setApiError(
          (data && (data.error || data.message)) ||
            'You entered a wrong OTP. Please check and correct it.'
        );
        return;
      }

      if (registeredUsers[target]) {
        const updatedUsers = {
          ...registeredUsers,
          [target]: {
            ...registeredUsers[target],
            password: newPasswordInput,
          },
        };
        await persistRegisteredUsers(updatedUsers);
      }

      setOtpInput('');
      setNewPasswordInput('');
      setResetSuccessMsg(
        (data && data.message) || `Password updated for ${target}. Sign in with your new password.`
      );
      showToast('Password updated successfully');
    } catch {
      setApiError('Request failed to reach backend server. Check internet or Render server status.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleCreateOrganization() {
    if (!canEdit) {
      showToast(`${activeRole} has read-only access and cannot create a company.`);
      return;
    }
    setApiError('');
    const cleanName = orgName.trim();
    if (!cleanName) {
      setApiError('Please enter a company name.');
      return;
    }

    setCreatingOrg(true);
    const payload = {
      name: cleanName,
      framework,
      cloud: cloudEnv,
      createdByRole: activeRole,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE_URL}/api/organizations`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const { data } = await parseResponseSafely(res);

      const createdOrg =
        data && typeof data === 'object'
          ? data.organization || data.data || data
          : null;

      const finalOrg =
        createdOrg && (createdOrg.name || createdOrg._id || createdOrg.id)
          ? {
            ...createdOrg,
            name: createdOrg.name || cleanName,
            framework: createdOrg.framework || framework,
            cloud: createdOrg.cloud || cloudEnv,
          }
          : {
            id: `local-org-${Date.now()}`,
            name: cleanName,
            framework,
            cloud: cloudEnv,
          };

      const nextList = [
        finalOrg,
        ...orgs.filter(
          (o) =>
            (o._id || o.id) !== (finalOrg._id || finalOrg.id) &&
            o.name !== finalOrg.name
        ),
      ];
      await saveLocalOrgs(nextList);
      setSelectedOrg(finalOrg);
      setActiveTab('home');
      setSubScreen(null);
      setScreen('dashboard');
      await loadDashboardData(finalOrg, false);
      showToast(`Created "${finalOrg.name}"`);
    } catch {
      const fallbackOrg = {
        id: `local-org-${Date.now()}`,
        name: cleanName,
        framework,
        cloud: cloudEnv,
      };
      const nextList = [fallbackOrg, ...orgs];
      await saveLocalOrgs(nextList);
      setSelectedOrg(fallbackOrg);
      setActiveTab('home');
      setSubScreen(null);
      setScreen('dashboard');
      await setControlsForOrg(fallbackOrg, []);
      showToast(`Saved "${cleanName}"`);
    } finally {
      setCreatingOrg(false);
    }
  }

  async function handleDeleteOrganization(orgItem, idx) {
    if (!canDelete) {
      showToast(`Only Super Admin can delete a workspace. Current role: ${activeRole}`);
      return;
    }

    const orgId = getOrgIdValue(orgItem);
    const rowKey = orgId || `org-${idx}`;
    setDeletingOrgId(rowKey);
    setApiError('');

    try {
      if (orgId && !orgId.startsWith('local-org-')) {
        await fetch(`${API_BASE_URL}/api/organizations/${orgId}`, {
          method: 'DELETE',
          headers: buildAuthHeaders(),
        });
      }
    } catch {
      // still remove locally
    }

    const remaining = orgs.filter((item, i) => {
      const itemId = getOrgIdValue(item);
      if (orgId && itemId) {
        return itemId !== orgId;
      }
      return i !== idx;
    });

    await saveLocalOrgs(remaining);

    const targetKey = getOrgKey(orgItem);
    const nextMap = { ...controlsByOrg };
    delete nextMap[targetKey];
    await saveOrgControlsMap(nextMap);

    if (
      selectedOrg &&
      ((orgId && getOrgIdValue(selectedOrg) === orgId) ||
        selectedOrg.name === orgItem?.name)
    ) {
      setSelectedOrg(remaining[0] || null);
    }
    setConfirmDeleteOrgId(null);
    setDeletingOrgId(null);
    showToast(`Deleted "${orgItem?.name || 'Workspace'}"`);
  }

  async function loadDashboardData(orgObj, isSync = false) {
    const targetOrg = orgObj || selectedOrg;
    if (!targetOrg) return;

    const targetKey = getOrgKey(targetOrg);
    const existingForOrg = controlsByOrg[targetKey] || [];
    const orgId = getOrgIdValue(targetOrg);

    if (isSync) {
      setSyncingData(true);
    } else {
      setLoadingControls(true);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const query = orgId
        ? `?organizationId=${encodeURIComponent(orgId)}&orgId=${encodeURIComponent(orgId)}`
        : '';
      const res = await fetch(`${API_BASE_URL}/api/controls${query}`, {
        method: 'GET',
        headers: buildAuthHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const { data } = await parseResponseSafely(res);

      if (res.ok && data) {
        const rawList = Array.isArray(data)
          ? data
          : Array.isArray(data.controls)
            ? data.controls
            : Array.isArray(data.data)
              ? data.data
              : [];

        const scopedList = orgId
          ? rawList.filter((item) => {
            const itemOrgId = String(item?.organizationId || item?.orgId || '').trim();
            return itemOrgId === orgId;
          })
          : rawList;

        const localOnly = existingForOrg.filter((localCtrl) => {
          const localId = String(localCtrl._id || localCtrl.id || '');
          const inServer = scopedList.some(
            (srvCtrl) => String(srvCtrl._id || srvCtrl.id || '') === localId
          );
          return !inServer && localId.startsWith('ctrl-');
        });

        const mergedList = [...localOnly, ...scopedList];
        await setControlsForOrg(targetOrg, mergedList);
      }
    } catch {
      // keep existing controls for this org
    } finally {
      setLoadingControls(false);
      setSyncingData(false);
    }
  }

  async function openWorkspaceDashboard(orgObj) {
    setSelectedOrg(orgObj);
    setSearchQuery('');
    setStatusFilter('All');
    setShowAddControl(false);
    setSelectedControl(null);
    setActiveTab('home');
    setSubScreen(null);
    setScreen('dashboard');
    await loadDashboardData(orgObj, false);
  }

  async function handleAddControl() {
    if (!canEdit) {
      showToast(`${activeRole} has view-only access and cannot add controls.`);
      return;
    }
    if (!newCode.trim() || !newTitle.trim()) {
      showToast('Enter Control ID and Control Title');
      return;
    }

    setSavingControl(true);
    const orgId = getOrgIdValue(selectedOrg);
    const payload = {
      code: newCode.trim(),
      title: newTitle.trim(),
      framework: newFramework,
      description: newDescription.trim(),
      status: newStatus,
      evidence: newEvidence.trim(),
      evidenceNote: newEvidence.trim(),
      updatedBy: newOwner.trim() || currentUser?.name || 'User',
      organizationId: orgId,
      orgId,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${API_BASE_URL}/api/controls`, {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const { data } = await parseResponseSafely(res);
      const created =
        data && typeof data === 'object'
          ? data.control || data.data || data
          : null;

      const itemToAdd =
        created && (created.title || created.code || created._id || created.id)
          ? {
            ...created,
            organizationId: created.organizationId || orgId,
            orgId: created.orgId || orgId,
          }
          : {
            id: `ctrl-${Date.now()}`,
            ...payload,
          };

      await setControlsForOrg(selectedOrg, (prev) => [itemToAdd, ...prev]);
      setNewCode('');
      setNewTitle('');
      setNewDescription('');
      setNewEvidence('');
      setNewStatus('In Progress');
      setShowAddControl(false);
      showToast(`Control added to ${selectedOrg?.name || 'workspace'}`);
    } catch {
      await setControlsForOrg(selectedOrg, (prev) => [
        { id: `ctrl-${Date.now()}`, ...payload },
        ...prev,
      ]);
      setNewCode('');
      setNewTitle('');
      setNewDescription('');
      setNewEvidence('');
      setNewStatus('In Progress');
      setShowAddControl(false);
      showToast(`Control added to ${selectedOrg?.name || 'workspace'}`);
    } finally {
      setSavingControl(false);
    }
  }

  async function handleUpdateControl(ctrl, patch) {
    if (!canEdit) {
      showToast(`${activeRole} has view-only access and cannot edit controls.`);
      return;
    }
    const id = ctrl._id || ctrl.id;
    const updatedObj = {
      ...ctrl,
      ...patch,
      updatedBy: currentUser?.name || 'User',
    };

    await setControlsForOrg(selectedOrg, (prev) =>
      prev.map((item) => ((item._id || item.id) === id ? updatedObj : item))
    );
    if (selectedControl && (selectedControl._id || selectedControl.id) === id) {
      setSelectedControl(updatedObj);
    }

    try {
      if (id && !String(id).startsWith('ctrl-')) {
        await fetch(`${API_BASE_URL}/api/controls/${id}`, {
          method: 'PATCH',
          headers: buildAuthHeaders(),
          body: JSON.stringify(patch),
        });
      }
    } catch {
      // local state updated
    }
    showToast('Control updated');
  }

  async function handleDeleteControl(id) {
    if (!canDelete) {
      showToast(`Only Super Admin can delete controls. Current role: ${activeRole}`);
      return;
    }

    await setControlsForOrg(selectedOrg, (prev) =>
      prev.filter((item) => (item._id || item.id) !== id)
    );
    setConfirmDeleteId(null);

    try {
      if (id && !String(id).startsWith('ctrl-')) {
        await fetch(`${API_BASE_URL}/api/controls/${id}`, {
          method: 'DELETE',
          headers: buildAuthHeaders(),
        });
      }
    } catch {
      // local state updated
    }
    showToast('Control deleted');
  }

  async function handleDownloadExcelFile() {
    if (!canExportExcel) {
      showToast(`${activeRole} cannot download Excel files.`);
      return;
    }

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Control ID', 'Title', 'Framework', 'Status', 'Evidence', 'Owner']
      .map(esc)
      .join(',');

    const rows =
      controls.length > 0
        ? controls.map((c, i) =>
          [
            c.code || c.id || `CC${i + 1}.1`,
            c.title || c.name || '',
            c.framework || 'SOC 2',
            c.status || 'In Progress',
            c.evidence || c.evidenceNote || '',
            c.updatedBy || currentUser?.name || 'Admin',
          ]
            .map(esc)
            .join(',')
        )
        : [
          ['CC6.1', 'Access Control Review', 'SOC 2', 'In Progress', 'Pending', currentUser?.name || 'Admin']
            .map(esc)
            .join(','),
        ];

    const csvContent = [header, ...rows].join('\n');

    try {
      await Share.share({
        title: `${selectedOrg?.name || 'ComplianceGuard'}_Controls.csv`,
        message: csvContent,
      });
      showToast('Excel (CSV) report ready to save/share');
    } catch {
      showToast('Unable to share Excel file');
    }
  }

  async function handleDownloadEasBuild() {
    if (!canDownloadEas) {
      showToast(`Only Super Admin can download EAS build files. Current role: ${activeRole}`);
      return;
    }
    const targetUrl = (easBuildUrl || DEFAULT_EAS_BUILD_URL).trim();
    setDownloadingEas(true);
    try {
      await Linking.openURL(targetUrl);
      showToast('Opening EAS build link...');
    } catch {
      showToast(`EAS Build URL: ${targetUrl}`);
    } finally {
      setDownloadingEas(false);
    }
  }

  async function handleSignOut() {
    await saveSession('', null);
    setPassword('');
    setSelectedOrg(null);
    setSubScreen(null);
    setActiveTab('home');
    setScreen('auth');
    setAuthMode('login');
  }

  function markAllNotificationsRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  }

  const statusBarStyle = isDark ? 'light-content' : 'dark-content';
  const statusBarBg = isDark ? '#0B1120' : '#FFFFFF';

  if (screen === 'auth') {
    const isSignup = authMode === 'signup';

    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={[styles.mobileFrame, { width: frameWidth }]}>
          <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBg} />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.authScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.authCompactBlock}>
                <View style={styles.authMainSection}>
                  <BrandTopBar
                    isDark={isDark}
                    rightAction={
                      <Pressable
                        style={styles.ghostPill}
                        onPress={() => {
                          setApiError('');
                          setScreen('onboarding');
                        }}
                      >
                        <Text style={styles.skipText}>Intro</Text>
                      </Pressable>
                    }
                  />

                  <Text style={styles.uppercaseSectionCompact}>
                    {isSignup ? 'CREATE ACCOUNT' : 'SIGN IN'}
                  </Text>

                  {isSignup && (
                    <View style={styles.roleBoxCompact}>
                      <Text style={styles.roleBoxLabel}>Select Role: {signupRole}</Text>
                      <View style={styles.rolePillsRow}>
                        {ROLES.map((r) => {
                          const active = signupRole === r;
                          return (
                            <Pressable
                              key={r}
                              style={[styles.rolePill, active && styles.rolePillActive]}
                              onPress={() => setSignupRole(r)}
                            >
                              <Text
                                style={[
                                  styles.rolePillText,
                                  active && styles.rolePillTextActive,
                                ]}
                              >
                                {r}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text style={styles.roleDescText}>
                        {(ROLE_META[signupRole] || ROLE_META['Super Admin']).shortDesc}
                      </Text>
                    </View>
                  )}

                  {apiError ? (
                    <View style={styles.alertErrorBox}>
                      <Text style={styles.errorText}>{apiError}</Text>
                    </View>
                  ) : null}

                  <Text style={styles.compactFieldLabel}>Email</Text>
                  <View style={styles.iconInputWrap}>
                    <Text style={styles.leadingIcon}>✉</Text>
                    <TextInput
                      style={styles.iconTextInput}
                      placeholder="you@company.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={(val) => {
                        setApiError('');
                        setEmail(val);
                      }}
                    />
                  </View>

                  <Text style={styles.compactFieldLabel}>Password</Text>
                  <View style={styles.iconInputWrap}>
                    <Text style={styles.leadingIcon}>🔒</Text>
                    <TextInput
                      style={styles.iconTextInput}
                      placeholder={
                        isSignup ? 'Create a password' : 'Enter your password'
                      }
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      value={password}
                      onChangeText={(val) => {
                        setApiError('');
                        setPassword(val);
                      }}
                    />
                    <Pressable onPress={() => setShowPassword((prev) => !prev)}>
                      <EyeToggleIcon visible={showPassword} styles={styles} />
                    </Pressable>
                  </View>

                  {!isSignup ? (
                    <Pressable
                      style={styles.forgotLinkWrap}
                      onPress={openForgotPasswordScreen}
                    >
                      <Text style={styles.forgotLinkText}>Forgot password?</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.compactTermsRow}
                      onPress={() => setAgreedTerms((prev) => !prev)}
                    >
                      <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                        {agreedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
                      </View>
                      <Text style={styles.termsText}>
                        I agree to the Terms of Service and Privacy Policy
                      </Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={styles.compactBlueBtn}
                    onPress={handleAuthSubmit}
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.blueBtnText}>
                        {isSignup ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </Pressable>

                  <View style={styles.compactCenterRow}>
                    <Text style={styles.mutedSmall}>
                      {isSignup ? 'Already have an account? ' : "Don't have an account? "}
                    </Text>
                    <Pressable
                      onPress={() => goToAuthScreen(isSignup ? 'login' : 'signup')}
                    >
                      <Text style={styles.inlineBlueLink}>
                        {isSignup ? 'Sign in' : 'Create account'}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.compactOrDivider}>or</Text>

                  <Pressable
                    style={styles.googleBtn}
                    onPress={() => {
                      setApiError('');
                      setCustomGoogleEmail('');
                      setSelectedGoogleEmail(email.trim() || GOOGLE_ACCOUNTS[0].email);
                      setGoogleModalVisible(true);
                    }}
                  >
                    <Text style={styles.googleLogo}>G</Text>
                    <Text style={styles.googleBtnText}>Continue with Google</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.compactDemoBtn, { marginTop: 10 }]}
                    onPress={handleDemoFill}
                  >
                    <Text style={styles.demoBtnText}>Demo Fill</Text>
                  </Pressable>
                </View>

                <Text style={styles.authBottomFootnote}>
                  Your workspace. Your compliance journey.
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          <Modal
            visible={googleModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setGoogleModalVisible(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.googleModalCard}>
                <Text style={styles.modalTitle}>Choose an account</Text>
                <Text style={styles.modalSub}>to continue to ComplianceGuard</Text>

                {GOOGLE_ACCOUNTS.map((acc) => {
                  const key = acc.email.toLowerCase();
                  const isSelected =
                    !customGoogleEmail.trim() &&
                    selectedGoogleEmail.toLowerCase() === key;
                  const mappedRole =
                    registeredUsers[key]?.role || acc.suggestedRole;

                  return (
                    <Pressable
                      key={acc.email}
                      style={[
                        styles.googleAccountRow,
                        isSelected && styles.googleAccountRowSelected,
                      ]}
                      onPress={() => {
                        setCustomGoogleEmail('');
                        setSelectedGoogleEmail(acc.email);
                      }}
                    >
                      <View style={styles.accountAvatarBadge}>
                        <Text style={styles.accountAvatarText}>
                          {acc.name.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.accountNameText}>{acc.name}</Text>
                        <Text style={styles.accountEmailText}>{acc.email}</Text>
                      </View>
                      <Text style={styles.accountRoleTag}>{mappedRole}</Text>
                    </Pressable>
                  );
                })}

                <TextInput
                  style={[styles.fieldInput, { marginTop: 10 }]}
                  placeholder="Or type another email"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customGoogleEmail}
                  onChangeText={setCustomGoogleEmail}
                />

                <View style={styles.twoBtnRow}>
                  <Pressable
                    style={styles.cancelHalfBtn}
                    onPress={() => setGoogleModalVisible(false)}
                  >
                    <Text style={styles.cancelHalfText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.saveHalfBtn}
                    onPress={handleGoogleContinue}
                  >
                    <Text style={styles.saveHalfText}>Continue</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    );
  }

  if (screen === 'reset_password') {
    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={[styles.mobileFrame, { width: frameWidth }]}>
          <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBg} />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.resetScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <BrandTopBar
                isDark={isDark}
                rightAction={
                  <Pressable style={styles.ghostPill} onPress={() => goToAuthScreen('login')}>
                    <Text style={styles.skipText}>Sign In</Text>
                  </Pressable>
                }
              />

              <View style={styles.resetTopBlock}>
                <View style={styles.resetIconBox}>
                  <Text style={styles.lockIconGlyph}>🔐</Text>
                </View>

                <Text style={styles.resetTitle}>Forgot password (OTP)</Text>
                <Text style={styles.resetSub}>
                  Enter your registered email and tap Send OTP. Your OTP will be sent to your email address.
                </Text>

                {apiError ? (
                  <View style={styles.alertErrorBox}>
                    <Text style={styles.errorText}>{apiError}</Text>
                    {apiError.includes('not registered') ? (
                      <Pressable
                        style={{ marginTop: 8 }}
                        onPress={() => {
                          setEmail(resetEmail.trim());
                          goToAuthScreen('signup');
                        }}
                      >
                        <Text style={styles.inlineBlueLink}>Go to Create Account →</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {otpSentNotice ? (
                  <View style={styles.alertInfoBox}>
                    <Text style={styles.infoText}>{otpSentNotice}</Text>
                  </View>
                ) : null}

                {resetSuccessMsg ? (
                  <View style={styles.alertInfoBox}>
                    <Text style={styles.infoText}>{resetSuccessMsg}</Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.iconInputWrap}>
                  <Text style={styles.leadingIcon}>✉</Text>
                  <TextInput
                    style={styles.iconTextInput}
                    placeholder="you@company.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={resetEmail}
                    onChangeText={handleResetEmailChange}
                  />
                </View>

                <Pressable
                  style={styles.blueBtn}
                  onPress={handleSendOtp}
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.blueBtnText}>Send OTP</Text>
                  )}
                </Pressable>

                {otpTargetEmail ? (
                  <>
                    <Text style={styles.fieldLabel}>Enter OTP from Email</Text>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="Enter OTP received in your email"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      value={otpInput}
                      onChangeText={setOtpInput}
                    />

                    <Text style={styles.fieldLabel}>New Password</Text>
                    <View style={styles.iconInputWrap}>
                      <Text style={styles.leadingIcon}>🔒</Text>
                      <TextInput
                        style={styles.iconTextInput}
                        placeholder="Enter new password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        value={newPasswordInput}
                        onChangeText={setNewPasswordInput}
                      />
                      <Pressable onPress={() => setShowNewPassword((prev) => !prev)}>
                        <EyeToggleIcon visible={showNewPassword} styles={styles} />
                      </Pressable>
                    </View>

                    <Pressable
                      style={styles.blueBtn}
                      onPress={handleVerifyOtpAndReset}
                    >
                      <Text style={styles.blueBtnText}>Verify OTP &amp; Reset Password</Text>
                    </Pressable>
                  </>
                ) : null}

                <Pressable
                  style={styles.backToLoginBtn}
                  onPress={() => goToAuthScreen('login')}
                >
                  <Text style={styles.backToLoginText}>Back to Sign In</Text>
                </Pressable>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  if (screen === 'create_org') {
    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={[styles.mobileFrame, { width: frameWidth }]}>
          <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBg} />

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.subHeaderRow}>
                <Pressable onPress={goToWorkspaceScreen} hitSlop={12}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <View>
                  <Text style={styles.subHeaderTitle}>Create Your Company</Text>
                  <Text style={styles.subHeaderSub}>Set up your compliance workspace</Text>
                </View>
              </View>

              {apiError ? (
                <View style={styles.alertErrorBox}>
                  <Text style={styles.errorText}>{apiError}</Text>
                </View>
              ) : null}

              <Text style={styles.fieldLabel}>Company Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Acme Inc."
                placeholderTextColor="#94A3B8"
                value={orgName}
                onChangeText={setOrgName}
              />
              <Text style={styles.mutedSmall}>
                This will be your primary organization name in ComplianceGuard.
              </Text>

              <Text style={styles.fieldLabel}>Primary Compliance Framework *</Text>
              <View style={styles.fwRow}>
                {['SOC 2', 'ISO 27001'].map((fw) => {
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
              <View style={styles.fwRow}>
                {['HIPAA', 'GDPR'].map((fw) => {
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

  if (screen === 'dashboard') {
    const totalCount = controls.length;
    const compliantCount = controls.filter((c) => c.status === 'Compliant').length;
    const toCompleteCount = controls.filter((c) => c.status !== 'Compliant').length;
    const readinessScore =
      totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

    const visibleFrameworks = showAllFrameworks
      ? ALL_FRAMEWORKS_OVERVIEW
      : ALL_FRAMEWORKS_OVERVIEW.slice(0, 2);

    const attentionTasks =
      totalCount > 0
        ? controls
          .filter((c) => c.status !== 'Compliant')
          .slice(0, 3)
          .map((c, idx) => ({
            id: c._id || c.id || `task-${idx}`,
            title: c.title || c.name || 'Review compliance control',
            meta: `${c.framework || 'SOC 2'} • ${c.status || 'In Progress'}`,
            ctrlObj: c,
          }))
        : [
          {
            id: 'sample-1',
            title: 'Review access permissions',
            meta: 'SOC 2 • Due Nov 26',
            ctrlObj: null,
          },
          {
            id: 'sample-2',
            title: 'Upload security policy',
            meta: 'ISO 27001 • Due Nov 28',
            ctrlObj: null,
          },
        ];

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
      (currentUser?.email ? currentUser.email.split('@')[0] : 'User');
    const profileDisplayEmail = currentUser?.email || '';
    const companyDisplayName = selectedOrg?.name || 'ComplianceGuard Workspace';

    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={[styles.mobileFrame, { width: frameWidth }]}>
          <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBg} />

          {statusBanner ? (
            <View style={styles.toastBox}>
              <Text style={styles.toastText}>{statusBanner}</Text>
            </View>
          ) : null}

          {subScreen === 'change_role' && (
            <ScrollView contentContainerStyle={styles.dashScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)} hitSlop={12}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <View>
                  <Text style={styles.subHeaderTitle}>Change Role</Text>
                  <Text style={styles.subHeaderSub}>
                    Active account: {profileDisplayEmail || profileDisplayName} ({activeRole})
                  </Text>
                </View>
              </View>

              <View style={styles.alertInfoBox}>
                <Text style={styles.infoText}>
                  Change role for {roleTargetEmail || 'account'} to "{roleDraftChoice}".
                  Tap Save to apply immediately.
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Account Email</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="account@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={roleTargetEmail}
                onChangeText={setRoleTargetEmail}
              />

              <Text style={styles.fieldLabel}>Select Role</Text>
              <View style={styles.rolePillsRow}>
                {ROLES.map((r) => {
                  const active = roleDraftChoice === r;
                  return (
                    <Pressable
                      key={r}
                      style={[styles.rolePill, active && styles.rolePillActive]}
                      onPress={() => setRoleDraftChoice(r)}
                    >
                      <Text style={[styles.rolePillText, active && styles.rolePillTextActive]}>
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.roleDescText}>
                {(ROLE_META[roleDraftChoice] || ROLE_META['Super Admin']).shortDesc}
              </Text>

              <Pressable
                style={styles.blueBtn}
                onPress={handleSaveRoleChange}
              >
                <Text style={styles.blueBtnText}>Save</Text>
              </Pressable>
            </ScrollView>
          )}

          {subScreen === 'notifications' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.notifTopHeader}>
                <View style={styles.subHeaderRow}>
                  <Pressable onPress={() => setSubScreen(null)} hitSlop={12}>
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

          {subScreen === 'support' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)} hitSlop={12}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <Text style={styles.subHeaderTitle}>Help &amp; Support</Text>
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

              <Pressable
                style={styles.blueBtn}
                onPress={() => {
                  showToast('Support request sent');
                  setSupportMessage('');
                }}
              >
                <Text style={styles.blueBtnText}>✉ Contact Support</Text>
              </Pressable>
            </ScrollView>
          )}

          {subScreen === 'activity' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)} hitSlop={12}>
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

          {subScreen === 'about' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)} hitSlop={12}>
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

          {subScreen === 'detail' && selectedControl && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setSubScreen(null)} hitSlop={12}>
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
                  {selectedControl.framework || 'SOC 2'} • {companyDisplayName}
                </Text>

                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailBody}>
                  {selectedControl.description ||
                    'Review user access to critical systems every quarter. Confirm permissions follow least privilege and remove access that is no longer required.'}
                </Text>

                <View style={styles.detailMetaRow}>
                  <Text style={styles.mutedSmall}>Control owner</Text>
                  <Text style={styles.detailMetaVal}>
                    {selectedControl.updatedBy || profileDisplayName}
                  </Text>
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.mutedSmall}>Last Updated</Text>
                  <Text style={styles.detailMetaVal}>{todayFormatted}</Text>
                </View>

                {canEdit ? (
                  <>
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
                  </>
                ) : (
                  <Text style={[styles.mutedSmall, { marginTop: 12 }]}>
                    Read-only view ({activeRole}).
                  </Text>
                )}
              </View>
            </ScrollView>
          )}

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
                      {selectedOrg ? `${selectedOrg.framework || 'SOC 2'} • ${activeRole}` : `Your workspace • ${activeRole}`}
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
                <Text style={styles.dateLabel}>{todayFormatted}</Text>
              </View>

              <Pressable
                style={styles.blueHeroCard}
                onPress={() => {
                  if (canEdit && totalCount === 0) {
                    setShowAddControl(true);
                  }
                  setActiveTab('controls');
                }}
              >
                <View style={styles.blueHeroTop}>
                  <Text style={styles.blueHeroLabel}>Compliance Readiness</Text>
                  <Text style={styles.blueHeroChevron}>›</Text>
                </View>
                <Text style={styles.blueHeroPercent}>{readinessScore}%</Text>
                <View style={styles.blueProgressTrack}>
                  <View style={[styles.blueProgressFill, { width: `${readinessScore}%` }]} />
                </View>
                <Text style={styles.blueHeroCaption}>
                  {totalCount === 0
                    ? `0 controls in ${companyDisplayName} • Tap to add controls`
                    : `${compliantCount} of ${totalCount} controls compliant in ${companyDisplayName}`}
                </Text>
              </Pressable>

              <View style={styles.stats3Row}>
                <View style={styles.statTile3}>
                  <Text style={styles.statNumBlue}>{totalCount}</Text>
                  <Text style={styles.statLabel}>Total Controls</Text>
                </View>
                <View style={styles.statTile3}>
                  <Text style={styles.statNumBlue}>{compliantCount}</Text>
                  <Text style={styles.statLabel}>Compliant</Text>
                </View>
                <View style={styles.statTile3}>
                  <Text style={styles.statNumBlue}>{toCompleteCount}</Text>
                  <Text style={styles.statLabel}>To Complete</Text>
                </View>
              </View>

              {canExportExcel && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>Excel Report ({activeRole})</Text>
                  <Text style={styles.listCardSub}>
                    Download {companyDisplayName} controls data as an Excel-compatible file.
                  </Text>
                  <Pressable
                    style={styles.blueBtn}
                    onPress={handleDownloadExcelFile}
                  >
                    <Text style={styles.blueBtnText}>📊 Download Excel File</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.overviewSectionBlock}>
                <View style={styles.rowBetween}>
                  <Text style={styles.overviewSubHeading}>Your frameworks</Text>
                  <Pressable onPress={() => setShowAllFrameworks((prev) => !prev)}>
                    <Text style={styles.inlineBlueLink}>
                      {showAllFrameworks ? 'Show less' : 'View all'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.frameworksGrid}>
                  {visibleFrameworks.map((fwItem) => {
                    const fwControls = controls.filter(
                      (c) => (c.framework || '').toLowerCase() === fwItem.name.toLowerCase()
                    );
                    const fwCompliant = fwControls.filter(
                      (c) => c.status === 'Compliant'
                    ).length;
                    const pct =
                      fwControls.length > 0
                        ? Math.round((fwCompliant / fwControls.length) * 100)
                        : 0;

                    return (
                      <Pressable
                        key={fwItem.name}
                        style={styles.frameworkCard}
                        onPress={() => {
                          setSearchQuery(fwItem.name);
                          setActiveTab('controls');
                        }}
                      >
                        <Text style={styles.frameworkTitle}>🛡 {fwItem.name}</Text>
                        <View style={styles.frameworkBottomRow}>
                          <Text style={styles.frameworkSub}>Readiness</Text>
                          <Text style={styles.frameworkPct}>{pct}%</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.overviewSectionBlock}>
                <View style={styles.rowBetween}>
                  <Text style={styles.overviewSubHeading}>Needs your attention</Text>
                  <Text style={styles.mutedSmall}>{attentionTasks.length} tasks</Text>
                </View>

                <View style={styles.attentionListCard}>
                  {attentionTasks.map((task, idx) => (
                    <Pressable
                      key={task.id}
                      style={[
                        styles.attentionRow,
                        idx > 0 && styles.attentionRowBorder,
                      ]}
                      onPress={() => {
                        if (task.ctrlObj) {
                          setSelectedControl(task.ctrlObj);
                          setNoteDraft(task.ctrlObj.evidence || task.ctrlObj.evidenceNote || '');
                          setSubScreen('detail');
                        } else {
                          setActiveTab('controls');
                        }
                      }}
                    >
                      <Text style={styles.attentionIcon}>📋</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attentionTitle}>{task.title}</Text>
                        <Text style={styles.attentionMeta}>{task.meta}</Text>
                      </View>
                      <Text style={styles.menuChevron}>›</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {canDownloadEas && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>EAS Build File</Text>
                  <Text style={styles.listCardSub}>
                    Open your Expo / EAS build link.
                  </Text>
                  <Pressable
                    style={styles.blueBtn}
                    onPress={handleDownloadEasBuild}
                    disabled={downloadingEas}
                  >
                    <Text style={styles.blueBtnText}>
                      {downloadingEas ? 'Opening EAS Link...' : '⬇ Download EAS Build File'}
                    </Text>
                  </Pressable>
                </View>
              )}

              {totalCount > 0 && (
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

          {!subScreen && activeTab === 'controls' && (
            <ScrollView contentContainerStyle={styles.dashScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.subHeaderRow}>
                <Pressable onPress={() => setActiveTab('home')} hitSlop={12}>
                  <Text style={styles.backChevron}>‹</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subHeaderTitle}>Controls • {companyDisplayName}</Text>
                  <Text style={styles.subHeaderSub}>{activeRole}</Text>
                </View>
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
                {companyDisplayName}: {totalCount} controls • {toCompleteCount} need attention
              </Text>

              {canExportExcel && (
                <Pressable
                  style={[styles.compactDemoBtn, { marginBottom: 12 }]}
                  onPress={handleDownloadExcelFile}
                >
                  <Text style={styles.demoBtnText}>📊 Download Excel File</Text>
                </Pressable>
              )}

              {showAddControl && canEdit && (
                <View style={styles.formCard}>
                  <Text style={styles.listCardTitle}>Add Control ({companyDisplayName})</Text>

                  <Text style={styles.fieldLabel}>Control ID</Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g. CC6.1 or A.5.1"
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
                    placeholder={profileDisplayName}
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
                  <WelcomeShieldArtwork styles={styles} />
                  <Text style={styles.emptyBoldTitle}>No controls added yet.</Text>
                  <Text style={styles.emptySubText}>
                    Add controls specific to {companyDisplayName}.
                  </Text>
                  {canEdit && (
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

                      {canEdit && (
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
                      )}

                      {isEditingNote && canEdit ? (
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
                          {canEdit && (
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

                      {canDelete && (
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

              {canEdit && (
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
                <Text style={styles.profileEmailText}>
                  {profileDisplayEmail} • {activeRole}
                </Text>
              </View>

              <Pressable style={styles.orgSummaryCard} onPress={() => goToWorkspaceScreen()}>
                <View style={styles.orgIconBox}>
                  <Text style={styles.orgIconGlyph}>🏢</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orgCardTitle}>{companyDisplayName}</Text>
                  <Text style={styles.orgCardSub}>Current role: {activeRole}</Text>
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

          {!subScreen && activeTab === 'settings' && (
            <ScrollView contentContainerStyle={styles.dashScroll}>
              <Text style={styles.pageTitleLarge}>Settings</Text>
              <Text style={styles.pageSubMuted}>Make ComplianceGuard work for you.</Text>

              <Text style={styles.sectionCaps}>ROLE &amp; ACCESS</Text>
              <View style={styles.menuGroupCard}>
                <Pressable style={styles.menuRow} onPress={openChangeRoleSubScreen}>
                  <Text style={styles.menuLeftIcon}>👥</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowLabel}>Change Role</Text>
                    <Text style={styles.menuRowSub}>
                      {profileDisplayEmail || profileDisplayName} • {activeRole}
                    </Text>
                  </View>
                  <Text style={styles.menuRightValue}>{activeRole} ›</Text>
                </Pressable>
              </View>

              {canExportExcel && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>Excel File Download</Text>
                  <Text style={styles.listCardSub}>
                    Export {companyDisplayName} controls to an Excel-compatible file.
                  </Text>
                  <Pressable
                    style={styles.blueBtn}
                    onPress={handleDownloadExcelFile}
                  >
                    <Text style={styles.blueBtnText}>📊 Download Excel File</Text>
                  </Pressable>
                </View>
              )}

              {canDownloadEas && (
                <View style={styles.listCard}>
                  <Text style={styles.listCardTitle}>EAS Build File Download</Text>
                  <Text style={styles.listCardSub}>
                    Super Admin access enabled: open EAS build link.
                  </Text>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="https://expo.dev/.../builds"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    value={easBuildUrl}
                    onChangeText={setEasBuildUrl}
                  />
                  <Pressable
                    style={styles.blueBtn}
                    onPress={handleDownloadEasBuild}
                    disabled={downloadingEas}
                  >
                    <Text style={styles.blueBtnText}>
                      {downloadingEas ? 'Opening...' : '⬇ Download EAS Build File'}
                    </Text>
                  </Pressable>
                </View>
              )}

              <Text style={styles.sectionCaps}>PREFERENCES</Text>
              <View style={styles.menuGroupCard}>
                <Pressable style={styles.menuRow} onPress={toggleAppearanceTheme}>
                  <Text style={styles.menuLeftIcon}>{isDark ? '🌙' : '☀'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowLabel}>Appearance</Text>
                    <Text style={styles.menuRowSub}>
                      Tap to switch between Light and Dark mode
                    </Text>
                  </View>
                  <Text style={styles.menuRightValue}>
                    {isDark ? 'Dark ›' : 'Light ›'}
                  </Text>
                </Pressable>

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
                  onPress={() => showToast('Password & role permissions active')}
                >
                  <Text style={styles.menuLeftIcon}>🛡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuRowLabel}>Security &amp; Privacy</Text>
                    <Text style={styles.menuRowSub}>
                      Password &amp; role permissions
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

  if (screen === 'workspace') {
    return (
      <View style={styles.outerFrame}>
        <SafeAreaView style={[styles.mobileFrame, { width: frameWidth }]}>
          <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBg} />

          {statusBanner ? (
            <View style={styles.toastBox}>
              <Text style={styles.toastText}>{statusBanner}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <BrandTopBar
              isDark={isDark}
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

                <WelcomeShieldArtwork styles={styles} />

                <Text style={styles.createPromptText}>
                  Create your company to begin tracking compliance and audit readiness.
                </Text>

                {canEdit && (
                  <Pressable
                    style={[styles.blueBtn, { width: '100%' }]}
                    onPress={openCreateCompanyScreen}
                  >
                    <Text style={styles.blueBtnText}>Create Your Company</Text>
                  </Pressable>
                )}

                <Pressable onPress={() => loadOrganizations()}>
                  <Text style={styles.learnMoreLink}>Refresh Workspaces</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.authBlock}>
                <View style={styles.workspaceHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.uppercaseSection}>YOUR WORKSPACES</Text>
                    <Text style={styles.authSub}>
                      {currentUser?.email} • {activeRole}
                    </Text>
                  </View>
                  <Pressable onPress={() => loadOrganizations()}>
                    <Text style={styles.inlineBlueLink}>Refresh</Text>
                  </Pressable>
                </View>

                <View style={styles.listGap}>
                  {orgs.map((item, idx) => {
                    const orgId = getOrgIdValue(item);
                    const rowKey = orgId || `org-${idx}`;
                    const isConfirming = confirmDeleteOrgId === rowKey;
                    const isDeleting = deletingOrgId === rowKey;
                    const orgCtrlCount = (controlsByOrg[getOrgKey(item)] || []).length;

                    return (
                      <View key={rowKey} style={styles.orgSelectCard}>
                        <View style={styles.orgCardTopRow}>
                          <Pressable
                            style={{ flex: 1, paddingRight: 10 }}
                            onPress={() => openWorkspaceDashboard(item)}
                          >
                            <Text style={styles.orgSelectName}>
                              {item.name || 'Your Company'}
                            </Text>
                            <Text style={styles.orgSelectMeta}>
                              {item.framework || 'SOC 2'} • {item.cloud || 'AWS'} • {orgCtrlCount} controls
                            </Text>
                          </Pressable>

                          {canDelete && (
                            <Pressable
                              style={styles.orgDeletePill}
                              onPress={() =>
                                setConfirmDeleteOrgId(isConfirming ? null : rowKey)
                              }
                              disabled={isDeleting}
                            >
                              <Text style={styles.orgDeletePillText}>
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </Text>
                            </Pressable>
                          )}
                        </View>

                        {isConfirming && canDelete && (
                          <View style={styles.orgConfirmBox}>
                            <Text style={styles.orgConfirmText}>
                              Delete "{item.name || 'Workspace'}" permanently?
                            </Text>
                            <View style={styles.orgConfirmActions}>
                              <Pressable
                                style={styles.orgConfirmYesBtn}
                                onPress={() => handleDeleteOrganization(item, idx)}
                                disabled={isDeleting}
                              >
                                <Text style={styles.orgConfirmYesText}>
                                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                                </Text>
                              </Pressable>
                              <Pressable
                                style={styles.orgConfirmCancelBtn}
                                onPress={() => setConfirmDeleteOrgId(null)}
                              >
                                <Text style={styles.orgConfirmCancelText}>Cancel</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                {canEdit && (
                  <Pressable style={styles.blueBtn} onPress={openCreateCompanyScreen}>
                    <Text style={styles.blueBtnText}>Create Your Company</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.outerFrame}>
      <SafeAreaView style={[styles.mobileFrame, { width: frameWidth }]}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={statusBarBg} />

        <View style={styles.onboardScreenWrap}>
          <BrandTopBar
            isDark={isDark}
            rightAction={
              !isLastStep ? (
                <Pressable style={styles.ghostPill} onPress={() => goToAuthScreen('login')}>
                  <Text style={styles.skipText}>Skip</Text>
                </Pressable>
              ) : null
            }
          />

          <View style={styles.onboardBodyBlock}>
            <OnboardingArtwork index={stepIndex} styles={styles} />

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
        </View>
      </SafeAreaView>
    </View>
  );
}

const TOP_SAFE = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16;
const BLUE_PRIMARY = '#2554D7';

function createStyles(wScale, hScale, isDark = false) {
  const sw = (v) => Math.round(v * wScale);
  const sh = (v) => Math.round(v * hScale);
  const sf = (v) => Math.round(v * wScale * 1.15);

  const C = isDark
    ? {
      outerBg: '#020617',
      frameBg: '#0B1120',
      cardBg: '#111827',
      subtleBg: '#1E293B',
      border: '#334155',
      rowDivider: '#1E293B',
      textPrimary: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textMuted: '#94A3B8',
      brandTitle: '#60A5FA',
      linkBlue: '#60A5FA',
      pillBg: '#1E293B',
      circleTint: '#172554',
    }
    : {
      outerBg: '#E2E8F0',
      frameBg: '#FFFFFF',
      cardBg: '#FFFFFF',
      subtleBg: '#F8FAFC',
      border: '#E2E8F0',
      rowDivider: '#F1F5F9',
      textPrimary: '#0F172A',
      textSecondary: '#334155',
      textMuted: '#64748B',
      brandTitle: BLUE_PRIMARY,
      linkBlue: BLUE_PRIMARY,
      pillBg: '#F8FAFC',
      circleTint: '#EFF6FF',
    };

  return StyleSheet.create({
    outerFrame: {
      flex: 1,
      backgroundColor: C.outerBg,
      alignItems: 'center',
    },
    mobileFrame: {
      flex: 1,
      backgroundColor: C.frameBg,
      paddingTop: TOP_SAFE,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: sw(18),
      paddingTop: sh(8),
      paddingBottom: sh(36),
    },
    authScrollContent: {
      flexGrow: 1,
      paddingHorizontal: sw(18),
      paddingTop: sh(8),
      paddingBottom: sh(40),
    },
    resetScrollContent: {
      flexGrow: 1,
      paddingHorizontal: sw(18),
      paddingTop: sh(8),
      paddingBottom: sh(180),
    },
    dashScroll: {
      paddingHorizontal: sw(16),
      paddingTop: sh(12),
      paddingBottom: sh(36),
    },
    roleBoxCompact: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      padding: sw(10),
      backgroundColor: C.subtleBg,
      marginTop: sh(6),
      marginBottom: sh(10),
    },
    roleBoxLabel: {
      fontSize: sf(12.5),
      fontWeight: '800',
      color: C.textPrimary,
      marginBottom: sh(8),
    },
    rolePillsRow: {
      flexDirection: 'row',
      gap: sw(6),
      marginTop: sh(6),
    },
    rolePill: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(8),
      paddingVertical: sh(8),
      paddingHorizontal: sw(6),
      backgroundColor: C.cardBg,
      alignItems: 'center',
    },
    rolePillActive: {
      backgroundColor: BLUE_PRIMARY,
      borderColor: BLUE_PRIMARY,
    },
    rolePillText: {
      fontSize: sf(12),
      fontWeight: '700',
      color: C.textSecondary,
    },
    rolePillTextActive: {
      color: '#FFFFFF',
    },
    roleDescText: {
      fontSize: sf(12),
      color: C.textMuted,
      marginTop: sh(8),
      lineHeight: sh(18),
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: sh(8),
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(10),
    },
    logoBadge: {
      backgroundColor: BLUE_PRIMARY,
      paddingHorizontal: sw(10),
      paddingVertical: sh(6),
      borderRadius: sw(8),
    },
    logoText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: sf(13),
    },
    brandName: {
      fontSize: sf(19),
      fontWeight: '800',
      color: C.brandTitle,
      letterSpacing: -0.2,
    },
    ghostPill: {
      backgroundColor: C.pillBg,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: sw(12),
      paddingVertical: sh(6),
      borderRadius: sw(8),
    },
    skipText: {
      fontSize: sf(13),
      fontWeight: '700',
      color: C.textSecondary,
    },
    onboardScreenWrap: {
      flex: 1,
      paddingHorizontal: sw(18),
      justifyContent: 'space-between',
    },
    onboardBodyBlock: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sh(12),
    },
    artStage: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: sh(18),
    },
    artBackdropCircle: {
      width: sw(176),
      height: sw(176),
      borderRadius: sw(88),
      backgroundColor: C.circleTint,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    welcomeShieldStage: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: sh(8),
    },
    welcomeShieldCircle: {
      width: sw(118),
      height: sw(118),
      borderRadius: sw(59),
      backgroundColor: C.circleTint,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    sparkle: {
      position: 'absolute',
      fontSize: sf(14),
      fontWeight: '800',
    },
    shieldOuter: {
      width: sw(72),
      height: sh(84),
      borderTopLeftRadius: sw(15),
      borderTopRightRadius: sw(15),
      borderBottomLeftRadius: sw(38),
      borderBottomRightRadius: sw(38),
      backgroundColor: BLUE_PRIMARY,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    shieldInnerLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '50%',
      backgroundColor: '#1D4ED8',
    },
    shieldInnerRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: '50%',
      backgroundColor: '#3B82F6',
    },
    shieldCheckMark: {
      fontSize: sf(30),
      fontWeight: '800',
      color: '#FFFFFF',
      zIndex: 2,
    },
    lockBadgeCard: {
      position: 'absolute',
      right: sw(12),
      bottom: sh(12),
      alignItems: 'center',
      zIndex: 4,
    },
    lockShackle: {
      width: sw(15),
      height: sh(10),
      borderTopLeftRadius: sw(8),
      borderTopRightRadius: sw(8),
      borderWidth: 2.5,
      borderBottomWidth: 0,
      borderColor: '#1E40AF',
      marginBottom: -2,
    },
    lockBody: {
      width: sw(24),
      height: sh(19),
      borderRadius: sw(5),
      backgroundColor: '#1D4ED8',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    lockKeyhole: {
      width: sw(4),
      height: sh(6),
      borderRadius: sw(2),
      backgroundColor: '#FFFFFF',
    },
    docSheet: {
      width: sw(88),
      height: sh(108),
      borderRadius: sw(12),
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#BFDBFE',
      paddingTop: sh(20),
      paddingHorizontal: sw(11),
      gap: sh(8),
    },
    docClip: {
      position: 'absolute',
      top: -6,
      alignSelf: 'center',
      width: sw(32),
      height: sh(10),
      borderRadius: sw(5),
      backgroundColor: BLUE_PRIMARY,
    },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(7),
    },
    docDot: {
      width: sw(8),
      height: sw(8),
      borderRadius: sw(4),
      backgroundColor: BLUE_PRIMARY,
    },
    docLine: {
      flex: 1,
      height: sh(6),
      borderRadius: sw(3),
      backgroundColor: '#DBEAFE',
    },
    gearBadge: {
      position: 'absolute',
      top: sh(20),
      right: sw(18),
      width: sw(32),
      height: sw(32),
      borderRadius: sw(16),
      backgroundColor: BLUE_PRIMARY,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    gearGlyph: {
      fontSize: sf(15),
      color: '#FFFFFF',
    },
    checkBadgeBlue: {
      position: 'absolute',
      bottom: sh(18),
      left: sw(20),
      width: sw(28),
      height: sw(28),
      borderRadius: sw(14),
      backgroundColor: '#1D4ED8',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    checkBadgeGlyph: {
      fontSize: sf(13),
      fontWeight: '800',
      color: '#FFFFFF',
    },
    chartMiniCard: {
      position: 'absolute',
      left: sw(20),
      bottom: sh(32),
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: sw(5),
      backgroundColor: '#FFFFFF',
      paddingHorizontal: sw(8),
      paddingVertical: sh(7),
      borderRadius: sw(8),
      borderWidth: 1,
      borderColor: '#BFDBFE',
      zIndex: 3,
    },
    chartBar: {
      width: sw(7),
      borderRadius: sw(3),
    },
    certSheet: {
      width: sw(90),
      height: sh(110),
      borderRadius: sw(12),
      backgroundColor: '#FFFFFF',
      borderWidth: 1.5,
      borderColor: '#BFDBFE',
      padding: sw(11),
      marginLeft: sw(22),
      justifyContent: 'space-between',
    },
    certLineLong: {
      height: sh(6),
      borderRadius: sw(3),
      backgroundColor: '#DBEAFE',
      width: '90%',
    },
    certLineMed: {
      height: sh(6),
      borderRadius: sw(3),
      backgroundColor: '#DBEAFE',
      width: '70%',
    },
    certLineShort: {
      height: sh(6),
      borderRadius: sw(3),
      backgroundColor: '#EFF6FF',
      width: '50%',
    },
    certSealCircle: {
      alignSelf: 'flex-end',
      width: sw(28),
      height: sw(28),
      borderRadius: sw(14),
      backgroundColor: BLUE_PRIMARY,
      alignItems: 'center',
      justifyContent: 'center',
    },
    certSealCheck: {
      color: '#FFFFFF',
      fontSize: sf(13),
      fontWeight: '800',
    },
    onboardEyebrow: {
      fontSize: sf(12),
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 0.7,
      marginTop: sh(8),
      textAlign: 'center',
    },
    onboardTitle: {
      fontSize: sf(26),
      fontWeight: '800',
      color: C.textPrimary,
      textAlign: 'center',
      marginTop: sh(8),
      lineHeight: sh(34),
    },
    onboardSubtitle: {
      fontSize: sf(14.5),
      color: C.textMuted,
      textAlign: 'center',
      marginTop: sh(10),
      lineHeight: sh(22),
      paddingHorizontal: sw(6),
    },
    dotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(6),
      marginTop: sh(18),
    },
    dot: {
      height: sh(6),
      borderRadius: 999,
    },
    activeDot: {
      width: sw(22),
      backgroundColor: BLUE_PRIMARY,
    },
    inactiveDot: {
      width: sw(6),
      backgroundColor: C.border,
    },
    onboardBottom: {
      paddingBottom: sh(18),
    },
    authBlock: {
      flex: 1,
      justifyContent: 'flex-start',
      marginTop: sh(10),
    },
    authCompactBlock: {
      flex: 1,
      justifyContent: 'space-between',
      marginTop: sh(12),
    },
    authMainSection: {
      flexGrow: 1,
      justifyContent: 'flex-start',
    },
    workspaceHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: sh(6),
    },
    uppercaseSection: {
      fontSize: sf(15),
      fontWeight: '800',
      color: C.textPrimary,
      letterSpacing: 0.4,
      marginBottom: sh(4),
    },
    uppercaseSectionCompact: {
      fontSize: sf(14),
      fontWeight: '800',
      color: C.textPrimary,
      letterSpacing: 0.4,
      marginTop: sh(6),
      marginBottom: sh(6),
    },
    authSub: {
      fontSize: sf(13.5),
      color: C.textMuted,
      marginTop: sh(4),
      marginBottom: sh(10),
    },
    compactFieldLabel: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
      marginTop: sh(12),
      marginBottom: sh(6),
    },
    fieldLabel: {
      fontSize: sf(14),
      fontWeight: '700',
      color: C.textPrimary,
      marginTop: sh(14),
      marginBottom: sh(7),
    },
    fieldInput: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      paddingHorizontal: sw(14),
      paddingVertical: sh(12),
      fontSize: sf(14.5),
      color: C.textPrimary,
    },
    iconInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      paddingHorizontal: sw(13),
      minHeight: sh(48),
    },
    leadingIcon: {
      fontSize: sf(15),
      color: C.textMuted,
      marginRight: sw(10),
    },
    iconTextInput: {
      flex: 1,
      paddingVertical: sh(12),
      fontSize: sf(14.5),
      color: C.textPrimary,
    },
    eyeIconBox: {
      width: sw(28),
      height: sh(22),
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    eyeOuterOval: {
      width: sw(22),
      height: sh(13),
      borderRadius: 999,
      borderWidth: 1.8,
      borderColor: C.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eyeInnerCircle: {
      width: sw(6),
      height: sw(6),
      borderRadius: sw(3),
      borderWidth: 1.6,
      borderColor: C.textMuted,
    },
    eyeDiagonalSlash: {
      position: 'absolute',
      width: sw(23),
      height: 1.8,
      backgroundColor: C.textMuted,
      borderRadius: 1,
      transform: [{ rotate: '-35deg' }],
    },
    forgotLinkWrap: {
      alignSelf: 'flex-end',
      marginTop: sh(10),
      marginBottom: sh(4),
    },
    forgotLinkText: {
      fontSize: sf(13),
      fontWeight: '700',
      color: C.linkBlue,
    },
    compactTermsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(8),
      marginTop: sh(14),
    },
    checkbox: {
      width: sw(18),
      height: sw(18),
      borderRadius: sw(4),
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
      fontSize: sf(11),
      fontWeight: '800',
    },
    termsText: {
      flex: 1,
      fontSize: sf(12.5),
      color: C.textSecondary,
      lineHeight: sh(19),
    },
    compactBlueBtn: {
      backgroundColor: BLUE_PRIMARY,
      borderRadius: sw(10),
      paddingVertical: sh(14),
      paddingHorizontal: sw(18),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: sh(14),
    },
    blueBtn: {
      backgroundColor: BLUE_PRIMARY,
      borderRadius: sw(10),
      paddingVertical: sh(14),
      paddingHorizontal: sw(18),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: sh(14),
    },
    blueBtnText: {
      color: '#FFFFFF',
      fontSize: sf(15),
      fontWeight: '700',
    },
    compactCenterRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: sh(14),
      flexWrap: 'wrap',
    },
    centerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: sh(14),
      flexWrap: 'wrap',
    },
    mutedSmall: {
      fontSize: sf(13),
      color: C.textMuted,
    },
    inlineBlueLink: {
      fontSize: sf(13),
      fontWeight: '700',
      color: C.linkBlue,
    },
    compactOrDivider: {
      textAlign: 'center',
      fontSize: sf(13),
      color: '#94A3B8',
      marginVertical: sh(10),
    },
    googleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: sw(8),
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      paddingVertical: sh(13),
    },
    googleLogo: {
      fontSize: sf(16),
      fontWeight: '800',
      color: C.linkBlue,
    },
    googleBtnText: {
      fontSize: sf(14.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    compactDemoBtn: {
      backgroundColor: C.subtleBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      paddingVertical: sh(11),
      alignItems: 'center',
      justifyContent: 'center',
    },
    demoBtnText: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    authBottomFootnote: {
      textAlign: 'center',
      fontSize: sf(12.5),
      color: '#94A3B8',
      paddingTop: sh(16),
      paddingBottom: sh(8),
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(15, 23, 42, 0.55)',
      justifyContent: 'center',
      paddingHorizontal: sw(18),
    },
    googleModalCard: {
      backgroundColor: C.cardBg,
      borderRadius: sw(14),
      padding: sw(16),
      borderWidth: 1,
      borderColor: C.border,
    },
    modalTitle: {
      fontSize: sf(18),
      fontWeight: '800',
      color: C.textPrimary,
    },
    modalSub: {
      fontSize: sf(13),
      color: C.textMuted,
      marginTop: sh(2),
      marginBottom: sh(12),
    },
    googleAccountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(10),
      padding: sw(10),
      borderRadius: sw(10),
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: sh(8),
      backgroundColor: C.cardBg,
    },
    googleAccountRowSelected: {
      borderColor: BLUE_PRIMARY,
      backgroundColor: C.circleTint,
    },
    accountAvatarBadge: {
      width: sw(34),
      height: sw(34),
      borderRadius: sw(17),
      backgroundColor: BLUE_PRIMARY,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountAvatarText: {
      color: '#FFFFFF',
      fontWeight: '800',
      fontSize: sf(14),
    },
    accountNameText: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    accountEmailText: {
      fontSize: sf(12),
      color: C.textMuted,
    },
    accountRoleTag: {
      fontSize: sf(11),
      fontWeight: '700',
      color: C.linkBlue,
    },
    resetTopBlock: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: sh(16),
    },
    resetIconBox: {
      width: sw(46),
      height: sw(46),
      borderRadius: sw(12),
      backgroundColor: C.circleTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: sh(14),
    },
    resetTitle: {
      fontSize: sf(25),
      fontWeight: '800',
      color: C.textPrimary,
    },
    resetSub: {
      fontSize: sf(13.5),
      color: C.textMuted,
      marginTop: sh(6),
      marginBottom: sh(16),
      lineHeight: sh(21),
    },
    lockIconGlyph: {
      fontSize: sf(20),
    },
    backToLoginBtn: {
      alignItems: 'center',
      marginTop: sh(16),
    },
    backToLoginText: {
      fontSize: sf(14),
      fontWeight: '600',
      color: C.linkBlue,
    },
    alertErrorBox: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: sw(10),
      padding: sw(11),
      marginTop: sh(8),
    },
    errorText: {
      color: '#B91C1C',
      fontSize: sf(13),
      fontWeight: '600',
    },
    alertInfoBox: {
      backgroundColor: C.circleTint,
      borderWidth: 1,
      borderColor: '#BFDBFE',
      borderRadius: sw(10),
      padding: sw(11),
      marginTop: sh(8),
    },
    infoText: {
      color: C.linkBlue,
      fontSize: sf(13),
      fontWeight: '700',
      lineHeight: sh(19),
    },
    emptyWorkspaceCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: sw(8),
      paddingVertical: sh(20),
    },
    welcomeBigTitle: {
      fontSize: sf(26),
      fontWeight: '800',
      color: C.textPrimary,
      textAlign: 'center',
      lineHeight: sh(34),
    },
    welcomeSubLine: {
      fontSize: sf(14),
      color: C.textMuted,
      marginTop: sh(8),
      marginBottom: sh(18),
      textAlign: 'center',
    },
    createPromptText: {
      fontSize: sf(14),
      color: C.textMuted,
      textAlign: 'center',
      marginTop: sh(20),
      marginBottom: sh(14),
      lineHeight: sh(21),
    },
    learnMoreLink: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.linkBlue,
      marginTop: sh(16),
    },
    listGap: {
      gap: sh(12),
      marginTop: sh(8),
    },
    orgSelectCard: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(14),
      backgroundColor: C.subtleBg,
    },
    orgCardTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    orgSelectName: {
      fontSize: sf(17),
      fontWeight: '800',
      color: C.textPrimary,
    },
    orgSelectMeta: {
      fontSize: sf(13),
      color: C.textMuted,
      marginTop: sh(4),
      fontWeight: '600',
    },
    orgDeletePill: {
      backgroundColor: '#FEF2F2',
      borderWidth: 1,
      borderColor: '#FECACA',
      borderRadius: sw(8),
      paddingHorizontal: sw(12),
      paddingVertical: sh(7),
    },
    orgDeletePillText: {
      fontSize: sf(12.5),
      fontWeight: '700',
      color: '#DC2626',
    },
    orgConfirmBox: {
      marginTop: sh(12),
      paddingTop: sh(10),
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    orgConfirmText: {
      fontSize: sf(13),
      fontWeight: '600',
      color: C.textPrimary,
      marginBottom: sh(8),
    },
    orgConfirmActions: {
      flexDirection: 'row',
      gap: sw(10),
    },
    orgConfirmYesBtn: {
      backgroundColor: '#DC2626',
      borderRadius: sw(8),
      paddingHorizontal: sw(14),
      paddingVertical: sh(8),
    },
    orgConfirmYesText: {
      color: '#FFFFFF',
      fontSize: sf(12.5),
      fontWeight: '700',
    },
    orgConfirmCancelBtn: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(8),
      paddingHorizontal: sw(14),
      paddingVertical: sh(8),
    },
    orgConfirmCancelText: {
      color: C.textSecondary,
      fontSize: sf(12.5),
      fontWeight: '700',
    },
    subHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(10),
      paddingVertical: sh(8),
    },
    backChevron: {
      fontSize: sf(28),
      fontWeight: '700',
      color: C.textPrimary,
      lineHeight: sh(30),
    },
    subHeaderTitle: {
      fontSize: sf(19),
      fontWeight: '800',
      color: C.textPrimary,
    },
    subHeaderSub: {
      fontSize: sf(13),
      color: C.textMuted,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: sw(8),
      marginTop: sh(6),
    },
    chip: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(8),
      paddingHorizontal: sw(12),
      paddingVertical: sh(8),
      backgroundColor: C.cardBg,
    },
    activeChip: {
      backgroundColor: BLUE_PRIMARY,
      borderColor: BLUE_PRIMARY,
    },
    chipText: {
      fontSize: sf(13),
      fontWeight: '600',
      color: C.textSecondary,
    },
    activeChipText: {
      color: '#FFFFFF',
    },
    fwRow: {
      flexDirection: 'row',
      gap: sw(10),
      marginTop: sh(6),
    },
    fwBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(8),
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      paddingVertical: sh(12),
      paddingHorizontal: sw(12),
      backgroundColor: C.cardBg,
    },
    fwBoxActive: {
      borderColor: BLUE_PRIMARY,
      backgroundColor: C.circleTint,
    },
    sqCheck: {
      width: sw(16),
      height: sw(16),
      borderRadius: sw(3),
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
      fontSize: sf(13),
      fontWeight: '700',
      color: C.textSecondary,
    },
    fwBoxTextActive: {
      color: C.linkBlue,
    },
    toastBox: {
      backgroundColor: C.circleTint,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      paddingVertical: sh(8),
      paddingHorizontal: sw(16),
    },
    toastText: {
      fontSize: sf(13),
      fontWeight: '700',
      color: C.linkBlue,
    },
    homeTopBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: sh(10),
    },
    homeOrgName: {
      fontSize: sf(15),
      fontWeight: '800',
      color: C.textPrimary,
    },
    homeOrgSub: {
      fontSize: sf(12),
      color: C.textMuted,
    },
    bellBtn: {
      padding: sw(6),
      position: 'relative',
    },
    bellGlyph: {
      fontSize: sf(19),
    },
    bellDot: {
      position: 'absolute',
      top: sh(6),
      right: sw(6),
      width: sw(7),
      height: sw(7),
      borderRadius: sw(4),
      backgroundColor: '#EF4444',
    },
    overviewHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: sh(8),
    },
    overviewHeading: {
      fontSize: sf(20),
      fontWeight: '800',
      color: C.textPrimary,
    },
    dateLabel: {
      fontSize: sf(12.5),
      color: C.textMuted,
    },
    blueHeroCard: {
      backgroundColor: BLUE_PRIMARY,
      borderRadius: sw(14),
      padding: sw(16),
      marginBottom: sh(12),
    },
    blueHeroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    blueHeroLabel: {
      fontSize: sf(14.5),
      fontWeight: '700',
      color: '#FFFFFF',
    },
    blueHeroChevron: {
      fontSize: sf(26),
      fontWeight: '800',
      color: '#FFFFFF',
      paddingHorizontal: sw(4),
    },
    blueHeroPercent: {
      fontSize: sf(30),
      fontWeight: '800',
      color: '#FFFFFF',
      marginTop: sh(6),
    },
    blueProgressTrack: {
      height: sh(6),
      backgroundColor: 'rgba(255,255,255,0.28)',
      borderRadius: 999,
      marginTop: sh(10),
      overflow: 'hidden',
    },
    blueProgressFill: {
      height: sh(6),
      backgroundColor: '#FFFFFF',
      borderRadius: 999,
    },
    blueHeroCaption: {
      fontSize: sf(12.5),
      color: '#DBEAFE',
      marginTop: sh(8),
    },
    stats3Row: {
      flexDirection: 'row',
      gap: sw(8),
      marginBottom: sh(16),
    },
    statTile3: {
      flex: 1,
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      paddingVertical: sh(13),
      paddingHorizontal: sw(10),
    },
    statNumBlue: {
      fontSize: sf(20),
      fontWeight: '800',
      color: C.linkBlue,
    },
    statLabel: {
      fontSize: sf(12),
      color: C.textMuted,
      marginTop: sh(3),
    },
    overviewSectionBlock: {
      marginBottom: sh(16),
    },
    overviewSubHeading: {
      fontSize: sf(15.5),
      fontWeight: '800',
      color: C.textPrimary,
    },
    frameworksGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: sw(10),
      marginTop: sh(10),
    },
    frameworkCard: {
      width: '48%',
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(12),
    },
    frameworkTitle: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    frameworkBottomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: sh(10),
    },
    frameworkSub: {
      fontSize: sf(12),
      color: C.textMuted,
    },
    frameworkPct: {
      fontSize: sf(14.5),
      fontWeight: '800',
      color: C.linkBlue,
    },
    attentionListCard: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      marginTop: sh(10),
      overflow: 'hidden',
    },
    attentionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: sh(12),
      paddingHorizontal: sw(12),
      gap: sw(10),
    },
    attentionRowBorder: {
      borderTopWidth: 1,
      borderTopColor: C.rowDivider,
    },
    attentionIcon: {
      fontSize: sf(15),
    },
    attentionTitle: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    attentionMeta: {
      fontSize: sf(12),
      color: C.textMuted,
      marginTop: sh(2),
    },
    emptyShieldCard: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(14),
      paddingVertical: sh(24),
      paddingHorizontal: sw(16),
      alignItems: 'center',
    },
    emptyBoldTitle: {
      fontSize: sf(16),
      fontWeight: '800',
      color: C.textPrimary,
      textAlign: 'center',
    },
    emptySubText: {
      fontSize: sf(13),
      color: C.textMuted,
      textAlign: 'center',
      marginTop: sh(5),
      lineHeight: sh(20),
    },
    listCard: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(16),
      gap: sh(10),
      marginBottom: sh(12),
    },
    listCardTitle: {
      fontSize: sf(16),
      fontWeight: '800',
      color: C.textPrimary,
    },
    listCardSub: {
      fontSize: sf(13.5),
      color: C.textSecondary,
    },
    listCardMeta: {
      fontSize: sf(12.5),
      color: C.textMuted,
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
      borderColor: C.border,
      borderRadius: sw(10),
      paddingHorizontal: sw(12),
      backgroundColor: C.cardBg,
      marginTop: sh(8),
      marginBottom: sh(12),
    },
    searchIcon: {
      fontSize: sf(14),
      marginRight: sw(8),
    },
    searchTextInput: {
      flex: 1,
      paddingVertical: sh(10),
      fontSize: sf(14),
      color: C.textPrimary,
    },
    filterRow: {
      gap: sw(8),
      marginBottom: sh(10),
    },
    filterPill: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(8),
      paddingHorizontal: sw(12),
      paddingVertical: sh(7),
      backgroundColor: C.cardBg,
    },
    activeFilterPill: {
      backgroundColor: BLUE_PRIMARY,
      borderColor: BLUE_PRIMARY,
    },
    filterPillText: {
      fontSize: sf(12.5),
      fontWeight: '600',
      color: C.textSecondary,
    },
    activeFilterPillText: {
      color: '#FFFFFF',
    },
    countMetaLine: {
      fontSize: sf(12.5),
      color: C.textMuted,
      marginBottom: sh(10),
    },
    formCard: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(14),
      backgroundColor: C.subtleBg,
      marginBottom: sh(14),
    },
    twoBtnRow: {
      flexDirection: 'row',
      gap: sw(10),
      marginTop: sh(14),
    },
    cancelHalfBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      paddingVertical: sh(11),
      alignItems: 'center',
      backgroundColor: C.cardBg,
    },
    cancelHalfText: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textSecondary,
    },
    saveHalfBtn: {
      flex: 1,
      backgroundColor: BLUE_PRIMARY,
      borderRadius: sw(10),
      paddingVertical: sh(11),
      alignItems: 'center',
    },
    saveHalfText: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: '#FFFFFF',
    },
    loaderBox: {
      paddingVertical: sh(32),
      alignItems: 'center',
      gap: sh(8),
    },
    controlCard: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(14),
      backgroundColor: C.cardBg,
      marginBottom: sh(12),
    },
    controlTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    codeLabel: {
      fontSize: sf(12),
      fontWeight: '700',
      color: C.textMuted,
    },
    dotsMore: {
      fontSize: sf(14),
      fontWeight: '800',
      color: C.textMuted,
    },
    controlTitle: {
      fontSize: sf(15.5),
      fontWeight: '700',
      color: C.textPrimary,
      marginTop: sh(4),
    },
    controlBottomMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: sh(8),
    },
    fwLabel: {
      fontSize: sf(12),
      color: C.textMuted,
      fontWeight: '600',
    },
    statusTagBadge: {
      paddingHorizontal: sw(8),
      paddingVertical: sh(2),
      borderRadius: sw(6),
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
      fontSize: sf(11.5),
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
      gap: sw(6),
      marginTop: sh(10),
      flexWrap: 'wrap',
    },
    miniStatusChip: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(7),
      paddingHorizontal: sw(8),
      paddingVertical: sh(4),
      backgroundColor: C.subtleBg,
    },
    miniStatusActive: {
      backgroundColor: C.circleTint,
      borderColor: BLUE_PRIMARY,
    },
    miniStatusText: {
      fontSize: sf(11.5),
      fontWeight: '600',
      color: C.textSecondary,
    },
    miniStatusTextActive: {
      color: C.linkBlue,
      fontWeight: '700',
    },
    evidenceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: sh(10),
      paddingTop: sh(8),
      borderTopWidth: 1,
      borderTopColor: C.rowDivider,
      gap: sw(8),
    },
    evidenceText: {
      flex: 1,
      fontSize: sf(12),
      color: C.textMuted,
    },
    noteEditBox: {
      marginTop: sh(8),
    },
    deleteBar: {
      marginTop: sh(8),
      paddingTop: sh(6),
      borderTopWidth: 1,
      borderTopColor: C.rowDivider,
    },
    confirmDelRow: {
      flexDirection: 'row',
      gap: sw(12),
      alignItems: 'center',
    },
    dangerLink: {
      fontSize: sf(12),
      fontWeight: '700',
      color: '#DC2626',
    },
    detailCard: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(16),
      backgroundColor: C.cardBg,
    },
    detailTopMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    amberBadge: {
      backgroundColor: '#FEF3C7',
      paddingHorizontal: sw(8),
      paddingVertical: sh(3),
      borderRadius: sw(6),
    },
    amberBadgeText: {
      fontSize: sf(12),
      fontWeight: '700',
      color: '#D97706',
    },
    detailTitle: {
      fontSize: sf(20),
      fontWeight: '800',
      color: C.textPrimary,
      marginTop: sh(8),
    },
    detailSub: {
      fontSize: sf(12.5),
      color: C.textMuted,
      marginTop: sh(3),
    },
    detailSectionTitle: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
      marginTop: sh(16),
      marginBottom: sh(4),
    },
    detailBody: {
      fontSize: sf(13.5),
      color: C.textSecondary,
      lineHeight: sh(21),
    },
    detailMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: sh(10),
      borderBottomWidth: 1,
      borderBottomColor: C.rowDivider,
    },
    detailMetaVal: {
      fontSize: sf(12.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    pageTitleLarge: {
      fontSize: sf(22),
      fontWeight: '800',
      color: C.textPrimary,
      marginTop: sh(4),
    },
    pageSubMuted: {
      fontSize: sf(13),
      color: C.textMuted,
      marginTop: sh(2),
      marginBottom: sh(14),
    },
    profileCenterBlock: {
      alignItems: 'center',
      paddingVertical: sh(14),
    },
    avatarRing: {
      width: sw(82),
      height: sw(82),
      borderRadius: sw(41),
      borderWidth: 2,
      borderColor: C.border,
      backgroundColor: C.circleTint,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarFallbackText: {
      fontSize: sf(24),
      fontWeight: '800',
      color: C.linkBlue,
    },
    profileNameText: {
      fontSize: sf(18),
      fontWeight: '800',
      color: C.textPrimary,
      marginTop: sh(10),
    },
    profileEmailText: {
      fontSize: sf(13),
      color: C.textMuted,
      marginTop: sh(2),
    },
    orgSummaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: sw(12),
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(12),
      backgroundColor: C.cardBg,
      marginBottom: sh(16),
    },
    orgIconBox: {
      width: sw(36),
      height: sw(36),
      borderRadius: sw(8),
      backgroundColor: C.subtleBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orgIconGlyph: {
      fontSize: sf(16),
    },
    orgCardTitle: {
      fontSize: sf(14),
      fontWeight: '700',
      color: C.textPrimary,
    },
    orgCardSub: {
      fontSize: sf(12),
      color: C.textMuted,
    },
    sectionCaps: {
      fontSize: sf(11.5),
      fontWeight: '700',
      color: C.textMuted,
      letterSpacing: 0.7,
      marginTop: sh(10),
      marginBottom: sh(6),
    },
    menuGroupCard: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      backgroundColor: C.cardBg,
      marginBottom: sh(12),
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: sh(13.5),
      paddingHorizontal: sw(14),
      gap: sw(10),
    },
    menuLeftIcon: {
      fontSize: sf(15),
      color: C.textSecondary,
      width: sw(20),
      textAlign: 'center',
    },
    menuRowLabel: {
      flex: 1,
      fontSize: sf(13.5),
      fontWeight: '600',
      color: C.textPrimary,
    },
    menuRowSub: {
      fontSize: sf(12),
      color: C.textMuted,
      marginTop: sh(1),
    },
    menuRightValue: {
      fontSize: sf(12.5),
      color: C.linkBlue,
      fontWeight: '700',
    },
    menuChevron: {
      fontSize: sf(18),
      color: '#94A3B8',
    },
    rowDivider: {
      height: 1,
      backgroundColor: C.rowDivider,
      marginLeft: sw(44),
    },
    countCircleBadge: {
      backgroundColor: C.circleTint,
      borderRadius: 999,
      minWidth: sw(20),
      height: sh(20),
      paddingHorizontal: sw(6),
      alignItems: 'center',
      justifyContent: 'center',
    },
    countCircleText: {
      fontSize: sf(11.5),
      fontWeight: '800',
      color: C.linkBlue,
    },
    logoutIconRed: {
      fontSize: sf(15),
      color: '#EF4444',
      width: sw(20),
      textAlign: 'center',
      fontWeight: '700',
    },
    logoutLabelRed: {
      flex: 1,
      fontSize: sf(13.5),
      fontWeight: '700',
      color: '#EF4444',
    },
    logoutCardBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      paddingVertical: sh(13.5),
      paddingHorizontal: sw(14),
      backgroundColor: C.cardBg,
      marginTop: sh(6),
      gap: sw(10),
    },
    footerTagline: {
      textAlign: 'center',
      fontSize: sf(12),
      color: '#94A3B8',
      marginTop: sh(16),
      marginBottom: sh(8),
    },
    notifTopHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: sh(10),
    },
    notifSubCount: {
      fontSize: sf(12),
      color: C.textMuted,
    },
    markAllLink: {
      fontSize: sf(12.5),
      fontWeight: '700',
      color: C.linkBlue,
    },
    notifFilterRow: {
      flexDirection: 'row',
      gap: sw(8),
      marginBottom: sh(10),
    },
    notifChip: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(8),
      paddingHorizontal: sw(12),
      paddingVertical: sh(6),
      backgroundColor: C.cardBg,
    },
    notifChipActive: {
      backgroundColor: BLUE_PRIMARY,
      borderColor: BLUE_PRIMARY,
    },
    notifChipText: {
      fontSize: sf(12.5),
      fontWeight: '600',
      color: C.textSecondary,
    },
    notifChipTextActive: {
      color: '#FFFFFF',
    },
    notifCard: {
      flexDirection: 'row',
      gap: sw(10),
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(12),
      padding: sw(12),
      backgroundColor: C.cardBg,
      marginBottom: sh(10),
    },
    notifCardUnread: {
      backgroundColor: C.subtleBg,
      borderColor: '#3B82F6',
    },
    notifGlyph: {
      fontSize: sf(15),
      marginTop: sh(2),
    },
    notifTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    notifTitle: {
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    unreadDot: {
      width: sw(7),
      height: sw(7),
      borderRadius: sw(4),
      backgroundColor: BLUE_PRIMARY,
    },
    notifBody: {
      fontSize: sf(12.5),
      color: C.textMuted,
      marginTop: sh(2),
      lineHeight: sh(19),
    },
    notifTime: {
      fontSize: sf(11),
      color: '#94A3B8',
      marginTop: sh(4),
    },
    supportHeroBox: {
      alignItems: 'center',
      paddingVertical: sh(16),
    },
    supportCircle: {
      width: sw(84),
      height: sw(84),
      borderRadius: sw(42),
      backgroundColor: C.circleTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: sh(10),
    },
    supportHeadset: {
      fontSize: sf(26),
    },
    supportTitle: {
      fontSize: sf(20),
      fontWeight: '800',
      color: C.textPrimary,
    },
    supportSub: {
      fontSize: sf(13),
      color: C.textMuted,
      marginTop: sh(3),
    },
    faqHeading: {
      fontSize: sf(14.5),
      fontWeight: '800',
      color: C.textPrimary,
      marginTop: sh(10),
      marginBottom: sh(8),
    },
    faqCard: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: sw(10),
      padding: sw(12),
      backgroundColor: C.cardBg,
      marginBottom: sh(10),
    },
    faqQuestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    faqQuestion: {
      flex: 1,
      fontSize: sf(13.5),
      fontWeight: '700',
      color: C.textPrimary,
    },
    faqChevron: {
      fontSize: sf(14),
      color: C.textMuted,
      marginLeft: sw(8),
    },
    faqAnswer: {
      fontSize: sf(12.5),
      color: C.textMuted,
      marginTop: sh(8),
      lineHeight: sh(19),
    },
    bottomNav: {
      flexDirection: 'row',
      backgroundColor: C.cardBg,
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingVertical: sh(7),
    },
    navTabBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: sh(4),
    },
    navIcon: {
      fontSize: sf(16),
      color: C.textMuted,
    },
    navLabel: {
      fontSize: sf(11.5),
      fontWeight: '600',
      color: C.textMuted,
      marginTop: sh(2),
    },
    navActiveColor: {
      color: C.linkBlue,
      fontWeight: '700',
    },
  });
}