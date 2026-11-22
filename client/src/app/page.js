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

  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('SOC 2');
  const [companySize, setCompanySize] = useState('1-50 Employees');
  const [cloudProvider, setCloudProvider] = useState('AWS');
  const [targetTimeline, setTargetTimeline] = useState('Within 3 Months');

  const [organizations, setOrganizations] = useState(DEFAULT_ORGANIZATIONS);
  const [selectedOrgId, setSelectedOrgId] = useState('ORG-101');
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM_MEMBERS);
  const [controls, setControls] = useState(() => [
    ...createStarterControls('ORG-101', 'SOC 2'),
    ...createStarterControls('ORG-102', 'ISO 27001'),
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Editor');

  const [openFaq, setOpenFaq] = useState(0);

  const [filter, setFilter] = useState('All');
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newStatus, setNewStatus] = useState('In Progress');
  const [newEvidence, setNewEvidence] = useState('');

  // Inline Evidence Editor Modal/Row State
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
      setNewId('');
      setNewName('');
      setNewEvidence('');
    } catch {
      setControls((prev) => [
        ...prev,
        { ...newControl, _id: `${activeOrgId}-${Date.now()}`, updatedAt: new Date().toISOString() },
      ]);
      setNewId('');
      setNewName('');
      setNewEvidence('');
    }
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

  const handleDelete = async (mongoId) => {
    if (!canDeleteControls) return;
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

  const filteredControls = filter === 'All'
    ? orgControls
    : orgControls.filter((c) => c.status === filter);

  const totalCount = orgControls.length;
  const compliantCount = orgControls.filter((c) => c.status === 'Compliant').length;
  const inProgressCount = orgControls.filter((c) => c.status === 'In Progress').length;
  const nonCompliantCount = orgControls.filter((c) => c.status === 'Non-Compliant').length;
  const orgReadinessScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

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
        className="bg-transparent text-xs font-bold text-cyan-300 outline-none cursor-pointer"
      >
        <option value="Super Admin" className="bg-gray-900 text-white">Super Admin (Full Access)</option>
        <option value="Editor" className="bg-gray-900 text-white">Editor (Edit Controls)</option>
        <option value="Auditor" className="bg-gray-900 text-white">Auditor (Read-Only)</option>
      </select>
    </div>
  );

  const frameworkDetails = {
    'SOC 2': {
      badge: 'AICPA TRUST SERVICES CRITERIA',
      title: 'SOC 2 Type I & Type II Automation',
      subtitle: 'Prove security, availability, and confidentiality controls to enterprise buyers with continuous tracking.',
      checklist: [
        { code: 'CC1.1', item: 'Control Environment & Security Governance Policy', status: 'Ready' },
        { code: 'CC6.1', item: 'Logical Access, RBAC & Multi-Factor Authentication', status: 'Monitored' },
        { code: 'CC7.2', item: 'System Monitoring, Alerting & Incident Response', status: 'Active' },
        { code: 'CC8.1', item: 'Change Management & Code Review Controls', status: 'Ready' },
      ],
    },
    'ISO 27001': {
      badge: 'ISO/IEC 27001:2022 ISMS',
      title: 'ISO 27001 Information Security Management',
      subtitle: 'Build a structured ISMS and map Annex A controls for global enterprise and international readiness.',
      checklist: [
        { code: 'A.5.1', item: 'Policies for Information Security Governance', status: 'Ready' },
        { code: 'A.5.15', item: 'Access Control & Least-Privilege Provisioning', status: 'Monitored' },
        { code: 'A.8.15', item: 'Audit Logging, Event Trails & Retention', status: 'Active' },
        { code: 'A.8.24', item: 'Cryptography & Data Protection Controls', status: 'Ready' },
      ],
    },
  };

  const currentTabData = frameworkDetails[activeTab];

  const faqs = [
    {
      q: 'How does ComplianceGuard speed up SOC 2 and ISO 27001 readiness?',
      a: 'It centralizes your compliance controls in MongoDB, seeds core starter controls automatically, tracks audit evidence notes, and lets teams update statuses in real time.',
    },
    {
      q: 'How does Role-Based Access Control (RBAC) work inside the portal?',
      a: 'Super Admins have full workspace, team, and control management rights; Editors can add controls and update statuses/evidence; Auditors operate in read-only mode with CSV audit report export.',
    },
    {
      q: 'What can administrators manage inside the Admin Panel?',
      a: 'Admins can switch between onboarded organizations, toggle workspace status, manage team members and roles, and export audit readiness reports with evidence notes.',
    },
  ];

  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-600 selection:text-white">
        <nav className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-extrabold px-3 py-1.5 rounded-lg text-sm">
                CG
              </div>
              <span className="font-bold text-xl tracking-tight">
                Compliance<span className="text-blue-400">Guard</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
              <a href="#workflow" className="hover:text-white transition">How It Works</a>
              <a href="#frameworks" className="hover:text-white transition">Frameworks</a>
              <a href="#onboarding" className="hover:text-white transition">Onboarding</a>
              <a href="#faq" className="hover:text-white transition">FAQ</a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setView('dashboard')}
                className="text-sm text-gray-300 hover:text-white px-3 py-2 transition"
              >
                Open Portal
              </button>
              <button
                onClick={() => setView('admin')}
                className="text-sm bg-gray-900 hover:bg-gray-800 border border-gray-700 text-cyan-300 font-semibold px-3.5 py-2 rounded-lg transition"
              >
                Admin Panel
              </button>
              <a
                href="#onboarding"
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                Get Started
              </a>
            </div>
          </div>
        </nav>

        <section className="max-w-7xl mx-auto px-6 py-16 lg:py-20 grid lg:grid-cols-12 gap-12 items-center border-b border-gray-800/80">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 bg-blue-950/80 border border-blue-700/40 text-blue-300 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              CONTINUOUS COMPLIANCE & AUDIT READINESS
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Get <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">SOC 2 & ISO 27001</span> Ready Without the Chaos.
            </h1>

            <p className="text-gray-400 text-lg mt-5 leading-relaxed max-w-2xl">
              Onboard your organization, map security controls with audit evidence, enforce role-based access, and prepare for audits with clarity across your entire stack.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#onboarding"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl transition shadow-lg shadow-blue-600/20"
              >
                Start Customer Onboarding →
              </a>
              <button
                onClick={() => setView('dashboard')}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 font-semibold px-6 py-3.5 rounded-xl transition"
              >
                View Controls Dashboard
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-800 grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white">3x</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Faster Readiness Setup</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-400">100%</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Live Control & Evidence Tracking</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">RBAC</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Admin, Editor & Auditor Roles</p>
              </div>
            </div>
          </div>

          <div id="onboarding" className="lg:col-span-5 bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Customer Onboarding</span>
            <h2 className="text-2xl font-bold text-white mt-1">Launch Your Workspace</h2>
            <p className="text-gray-400 text-sm mt-1 mb-6">Enter organization details to configure your compliance portal.</p>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl mt-2 transition"
              >
                {isSubmitting ? 'Creating Workspace...' : 'Complete Onboarding & Launch Portal →'}
              </button>
            </form>
          </div>
        </section>

        <section className="border-b border-gray-800/80 bg-gray-900/30 py-8 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Designed for High-Growth SaaS, FinTech & Cloud Teams
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-gray-400">
              <span>CLOUDCORE</span>
              <span>FINVAULT</span>
              <span>DATAPULSE</span>
              <span>SYNAPSE AI</span>
              <span>SECUREOPS</span>
            </div>
          </div>
        </section>

        <section id="workflow" className="max-w-7xl mx-auto px-6 py-20 border-b border-gray-800/80">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">How It Works</span>
            <h2 className="text-3xl sm:text-4xl font-bold mt-2">From Onboarding to Audit-Ready in 3 Steps</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Onboard & Scope',
                desc: 'Set up your organization profile, select your compliance framework, and define your cloud stack and audit timeline.',
              },
              {
                step: '02',
                title: 'Map Controls & Evidence',
                desc: 'Start with baseline controls (c1–c4), attach audit evidence notes, and manage updates using role-based access.',
              },
              {
                step: '03',
                title: 'Stay Audit-Ready',
                desc: 'Switch to Auditor read-only mode anytime and export full CSV readiness reports with evidence trails.',
              },
            ].map((item) => (
              <div key={item.step} className="bg-gray-900 border border-gray-800 p-7 rounded-2xl">
                <span className="text-xs font-extrabold text-cyan-400 bg-cyan-950/60 border border-cyan-700/40 px-3 py-1 rounded-full">
                  STEP {item.step}
                </span>
                <h3 className="text-xl font-bold text-white mt-4">{item.title}</h3>
                <p className="text-gray-400 text-sm mt-2.5 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="frameworks" className="max-w-7xl mx-auto px-6 py-20 border-b border-gray-800/80">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Framework Coverage</span>
              <h2 className="text-3xl sm:text-4xl font-bold mt-2">Explore Supported Standards</h2>
            </div>

            <div className="inline-flex bg-gray-900 p-1.5 rounded-xl border border-gray-800">
              {['SOC 2', 'ISO 27001'].map((fw) => (
                <button
                  key={fw}
                  onClick={() => setActiveTab(fw)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === fw ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{currentTabData.badge}</span>
            <h3 className="text-2xl font-bold text-white mt-2">{currentTabData.title}</h3>
            <p className="text-gray-400 text-sm mt-2 max-w-3xl">{currentTabData.subtitle}</p>

            <div className="mt-8 grid sm:grid-cols-2 gap-4">
              {currentTabData.checklist.map((row) => (
                <div
                  key={row.code}
                  className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-bold text-blue-400">{row.code}</span>
                    <p className="text-sm font-medium text-gray-200 mt-0.5">{row.item}</p>
                  </div>
                  <span className="text-xs font-semibold bg-green-950 text-green-300 border border-green-800/60 px-2.5 py-1 rounded-full shrink-0">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="max-w-4xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">FAQ</span>
            <h2 className="text-3xl font-bold mt-2">Common Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((item, idx) => (
              <div key={idx} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center font-semibold text-gray-200 hover:text-white"
                >
                  <span>{item.q}</span>
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
            <span className="font-semibold text-gray-300">ComplianceGuard • SOC 2 & ISO 27001 Readiness Portal</span>
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
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Governance & Administration</span>
              <h1 className="text-3xl font-bold text-white mt-1">ComplianceGuard Admin Panel</h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage onboarded organizations, team access roles, and overall audit readiness metrics.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <RoleSwitcher />
              <button
                onClick={handleExportAuditReport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                ↓ Export Audit Report (CSV)
              </button>
              <button
                onClick={() => setView('dashboard')}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
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
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Selected Organization Workspace
                </span>
                <p className="text-lg font-bold text-white mt-0.5">
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
              <p className="text-xs text-gray-400 uppercase font-semibold">Readiness Score</p>
              <p className="text-2xl font-extrabold text-cyan-400 mt-1">{orgReadinessScore}%</p>
              {selectedOrg && (
                <p className="text-[11px] text-gray-500 mt-0.5 truncate">{selectedOrg.name}</p>
              )}
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase font-semibold">Total Controls</p>
              <p className="text-2xl font-extrabold text-white mt-1">{totalCount}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase font-semibold">Compliant</p>
              <p className="text-2xl font-extrabold text-green-400 mt-1">{compliantCount}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase font-semibold">In Progress</p>
              <p className="text-2xl font-extrabold text-yellow-400 mt-1">{inProgressCount}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase font-semibold">Non-Compliant</p>
              <p className="text-2xl font-extrabold text-red-400 mt-1">{nonCompliantCount}</p>
            </div>
          </div>

          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Onboarded Organizations</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click any organization row or Select button to view its score, controls, and team members
                </p>
              </div>
              <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800/60 px-3 py-1 rounded-full font-semibold">
                {organizations.length} Workspaces
              </span>
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
                  {organizations.map((org) => {
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
                        <td className="py-3 px-3 font-semibold text-gray-100">
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
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
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
                            className={`text-xs px-3 py-1 rounded-lg transition font-semibold ${
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
            <h2 className="text-xl font-bold text-white mb-1">
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
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
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
                          <span className="bg-blue-950/70 text-blue-300 border border-blue-800/50 px-2.5 py-0.5 rounded-md text-xs font-semibold">
                            {member.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 border-b border-gray-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Enterprise SOC 2 & ISO 27001 Readiness Portal</h1>
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              ↓ Export Report
            </button>
            <button
              onClick={() => setView('admin')}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
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

        {canEditControls && (
          <form onSubmit={handleAddControl} className="bg-gray-800 p-4 rounded-xl mb-6 border border-gray-700 grid sm:grid-cols-12 gap-3 items-center">
            <input
              type="text"
              placeholder="Control ID (e.g. c5)"
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="sm:col-span-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              required
            />
            <input
              type="text"
              placeholder="Control Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="sm:col-span-3 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              required
            />
            <input
              type="text"
              placeholder="Audit Evidence / Proof Note"
              value={newEvidence}
              onChange={(e) => setNewEvidence(e.target.value)}
              className="sm:col-span-3 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <select
              value={newFramework}
              onChange={(e) => setNewFramework(e.target.value)}
              className="sm:col-span-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white"
            >
              <option value="SOC 2">SOC 2</option>
              <option value="ISO 27001">ISO 27001</option>
            </select>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="sm:col-span-2 bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-sm text-white"
            >
              <option value="Compliant">Compliant</option>
              <option value="In Progress">In Progress</option>
              <option value="Non-Compliant">Non-Compliant</option>
            </select>
            <button type="submit" className="sm:col-span-1 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-semibold transition">
              + Add
            </button>
          </form>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex gap-3">
            {['All', 'Compliant', 'In Progress', 'Non-Compliant'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  filter === status ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400">
            Readiness Score: <strong className="text-cyan-400 text-sm">{orgReadinessScore}%</strong> ({compliantCount}/{totalCount} Compliant)
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
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
                  <td colSpan="6" className="p-6 text-center text-gray-400">No controls found for this workspace.</td>
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
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-semibold"
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
                                  className="text-cyan-400 hover:underline font-semibold"
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
                          className={`px-3 py-1 rounded-full text-xs font-semibold outline-none disabled:opacity-75 disabled:cursor-not-allowed ${
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
                      <td className="p-4 text-right">
                        {canDeleteControls ? (
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1 rounded-lg text-xs font-semibold border border-red-700/50 transition"
                          >
                            Delete
                          </button>
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
    </main>
  );
}