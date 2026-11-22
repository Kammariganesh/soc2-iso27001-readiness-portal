'use client';
import { useState, useEffect } from 'react';

const API_BASE = 'https://soc2-iso27001-readiness-portal.onrender.com/api';

const DEFAULT_ORGANIZATIONS = [
  {
    id: 'ORG-101',
    name: 'FinScale Cloud Inc',
    email: 'security@finscale.io',
    framework: 'SOC 2',
    cloud: 'AWS',
    status: 'Active',
  },
  {
    id: 'ORG-102',
    name: 'DataPulse Systems',
    email: 'grc@datapulse.dev',
    framework: 'ISO 27001',
    cloud: 'Azure',
    status: 'In Review',
  },
];

const DEFAULT_TEAM_MEMBERS = [
  { _id: 'm1', orgId: 'ORG-101', name: 'Admin Lead', email: 'admin@complianceguard.io', role: 'Super Admin', status: 'Active' },
  { _id: 'm2', orgId: 'ORG-101', name: 'Security Auditor', email: 'auditor@complianceguard.io', role: 'Auditor', status: 'Active' },
  { _id: 'm3', orgId: 'ORG-101', name: 'Compliance Analyst', email: 'analyst@complianceguard.io', role: 'Editor', status: 'Active' },
  { _id: 'm4', orgId: 'ORG-102', name: 'DataPulse Admin', email: 'admin@datapulse.dev', role: 'Super Admin', status: 'Active' },
  { _id: 'm5', orgId: 'ORG-102', name: 'ISO Auditor', email: 'auditor@datapulse.dev', role: 'Auditor', status: 'Active' },
];

const createStarterControls = (orgId, framework = 'SOC 2') => [
  {
    _id: `${orgId}-c1`,
    orgId,
    id: 'c1',
    name: 'Access Control & MFA',
    framework,
    status: 'Compliant',
    evidence: 'MFA enforced across SSO and cloud root/IAM accounts',
    updatedBy: 'Super Admin',
  },
  {
    _id: `${orgId}-c2`,
    orgId,
    id: 'c2',
    name: 'Database Access & Encryption',
    framework,
    status: 'In Progress',
    evidence: 'AES-256 encryption enabled at rest; TLS 1.3 pending audit sign-off',
    updatedBy: 'Super Admin',
  },
  {
    _id: `${orgId}-c3`,
    orgId,
    id: 'c3',
    name: 'Network Firewall & Segmentation',
    framework,
    status: 'Non-Compliant',
    evidence: 'Staging VPC security group port rules under review',
    updatedBy: 'Super Admin',
  },
  {
    _id: `${orgId}-c4`,
    orgId,
    id: 'c4',
    name: 'System Logging & Monitoring',
    framework,
    status: 'Compliant',
    evidence: 'Centralized audit logs retained for 90+ days with alerting',
    updatedBy: 'Super Admin',
  },
];

export default function Home() {
  const [view, setView] = useState('landing');
  const [activeTab, setActiveTab] = useState('SOC 2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active RBAC Role: 'Super Admin' | 'Editor' | 'Auditor'
  const [currentRole, setCurrentRole] = useState('Super Admin');
  const canManageAdmin = currentRole === 'Super Admin';
  const canEditControls = currentRole === 'Super Admin' || currentRole === 'Editor';
  const canDeleteControls = currentRole === 'Super Admin';

  // 2-Step Onboarding State (P2 UI Improvement)
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('SOC 2');
  const [companySize, setCompanySize] = useState('1-50 Employees');
  const [cloudProvider, setCloudProvider] = useState('AWS');
  const [targetTimeline, setTargetTimeline] = useState('Within 3 Months');

  const [organizations, setOrganizations] = useState(DEFAULT_ORGANIZATIONS);
  const [selectedOrgId, setSelectedOrgId] = useState('ORG-101');
  const [orgSearch, setOrgSearch] = useState('');
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM_MEMBERS);
  const [controls, setControls] = useState(() => [
    ...createStarterControls('ORG-101', 'SOC 2'),
    ...createStarterControls('ORG-102', 'ISO 27001'),
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Editor');

  const [openFaq, setOpenFaq] = useState(0);
  const [faqSearch, setFaqSearch] = useState('');

  // Controls Dashboard Filters, Search, Modal & Action Menu
  const [filter, setFilter] = useState('All');
  const [controlSearch, setControlSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newStatus, setNewStatus] = useState('In Progress');
  const [newEvidence, setNewEvidence] = useState('');

  // Inline Evidence Editor State
  const [editingEvidenceId, setEditingEvidenceId] = useState(null);
  const [evidenceDraft, setEvidenceDraft] = useState('');

  useEffect(() => {
    async function loadPortalData() {
      try {
        const [orgsRes, membersRes, controlsRes] = await Promise.all([
          fetch(`${API_BASE}/organizations`),
          fetch(`${API_BASE}/members`),
          fetch(`${API_BASE}/controls`),
        ]);

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          if (Array.isArray(orgsData) && orgsData.length > 0) {
            setOrganizations(orgsData);
            setSelectedOrgId((prev) =>
              orgsData.some((o) => o.id === prev) ? prev : orgsData[0].id
            );
          }
        }

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          if (Array.isArray(membersData) && membersData.length > 0) {
            setTeamMembers(membersData);
          }
        }

        if (controlsRes.ok) {
          const controlsData = await controlsRes.json();
          if (Array.isArray(controlsData) && controlsData.length > 0) {
            setControls(
              controlsData.map((c) => ({
                ...c,
                orgId: c.orgId || 'ORG-101',
                evidence: c.evidence || '',
                updatedBy: c.updatedBy || 'Super Admin',
              }))
            );
          }
        }
      } catch (err) {
        console.log('Using local fallback until backend deploys:', err);
      }
    }

    loadPortalData();
  }, []);

  const handleNextOnboardingStep = (e) => {
    e.preventDefault();
    if (!companyName.trim() || !workEmail.trim()) return;
    setOnboardingStep(2);
  };

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    if (!companyName || !workEmail || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName.trim(),
          email: workEmail.trim(),
          framework: selectedFramework,
          cloud: cloudProvider,
          companySize,
          targetTimeline,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.organization) {
          setOrganizations((prev) => [data.organization, ...prev]);
          setSelectedOrgId(data.organization.id);
          if (Array.isArray(data.controls)) {
            setControls((prev) => [...data.controls, ...prev]);
          }
          if (data.member) {
            setTeamMembers((prev) => [...prev, data.member]);
          }
          setCurrentRole('Super Admin');
          setNewFramework(selectedFramework);
          setOnboardingStep(1);
          setView('dashboard');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      console.log('Falling back to local state creation:', err);
    }

    const nextNum = 101 + organizations.length;
    const newOrgId = `ORG-${nextNum}`;
    const newOrg = {
      id: newOrgId,
      name: companyName.trim(),
      email: workEmail.trim(),
      framework: selectedFramework,
      cloud: cloudProvider,
      status: 'Active',
    };

    setOrganizations((prev) => [newOrg, ...prev]);
    setSelectedOrgId(newOrgId);
    setControls((prev) => [...createStarterControls(newOrgId, selectedFramework), ...prev]);
    setTeamMembers((prev) => [
      ...prev,
      {
        _id: `local-m-${Date.now()}`,
        orgId: newOrgId,
        name: `${companyName.trim()} Lead`,
        email: workEmail.trim(),
        role: 'Super Admin',
        status: 'Active',
      },
    ]);

    setCurrentRole('Super Admin');
    setNewFramework(selectedFramework);
    setOnboardingStep(1);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsSubmitting(false);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!canManageAdmin || !newMemberName || !newMemberEmail || !selectedOrgId) return;

    const payload = {
      orgId: selectedOrgId,
      name: newMemberName.trim(),
      email: newMemberEmail.trim(),
      role: newMemberRole,
      status: 'Active',
    };

    try {
      const response = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const savedMember = await response.json();
        setTeamMembers((prev) => [...prev, savedMember]);
        setNewMemberName('');
        setNewMemberEmail('');
        return;
      }
    } catch {}

    setTeamMembers((prev) => [...prev, { ...payload, _id: `local-m-${Date.now()}` }]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleToggleMemberStatus = async (member) => {
    if (!canManageAdmin) return;
    const memberKey = member._id || member.id;
    const nextStatus = member.status === 'Active' ? 'Suspended' : 'Active';

    setTeamMembers((prev) =>
      prev.map((m) => ((m._id || m.id) === memberKey ? { ...m, status: nextStatus } : m))
    );

    if (member._id && !String(member._id).startsWith('local-') && String(member._id).length > 5) {
      try {
        await fetch(`${API_BASE}/members/${member._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus }),
        });
      } catch {}
    }
  };

  const handleDeleteMember = async (member) => {
    if (!canManageAdmin) return;
    const memberKey = member._id || member.id;
    setTeamMembers((prev) => prev.filter((m) => (m._id || m.id) !== memberKey));

    if (member._id && !String(member._id).startsWith('local-') && String(member._id).length > 5) {
      try {
        await fetch(`${API_BASE}/members/${member._id}`, { method: 'DELETE' });
      } catch {}
    }
  };

  const handleToggleOrgStatus = async (e, org) => {
    e.stopPropagation();
    if (!canManageAdmin) return;
    const nextStatus = org.status === 'Active' ? 'In Review' : 'Active';

    setOrganizations((prev) =>
      prev.map((o) => (o.id === org.id ? { ...o, status: nextStatus } : o))
    );

    try {
      await fetch(`${API_BASE}/organizations/${org.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {}
  };

  const handleAddControl = async (e) => {
    e.preventDefault();
    if (!canEditControls || !newId || !newName) return;
    const activeOrgId = selectedOrg?.id || 'ORG-101';
    const newControl = {
      orgId: activeOrgId,
      id: newId.trim(),
      name: newName.trim(),
      framework: newFramework,
      status: newStatus,
      evidence: newEvidence.trim() || 'Initial control baseline created',
      updatedBy: currentRole,
    };

    try {
      const response = await fetch(`${API_BASE}/controls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newControl),
      });
      const savedControl = await response.json();
      if (savedControl && savedControl._id) {
        setControls((prev) => [...prev, { ...savedControl, orgId: activeOrgId }]);
      } else {
        setControls((prev) => [
          ...prev,
          { ...newControl, _id: `${activeOrgId}-${Date.now()}`, updatedAt: new Date().toISOString() },
        ]);
      }
    } catch {
      setControls((prev) => [
        ...prev,
        { ...newControl, _id: `${activeOrgId}-${Date.now()}`, updatedAt: new Date().toISOString() },
      ]);
    }

    setNewId('');
    setNewName('');
    setNewEvidence('');
    setIsAddModalOpen(false);
  };

  const handleStatusChange = async (mongoId, updatedStatus) => {
    if (!canEditControls) return;
    const nowIso = new Date().toISOString();

    setControls((prev) =>
      prev.map((c) =>
        c._id === mongoId
          ? { ...c, status: updatedStatus, updatedBy: currentRole, updatedAt: nowIso }
          : c
      )
    );

    if (String(mongoId).startsWith('ORG-')) return;

    try {
      const response = await fetch(`${API_BASE}/controls/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updatedStatus, updatedBy: currentRole }),
      });
      const updatedControl = await response.json();
      if (updatedControl && updatedControl._id) {
        setControls((prev) =>
          prev.map((c) => (c._id === mongoId ? { ...updatedControl, orgId: c.orgId } : c))
        );
      }
    } catch (err) {
      console.log('Error updating status:', err);
    }
  };

  const handleSaveEvidence = async (mongoId) => {
    if (!canEditControls) return;
    const trimmed = evidenceDraft.trim();
    const nowIso = new Date().toISOString();

    setControls((prev) =>
      prev.map((c) =>
        c._id === mongoId
          ? { ...c, evidence: trimmed, updatedBy: currentRole, updatedAt: nowIso }
          : c
      )
    );
    setEditingEvidenceId(null);

    if (String(mongoId).startsWith('ORG-')) return;

    try {
      const response = await fetch(`${API_BASE}/controls/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence: trimmed, updatedBy: currentRole }),
      });
      const updatedControl = await response.json();
      if (updatedControl && updatedControl._id) {
        setControls((prev) =>
          prev.map((c) => (c._id === mongoId ? { ...updatedControl, orgId: c.orgId } : c))
        );
      }
    } catch (err) {
      console.log('Error updating evidence:', err);
    }
  };

  const handleDelete = async (item) => {
    if (!canDeleteControls) return;
    const confirmed = window.confirm(
      `Delete control "${item.id} - ${item.name}"? This action cannot be undone.`
    );
    if (!confirmed) {
      setOpenMenuId(null);
      return;
    }

    const mongoId = item._id;
    setOpenMenuId(null);
    setControls((prev) => prev.filter((c) => c._id !== mongoId));

    if (String(mongoId).startsWith('ORG-')) return;

    try {
      await fetch(`${API_BASE}/controls/${mongoId}`, { method: 'DELETE' });
    } catch (err) {
      console.log('Error deleting control:', err);
    }
  };

  const selectedOrg =
    organizations.find((o) => o.id === selectedOrgId) || organizations[0] || null;

  const safeControls = Array.isArray(controls) ? controls : [];
  const orgControls = selectedOrg
    ? safeControls.filter((c) => c.orgId === selectedOrg.id)
    : safeControls;

  const totalCount = orgControls.length;
  const compliantCount = orgControls.filter((c) => c.status === 'Compliant').length;
  const inProgressCount = orgControls.filter((c) => c.status === 'In Progress').length;
  const nonCompliantCount = orgControls.filter((c) => c.status === 'Non-Compliant').length;
  const orgReadinessScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

  const filteredControls = orgControls.filter((c) => {
    const matchesStatus = filter === 'All' || c.status === filter;
    const query = controlSearch.trim().toLowerCase();
    const matchesQuery =
      !query ||
      String(c.id).toLowerCase().includes(query) ||
      String(c.name).toLowerCase().includes(query) ||
      String(c.evidence || '').toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const filteredOrganizations = organizations.filter((org) => {
    const query = orgSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      String(org.name).toLowerCase().includes(query) ||
      String(org.id).toLowerCase().includes(query)
    );
  });

  const orgTeamMembers = selectedOrg
    ? teamMembers.filter((m) => m.orgId === selectedOrg.id)
    : teamMembers;

  const handleExportAuditReport = () => {
    if (!selectedOrg) return;

    const lines = [
      ['ComplianceGuard Audit Readiness Report'],
      ['Generated By Role', currentRole],
      ['Generated At', new Date().toLocaleString()],
      ['Organization', selectedOrg.name],
      ['Workspace ID', selectedOrg.id],
      ['Primary Contact', selectedOrg.email],
      ['Framework', selectedOrg.framework],
      ['Cloud Provider', selectedOrg.cloud],
      ['Workspace Status', selectedOrg.status],
      ['Readiness Score', `${orgReadinessScore}%`],
      ['Total Controls', totalCount],
      ['Compliant', compliantCount],
      ['In Progress', inProgressCount],
      ['Non-Compliant', nonCompliantCount],
      [],
      ['CONTROL ID', 'CONTROL NAME', 'FRAMEWORK', 'STATUS', 'AUDIT EVIDENCE / PROOF NOTE', 'LAST UPDATED BY'],
      ...orgControls.map((c) => [
        c.id,
        `"${String(c.name).replace(/"/g, '""')}"`,
        c.framework,
        c.status,
        `"${String(c.evidence || 'No evidence attached').replace(/"/g, '""')}"`,
        c.updatedBy || 'Super Admin',
      ]),
      [],
      ['TEAM MEMBER', 'EMAIL', 'ROLE', 'STATUS'],
      ...orgTeamMembers.map((m) => [`"${String(m.name).replace(/"/g, '""')}"`, m.email, m.role, m.status]),
    ];

    const csvContent = lines.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedOrg.name.replace(/\s+/g, '_')}_Audit_Readiness_Report.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const RoleSwitcher = () => (
    <div className="inline-flex items-center gap-2 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-lg">
      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
        Role:
      </span>
      <select
        value={currentRole}
        onChange={(e) => setCurrentRole(e.target.value)}
        className="bg-transparent text-xs font-semibold text-cyan-300 outline-none cursor-pointer"
      >
        <option value="Super Admin" className="bg-gray-900 text-white">Super Admin (Full Access)</option>
        <option value="Editor" className="bg-gray-900 text-white">Editor (Edit Controls)</option>
        <option value="Auditor" className="bg-gray-900 text-white">Auditor (Read-Only)</option>
      </select>
    </div>
  );

  const frameworkDetails = {
    'SOC 2': {
      badge: 'AICPA TRUST SERVICES CRITERIA • 4 STARTER CONTROLS',
      title: 'SOC 2 Type I & Type II Readiness',
      subtitle: 'Map access, encryption, network security, and monitoring controls to prove trust to enterprise customers.',
      checklist: [
        { code: 'CC1.1', item: 'Control Environment & Security Governance Policy', status: 'Ready', icon: '✓' },
        { code: 'CC6.1', item: 'Logical Access, RBAC & Multi-Factor Authentication', status: 'Monitored', icon: '●' },
        { code: 'CC7.2', item: 'System Monitoring, Alerting & Incident Response', status: 'Active', icon: '⚡' },
        { code: 'CC8.1', item: 'Change Management & Code Review Controls', status: 'Ready', icon: '✓' },
      ],
    },
    'ISO 27001': {
      badge: 'ISO/IEC 27001:2022 ISMS • 4 STARTER CONTROLS',
      title: 'ISO 27001 Information Security Management',
      subtitle: 'Structure your ISMS and Annex A security controls for global enterprise and international compliance.',
      checklist: [
        { code: 'A.5.1', item: 'Policies for Information Security Governance', status: 'Ready', icon: '✓' },
        { code: 'A.5.15', item: 'Access Control & Least-Privilege Provisioning', status: 'Monitored', icon: '●' },
        { code: 'A.8.15', item: 'Audit Logging, Event Trails & Retention', status: 'Active', icon: '⚡' },
        { code: 'A.8.24', item: 'Cryptography & Data Protection Controls', status: 'Ready', icon: '✓' },
      ],
    },
  };

  const currentTabData = frameworkDetails[activeTab];

  const faqs = [
    {
      category: 'Automation',
      q: 'How does ComplianceGuard speed up SOC 2 and ISO 27001 readiness?',
      a: 'It centralizes your compliance controls in MongoDB, seeds core starter controls automatically, tracks audit evidence notes, and lets teams update statuses in real time.',
    },
    {
      category: 'Access Control',
      q: 'How does Role-Based Access Control (RBAC) work inside the portal?',
      a: 'Super Admins have full workspace, team, and control management rights; Editors can add controls and update statuses/evidence; Auditors operate in read-only mode with CSV audit report export.',
    },
    {
      category: 'Administration',
      q: 'What can administrators manage inside the Admin Panel?',
      a: 'Admins can switch between onboarded organizations, toggle workspace status, manage team members and roles, and export audit readiness reports with evidence notes.',
    },
  ];

  const filteredFaqs = faqs.filter((item) => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.q.toLowerCase().includes(q) ||
      item.a.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-600 selection:text-white">
        <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold px-3 py-1.5 rounded-lg text-sm">
                CG
              </div>
              <span className="font-semibold text-xl tracking-tight">
                Compliance<span className="text-blue-400">Guard</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
              <a href="#workflow" className="hover:text-white transition">How It Works</a>
              <a href="#frameworks" className="hover:text-white transition">Frameworks</a>
              <a href="#onboarding" className="hover:text-white transition">Onboarding</a>
              <a href="#faq" className="hover:text-white transition">FAQ</a>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setView('admin')}
                className="text-xs text-gray-400 hover:text-cyan-300 transition"
                title="Admin Workspace"
              >
                Admin
              </button>
              <button
                onClick={() => setView('dashboard')}
                className="text-sm text-gray-300 hover:text-white transition"
              >
                Open Portal
              </button>
              <a
                href="#onboarding"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Get Started
              </a>
            </div>
          </div>
        </nav>

        <section className="max-w-7xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-12 gap-12 items-center border-b border-gray-800/80">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-blue-950/80 border border-blue-700/40 text-blue-300 text-xs font-medium px-3.5 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              CONTINUOUS COMPLIANCE & AUDIT READINESS
            </div>

            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-tight text-white">
              Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-bold">SOC 2 & ISO 27001</span> Ready Without the Chaos.
            </h1>

            <p className="text-gray-300 text-lg mt-5 leading-relaxed max-w-2xl">
              Manage security requirements, track compliance progress, and prepare for audits in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#onboarding"
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-xl transition shadow-lg shadow-blue-600/20"
              >
                Start Onboarding →
              </a>
              <button
                onClick={() => setView('dashboard')}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-medium px-6 py-3 rounded-xl transition"
              >
                View Controls Dashboard
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-800 grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl sm:text-3xl font-semibold text-white">3x</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Faster Readiness Setup</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-semibold text-blue-400">100%</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Live Control & Evidence Tracking</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-semibold text-cyan-400">RBAC</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Admin, Editor & Auditor Roles</p>
              </div>
            </div>
          </div>

          <div id="onboarding" className="lg:col-span-5 bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Step {onboardingStep} of 2 • {onboardingStep === 1 ? 'Organization Details' : 'Compliance Setup'}
              </span>
              <div className="flex gap-1.5">
                <span className={`h-1.5 w-6 rounded-full ${onboardingStep >= 1 ? 'bg-blue-500' : 'bg-gray-700'}`} />
                <span className={`h-1.5 w-6 rounded-full ${onboardingStep >= 2 ? 'bg-cyan-400' : 'bg-gray-700'}`} />
              </div>
            </div>

            <h2 className="text-2xl font-semibold text-white mt-1">Launch Your Workspace</h2>
            <p className="text-gray-400 text-sm mt-1 mb-6">
              {onboardingStep === 1
                ? 'Start with your organization identity and primary contact.'
                : 'Choose your target compliance framework and cloud environment.'}
            </p>

            {onboardingStep === 1 ? (
              <form onSubmit={handleNextOnboardingStep} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Organization Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ganesh Tech"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Work Email *</label>
                  <input
                    type="email"
                    placeholder="security@company.com"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl mt-2 transition"
                >
                  Continue →
                </button>
              </form>
            ) : (
              <form onSubmit={handleOnboardingSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Target Framework</label>
                    <select
                      value={selectedFramework}
                      onChange={(e) => setSelectedFramework(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="SOC 2">SOC 2 Type II</option>
                      <option value="ISO 27001">ISO 27001:2022</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Cloud Provider</label>
                    <select
                      value={cloudProvider}
                      onChange={(e) => setCloudProvider(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="AWS">AWS</option>
                      <option value="Azure">Azure</option>
                      <option value="GCP">GCP</option>
                      <option value="Hybrid">Hybrid Cloud</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Team Size</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="1-50 Employees">1-50 Employees</option>
                      <option value="51-200 Employees">51-200 Employees</option>
                      <option value="200+ Employees">200+ Employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Audit Timeline</label>
                    <select
                      value={targetTimeline}
                      onChange={(e) => setTargetTimeline(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="Within 1 Month">Within 1 Month</option>
                      <option value="Within 3 Months">Within 3 Months</option>
                      <option value="Within 6 Months">Within 6 Months</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="w-1/3 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 font-medium py-3 rounded-xl transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white font-medium py-3 rounded-xl transition"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Workspace →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>

        <section className="border-b border-gray-800/80 bg-gray-900/30 py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Designed for High-Growth SaaS, FinTech & Cloud Teams
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-semibold text-gray-400">
              <span>CLOUDCORE</span>
              <span>FINVAULT</span>
              <span>DATAPULSE</span>
              <span>SYNAPSE AI</span>
              <span>SECUREOPS</span>
            </div>
          </div>
        </section>

        <section id="workflow" className="max-w-7xl mx-auto px-6 py-16 border-b border-gray-800/80">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">How It Works</span>
            <h2 className="text-3xl font-semibold mt-1.5">Your Path to Audit Readiness</h2>
          </div>

          <div className="relative grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: '🏢',
                title: 'Onboard & Scope',
                desc: 'Set up your organization profile, select your compliance framework, and configure your cloud stack.',
              },
              {
                step: '02',
                icon: '🛡️',
                title: 'Map Controls & Evidence',
                desc: 'Start with baseline controls (c1–c4), attach audit evidence notes, and manage updates with RBAC.',
              },
              {
                step: '03',
                icon: '📋',
                title: 'Stay Audit-Ready',
                desc: 'Switch to Auditor read-only mode anytime and export full CSV readiness reports with evidence trails.',
              },
            ].map((item, idx) => (
              <div key={item.step} className="relative bg-gray-900 border border-gray-800 p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-700/40 px-3 py-1 rounded-full">
                    <span>{item.icon}</span> STEP {item.step}
                  </span>
                  {idx < 2 && (
                    <span className="hidden md:inline text-xs text-gray-500 font-mono">────→</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-gray-400 text-sm mt-2 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="frameworks" className="max-w-7xl mx-auto px-6 py-16 border-b border-gray-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">Framework Coverage</span>
              <h2 className="text-3xl font-semibold mt-1.5">Explore Supported Standards</h2>
            </div>

            <div className="inline-flex bg-gray-900 p-1.5 rounded-xl border border-gray-800">
              {[
                { key: 'SOC 2', label: 'SOC 2 • 4 Controls' },
                { key: 'ISO 27001', label: 'ISO 27001 • 4 Controls' },
              ].map((fw) => (
                <button
                  key={fw.key}
                  onClick={() => setActiveTab(fw.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === fw.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {fw.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{currentTabData.badge}</span>
            <h3 className="text-2xl font-semibold text-white mt-2">{currentTabData.title}</h3>
            <p className="text-gray-400 text-sm mt-2 max-w-3xl">{currentTabData.subtitle}</p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {currentTabData.checklist.map((row) => (
                <div
                  key={row.code}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-semibold text-blue-400">{row.code}</span>
                    <p className="text-sm font-medium text-gray-200 mt-0.5">{row.item}</p>
                  </div>
                  <span className="text-xs font-medium bg-green-950 text-green-300 border border-green-800/60 px-2.5 py-1 rounded-full shrink-0">
                    {row.icon} {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-8">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-400">FAQ</span>
            <h2 className="text-3xl font-semibold mt-1.5">Common Questions</h2>
            <div className="max-w-md mx-auto mt-4">
              <input
                type="text"
                placeholder="What are you looking for?"
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.map((item, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center font-medium text-gray-200 hover:text-white gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] uppercase tracking-wider bg-blue-950 text-blue-300 border border-blue-800/50 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <span>{item.q}</span>
                  </div>
                  <span className="text-blue-400 text-xl">{openFaq === idx ? '−' : '+'}</span>
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-4 text-sm text-gray-400 leading-relaxed border-t border-gray-800/60 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-gray-800 py-8 px-6 text-sm text-gray-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="font-medium text-gray-300">ComplianceGuard • SOC 2 & ISO 27001 Readiness Portal</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </footer>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-6 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <header className="border-b border-gray-800 pb-5 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Governance & Administration</span>
              <h1 className="text-3xl font-semibold text-white mt-1">ComplianceGuard Admin Panel</h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage onboarded organizations, team access roles, and overall audit readiness metrics.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RoleSwitcher />
              <button
                onClick={handleExportAuditReport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                ↓ Export Audit Report (CSV)
              </button>
              <button
                onClick={() => setView('dashboard')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                Controls Dashboard
              </button>
              <button
                onClick={() => setView('landing')}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition"
              >
                ← Landing Page
              </button>
            </div>
          </header>

          {!canManageAdmin && (
            <div className="bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs px-4 py-3 rounded-xl">
              <strong>RBAC Active ({currentRole} Mode):</strong> Organization status changes and team membership modifications are restricted to <strong>Super Admin</strong>. You can still inspect workspaces and export CSV audit reports.
            </div>
          )}

          {selectedOrg && (
            <div className="bg-blue-950/30 border border-blue-700/40 rounded-2xl p-4 flex flex-wrap justify-between items-center gap-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Selected Organization Workspace
                </span>
                <p className="text-lg font-semibold text-white mt-0.5">
                  {selectedOrg.name}{' '}
                  <span className="text-xs font-mono text-blue-300 ml-2">({selectedOrg.id})</span>
                </p>
              </div>
              <div className="text-xs text-gray-300 flex flex-wrap gap-3">
                <span className="bg-gray-900 border border-gray-700 px-3 py-1 rounded-lg">
                  Framework: <strong>{selectedOrg.framework}</strong>
                </span>
                <span className="bg-gray-900 border border-gray-700 px-3 py-1 rounded-lg">
                  Cloud: <strong>{selectedOrg.cloud}</strong>
                </span>
                <span className="bg-gray-900 border border-gray-700 px-3 py-1 rounded-lg">
                  Team Size: <strong>{orgTeamMembers.length}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Readiness Score</p>
                <span className="text-xs text-cyan-400">📊</span>
              </div>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{orgReadinessScore}%</p>
              <div className="w-full bg-gray-800 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${orgReadinessScore}%` }}
                />
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Total Controls</p>
                <span className="text-xs text-gray-400">📋</span>
              </div>
              <p className="text-2xl font-bold text-white mt-1">{totalCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Mapped requirements</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Compliant</p>
                <span className="text-xs text-green-400">✓</span>
              </div>
              <p className="text-2xl font-bold text-green-400 mt-1">{compliantCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Audit verified</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">In Progress</p>
                <span className="text-xs text-yellow-400">⏳</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400 mt-1">{inProgressCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Remediation active</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Non-Compliant</p>
                <span className="text-xs text-red-400">⚠</span>
              </div>
              <p className="text-2xl font-bold text-red-400 mt-1">{nonCompliantCount}</p>
              <p className="text-[11px] text-gray-500 mt-1">Needs attention</p>
            </div>
          </div>

          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Onboarded Organizations</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Select an organization workspace to view its readiness progress and team roles
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search organization or ID..."
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 outline-none"
                />
                <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800/60 px-3 py-1 rounded-full font-medium">
                  {filteredOrganizations.length} Workspaces
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs uppercase text-gray-400">
                    <th className="py-3 px-3">Org ID</th>
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Contact Email</th>
                    <th className="py-3 px-3">Framework</th>
                    <th className="py-3 px-3">Cloud</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/70 text-sm">
                  {filteredOrganizations.map((org) => {
                    const isSelected = selectedOrg?.id === org.id;
                    return (
                      <tr
                        key={org.id}
                        onClick={() => setSelectedOrgId(org.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-950/50 border-l-4 border-l-cyan-400'
                            : 'hover:bg-gray-800/40'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono text-xs text-blue-400">{org.id}</td>
                        <td className="py-3 px-3 font-medium text-gray-100">
                          {org.name}
                          {isSelected && (
                            <span className="ml-2 text-[10px] uppercase bg-cyan-950 text-cyan-300 border border-cyan-700/50 px-2 py-0.5 rounded-full">
                              Active View
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-400">{org.email}</td>
                        <td className="py-3 px-3 text-gray-300">{org.framework}</td>
                        <td className="py-3 px-3 text-gray-300">{org.cloud}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              org.status === 'Active'
                                ? 'bg-green-950 text-green-300 border border-green-800/60'
                                : 'bg-yellow-950 text-yellow-300 border border-yellow-800/60'
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOrgId(org.id);
                            }}
                            className={`text-xs px-3 py-1 rounded-lg transition font-medium ${
                              isSelected
                                ? 'bg-cyan-600 text-white'
                                : 'bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-700/50'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                          <button
                            type="button"
                            disabled={!canManageAdmin}
                            onClick={(e) => handleToggleOrgStatus(e, org)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-200 px-3 py-1 rounded-lg transition"
                          >
                            Toggle Status
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-1">
              Team & Role Access Management {selectedOrg ? `— ${selectedOrg.name}` : ''}
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Assign compliance roles and manage account access for{' '}
              {selectedOrg ? selectedOrg.name : 'the selected organization'}
            </p>

            <form onSubmit={handleAddMember} className="grid sm:grid-cols-4 gap-3 mb-6">
              <input
                type="text"
                placeholder="Member Name"
                value={newMemberName}
                disabled={!canManageAdmin}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="bg-gray-950 border border-gray-700 disabled:opacity-50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                required
              />
              <input
                type="email"
                placeholder="work@email.com"
                value={newMemberEmail}
                disabled={!canManageAdmin}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="bg-gray-950 border border-gray-700 disabled:opacity-50 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                required
              />
              <select
                value={newMemberRole}
                disabled={!canManageAdmin}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="bg-gray-950 border border-gray-700 disabled:opacity-50 rounded-lg px-3 py-2 text-sm text-white outline-none"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Auditor">Auditor</option>
                <option value="Editor">Editor</option>
              </select>
              <button
                type="submit"
                disabled={!canManageAdmin}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-2 text-sm transition"
              >
                + Add Team Member
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs uppercase text-gray-400">
                    <th className="py-3 px-3">Name</th>
                    <th className="py-3 px-3">Email</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/70 text-sm">
                  {orgTeamMembers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-gray-400">
                        No team members assigned to {selectedOrg?.name || 'this organization'} yet. Add one above!
                      </td>
                    </tr>
                  ) : (
                    orgTeamMembers.map((member) => (
                      <tr key={member._id || member.id} className="hover:bg-gray-800/40">
                        <td className="py-3 px-3 font-medium text-gray-100">{member.name}</td>
                        <td className="py-3 px-3 text-gray-400">{member.email}</td>
                        <td className="py-3 px-3">
                          <span className="bg-blue-950/70 text-blue-300 border border-blue-800/50 px-2.5 py-0.5 rounded-md text-xs font-medium">
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              member.status === 'Active'
                                ? 'bg-green-950 text-green-300 border border-green-800/60'
                                : 'bg-red-950 text-red-300 border border-red-800/60'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            disabled={!canManageAdmin}
                            onClick={() => handleToggleMemberStatus(member)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-200 px-2.5 py-1 rounded-lg transition"
                          >
                            {member.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            disabled={!canManageAdmin}
                            onClick={() => handleDeleteMember(member)}
                            className="text-xs bg-red-600/20 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 hover:text-white border border-red-700/50 px-2.5 py-1 rounded-lg transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 border-b border-gray-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-blue-400">
              Enterprise SOC 2 & ISO 27001 Readiness Portal
            </h1>
            <p className="text-gray-400 mt-1 text-sm">
              {selectedOrg
                ? `Active Workspace: ${selectedOrg.name} (${selectedOrg.id}) • Framework: ${selectedOrg.framework} • Cloud: ${selectedOrg.cloud}`
                : 'Track, document, and manage security compliance controls.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleSwitcher />
            <button
              onClick={handleExportAuditReport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              ↓ Export Report
            </button>
            <button
              onClick={() => setView('admin')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              Admin Panel
            </button>
            <button
              onClick={() => setView('landing')}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition"
            >
              ← Landing Page
            </button>
          </div>
        </header>

        {currentRole === 'Auditor' && (
          <div className="mb-6 bg-amber-950/50 border border-amber-700/60 text-amber-200 text-xs px-4 py-3 rounded-xl">
            <strong>Auditor Read-Only Mode:</strong> You can inspect all controls, review audit evidence notes, filter statuses, and download CSV audit reports. Editing or deleting controls is disabled.
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'All', count: totalCount },
              { label: 'Compliant', count: compliantCount },
              { label: 'In Progress', count: inProgressCount },
              { label: 'Non-Compliant', count: nonCompliantCount },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => setFilter(item.label)}
                className={`px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm transition ${
                  filter === item.label ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {item.label} ({item.count})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search by Control ID or Name..."
              value={controlSearch}
              onChange={(e) => setControlSearch(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3.5 py-2 text-sm text-white placeholder-gray-400 focus:border-blue-500 outline-none"
            />
            {canEditControls && (
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                + Add Control
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing <strong>{filteredControls.length}</strong> of <strong>{totalCount}</strong> controls
          </span>
          <span>
            Readiness Score: <strong className="text-cyan-400 text-sm">{orgReadinessScore}%</strong> ({compliantCount}/{totalCount} Compliant)
          </span>
        </div>

        <div className="bg-gray-800 rounded-xl overflow-visible shadow-lg border border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700 text-gray-300 text-xs uppercase tracking-wider">
                <th className="p-4">Control ID</th>
                <th className="p-4">Control Name</th>
                <th className="p-4">Framework</th>
                <th className="p-4">Audit Evidence / Proof</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 text-sm">
              {filteredControls.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-gray-400">
                    No matching controls found for this workspace.
                  </td>
                </tr>
              ) : (
                filteredControls.map((item) => {
                  const isEditingThis = editingEvidenceId === item._id;
                  return (
                    <tr key={item._id} className="hover:bg-gray-750 transition">
                      <td className="p-4 font-semibold text-blue-300">{item.id}</td>
                      <td className="p-4 text-gray-200 font-medium">{item.name}</td>
                      <td className="p-4 text-gray-400">{item.framework}</td>
                      <td className="p-4 max-w-xs">
                        {isEditingThis ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={evidenceDraft}
                              onChange={(e) => setEvidenceDraft(e.target.value)}
                              placeholder="Enter audit proof or link..."
                              className="w-full bg-gray-900 border border-blue-500 rounded px-2.5 py-1 text-xs text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEvidence(item._id)}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-medium"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingEvidenceId(null)}
                              className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-2 py-1 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-gray-300 leading-snug">
                              {item.evidence || 'No evidence note attached'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              <span>Updated by {item.updatedBy || 'Super Admin'}</span>
                              {canEditControls && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEvidenceId(item._id);
                                    setEvidenceDraft(item.evidence || '');
                                  }}
                                  className="text-cyan-400 hover:underline font-medium"
                                >
                                  Edit Note
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <select
                          value={item.status}
                          disabled={!canEditControls}
                          onChange={(e) => handleStatusChange(item._id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-xs font-medium outline-none disabled:opacity-75 disabled:cursor-not-allowed ${
                            item.status === 'Compliant' ? 'bg-green-900 text-green-300 border border-green-700' :
                            item.status === 'In Progress' ? 'bg-yellow-900 text-yellow-300 border border-yellow-700' :
                            'bg-red-900 text-red-300 border border-red-700'
                          }`}
                        >
                          <option value="Compliant" className="bg-gray-900 text-white">Compliant</option>
                          <option value="In Progress" className="bg-gray-900 text-white">In Progress</option>
                          <option value="Non-Compliant" className="bg-gray-900 text-white">Non-Compliant</option>
                        </select>
                      </td>
                      <td className="p-4 text-right relative">
                        {canDeleteControls ? (
                          <div className="inline-block relative">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenMenuId(openMenuId === item._id ? null : item._id)
                              }
                              className="bg-gray-700/70 hover:bg-gray-700 text-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold"
                              title="Control Actions"
                            >
                              •••
                            </button>
                            {openMenuId === item._id && (
                              <div className="absolute right-0 mt-1 w-36 bg-gray-950 border border-gray-700 rounded-lg shadow-xl z-20 py-1 text-left">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    setEditingEvidenceId(item._id);
                                    setEvidenceDraft(item.evidence || '');
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-800"
                                >
                                  Edit Evidence
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  className="w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-950/60"
                                >
                                  Delete Control
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {currentRole === 'Editor' ? 'Admin Only' : 'View Only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && canEditControls && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">Add Security Control</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddControl} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Control ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. c5"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Framework</label>
                  <select
                    value={newFramework}
                    onChange={(e) => setNewFramework(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="SOC 2">SOC 2</option>
                    <option value="ISO 27001">ISO 27001</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Control Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Vendor Risk Assessment"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Initial Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="Compliant">Compliant</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Non-Compliant">Non-Compliant</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1">Audit Evidence / Proof Note</label>
                <input
                  type="text"
                  placeholder="e.g. Annual vendor security questionnaire verified"
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Save Control
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}