'use client';
import { useState, useEffect } from 'react';

const API_URL = 'https://soc2-iso27001-readiness-portal.onrender.com/api/controls';

export default function Home() {
  // Views: 'landing' | 'dashboard' | 'admin'
  const [view, setView] = useState('landing');

  // Interactive Framework Switcher state
  const [activeTab, setActiveTab] = useState('SOC 2');

  // Customer Onboarding Form states
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('SOC 2');
  const [companySize, setCompanySize] = useState('1-50 Employees');
  const [cloudProvider, setCloudProvider] = useState('AWS');
  const [targetTimeline, setTargetTimeline] = useState('Within 3 Months');

  // Admin Panel states (Organizations & Team/Role Management)
  const [organizations, setOrganizations] = useState([
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
  ]);

  const [teamMembers, setTeamMembers] = useState([
    { id: 1, name: 'Admin Lead', email: 'admin@complianceguard.io', role: 'Super Admin', status: 'Active' },
    { id: 2, name: 'Security Auditor', email: 'auditor@complianceguard.io', role: 'Auditor', status: 'Active' },
    { id: 3, name: 'Compliance Analyst', email: 'analyst@complianceguard.io', role: 'Editor', status: 'Active' },
  ]);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Editor');

  // FAQ state
  const [openFaq, setOpenFaq] = useState(0);

  // Dashboard states
  const [controls, setControls] = useState([]);
  const [filter, setFilter] = useState('All');
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newStatus, setNewStatus] = useState('In Progress');

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => setControls(Array.isArray(data) ? data : []))
      .catch(() => setControls([]));
  }, []);

  const handleOnboardingSubmit = (e) => {
    e.preventDefault();
    if (!companyName || !workEmail) return;

    const newOrg = {
      id: `ORG-${Math.floor(103 + Math.random() * 890)}`,
      name: companyName,
      email: workEmail,
      framework: selectedFramework,
      cloud: cloudProvider,
      status: 'Active',
    };
    setOrganizations((prev) => [newOrg, ...prev]);
    setNewFramework(selectedFramework);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddMember = (e) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail) return;
    setTeamMembers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole,
        status: 'Active',
      },
    ]);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleToggleMemberStatus = (memberId) => {
    setTeamMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, status: m.status === 'Active' ? 'Suspended' : 'Active' } : m
      )
    );
  };

  const handleDeleteMember = (memberId) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleToggleOrgStatus = (orgId) => {
    setOrganizations((prev) =>
      prev.map((o) =>
        o.id === orgId ? { ...o, status: o.status === 'Active' ? 'In Review' : 'Active' } : o
      )
    );
  };

  const handleAddControl = async (e) => {
    e.preventDefault();
    if (!newId || !newName) return;
    const newControl = { id: newId, name: newName, framework: newFramework, status: newStatus };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newControl),
      });
      const savedControl = await response.json();
      if (savedControl && savedControl._id) {
        setControls((prev) => (Array.isArray(prev) ? [...prev, savedControl] : [savedControl]));
      }
      setNewId('');
      setNewName('');
    } catch (err) {
      console.log('Error saving control:', err);
    }
  };

  const handleStatusChange = async (mongoId, updatedStatus) => {
    try {
      const response = await fetch(`${API_URL}/${mongoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updatedStatus }),
      });
      const updatedControl = await response.json();
      setControls((prev) =>
        Array.isArray(prev) ? prev.map((c) => (c._id === mongoId ? updatedControl : c)) : []
      );
    } catch (err) {
      console.log('Error updating status:', err);
    }
  };

  const handleDelete = async (mongoId) => {
    try {
      await fetch(`${API_URL}/${mongoId}`, { method: 'DELETE' });
      setControls((prev) => (Array.isArray(prev) ? prev.filter((c) => c._id !== mongoId) : []));
    } catch (err) {
      console.log('Error deleting control:', err);
    }
  };

  const safeControls = Array.isArray(controls) ? controls : [];
  const filteredControls = filter === 'All'
    ? safeControls
    : safeControls.filter((c) => c.status === filter);

  const totalCount = safeControls.length;
  const compliantCount = safeControls.filter((c) => c.status === 'Compliant').length;
  const inProgressCount = safeControls.filter((c) => c.status === 'In Progress').length;
  const nonCompliantCount = safeControls.filter((c) => c.status === 'Non-Compliant').length;
  const readinessScore = totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

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
      a: 'It centralizes your compliance controls, highlights readiness gaps instantly, and lets teams update control statuses in real time instead of juggling scattered spreadsheets.',
    },
    {
      q: 'Can our team track multiple frameworks in one workspace?',
      a: 'Yes. You can add and filter both SOC 2 and ISO 27001 controls inside the readiness portal and filter by Compliant, In Progress, or Non-Compliant.',
    },
    {
      q: 'What can administrators manage inside the Admin Panel?',
      a: 'Admins can view onboarded organizations, toggle workspace review status, manage team members and roles (Super Admin, Auditor, Editor), and monitor overall audit readiness.',
    },
  ];

  // ==========================================
  // VIEW 1: ENTERPRISE LANDING & ONBOARDING PAGE
  // ==========================================
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gray-950 text-white selection:bg-blue-600 selection:text-white">
        {/* Navbar */}
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

        {/* Hero + Onboarding Section */}
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
              Onboard your organization, map security controls, monitor compliance status live, and prepare for audits with clarity across your entire stack.
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

            {/* Metrics */}
            <div className="mt-12 pt-8 border-t border-gray-800 grid grid-cols-3 gap-6">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white">3x</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Faster Readiness Setup</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-blue-400">100%</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Live Control Visibility</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">24/7</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">Status & Gap Tracking</p>
              </div>
            </div>
          </div>

          {/* Right Onboarding Card */}
          <div id="onboarding" className="lg:col-span-5 bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Customer Onboarding</span>
            <h2 className="text-2xl font-bold text-white mt-1">Launch Your Workspace</h2>
            <p className="text-gray-400 text-sm mt-1 mb-6">Enter organization details to configure your compliance portal.</p>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase mb-1.5">Organization Name *</label>
                <input
                  type="text"
                  placeholder="e.g. FinScale Cloud Inc"
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
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl mt-2 transition"
              >
                Complete Onboarding & Launch Portal →
              </button>
            </form>
          </div>
        </section>

        {/* Social Proof / Enterprise Logos Strip */}
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

        {/* 3-Step Workflow Section */}
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
                title: 'Map & Monitor Controls',
                desc: 'Add security controls, assign compliance states, and identify gaps across your infrastructure in real time.',
              },
              {
                step: '03',
                title: 'Stay Audit-Ready',
                desc: 'Filter compliant vs. non-compliant controls anytime so security leads and auditors always have an up-to-date view.',
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

        {/* Interactive Framework Switcher Section */}
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

        {/* FAQ Section */}
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

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8 px-6 text-sm text-gray-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="font-semibold text-gray-300">ComplianceGuard • SOC 2 & ISO 27001 Readiness Portal</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: ADMIN PANEL
  // ==========================================
  if (view === 'admin') {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-6 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Admin Header */}
          <header className="border-b border-gray-800 pb-5 flex flex-wrap justify-between items-center gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Governance & Administration</span>
              <h1 className="text-3xl font-bold text-white mt-1">ComplianceGuard Admin Panel</h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage onboarded organizations, team access roles, and overall audit readiness metrics.
              </p>
            </div>
            <div className="flex gap-3">
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

          {/* Admin KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
              <p className="text-xs text-gray-400 uppercase font-semibold">Readiness Score</p>
              <p className="text-2xl font-extrabold text-cyan-400 mt-1">{readinessScore}%</p>
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

          {/* Onboarded Organizations Table */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Onboarded Organizations</h2>
                <p className="text-xs text-gray-400 mt-0.5">Workspaces registered via Customer Onboarding</p>
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
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-gray-800/40">
                      <td className="py-3 px-3 font-mono text-xs text-blue-400">{org.id}</td>
                      <td className="py-3 px-3 font-semibold text-gray-100">{org.name}</td>
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
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleToggleOrgStatus(org.id)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 py-1 rounded-lg transition"
                        >
                          Toggle Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Team & Role Access Management */}
          <section className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-1">Team & Role Access Management</h2>
            <p className="text-xs text-gray-400 mb-5">Assign compliance roles and manage account access</p>

            <form onSubmit={handleAddMember} className="grid sm:grid-cols-4 gap-3 mb-6">
              <input
                type="text"
                placeholder="Member Name"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                required
              />
              <input
                type="email"
                placeholder="work@email.com"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                required
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Auditor">Auditor</option>
                <option value="Editor">Editor</option>
              </select>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg px-4 py-2 text-sm transition"
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
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-800/40">
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
                          onClick={() => handleToggleMemberStatus(member.id)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2.5 py-1 rounded-lg transition"
                        >
                          {member.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member.id)}
                          className="text-xs bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-700/50 px-2.5 py-1 rounded-lg transition"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ==========================================
  // VIEW 3: MAIN COMPLIANCE DASHBOARD PORTAL
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Enterprise SOC 2 & ISO 27001 Readiness Portal</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {companyName
                ? `Workspace: ${companyName} (${companySize}) • Cloud: ${cloudProvider} • Target: ${targetTimeline} • Contact: ${workEmail}`
                : 'Track, document, and manage security compliance controls.'}
            </p>
          </div>
          <div className="flex gap-3">
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

        {/* Add Control Form */}
        <form onSubmit={handleAddControl} className="bg-gray-800 p-4 rounded-xl mb-6 border border-gray-700 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Control ID (e.g. CC1.1)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white flex-1"
            required
          />
          <input
            type="text"
            placeholder="Control Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white flex-2"
            required
          />
          <select
            value={newFramework}
            onChange={(e) => setNewFramework(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="SOC 2">SOC 2</option>
            <option value="ISO 27001">ISO 27001</option>
          </select>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="Compliant">Compliant</option>
            <option value="In Progress">In Progress</option>
            <option value="Non-Compliant">Non-Compliant</option>
          </select>
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition">
            + Add Control
          </button>
        </form>

        {/* Status Filter Buttons */}
        <div className="flex gap-4 mb-6">
          {['All', 'Compliant', 'In Progress', 'Non-Compliant'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === status ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Controls Table */}
        <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-700 text-gray-300 text-sm uppercase tracking-wider">
                <th className="p-4">Control ID</th>
                <th className="p-4">Control Name</th>
                <th className="p-4">Framework</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredControls.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-400">No controls found in database. Add one above!</td>
                </tr>
              ) : (
                filteredControls.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-750 transition">
                    <td className="p-4 font-semibold text-blue-300">{item.id}</td>
                    <td className="p-4 text-gray-200">{item.name}</td>
                    <td className="p-4 text-gray-400">{item.framework}</td>
                    <td className="p-4">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item._id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer outline-none ${
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
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-3 py-1 rounded-lg text-xs font-semibold border border-red-700/50 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}