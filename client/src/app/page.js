'use client';
import { useState, useEffect } from 'react';

const API_URL = 'https://soc2-iso27001-readiness-portal.onrender.com/api/controls';

export default function Home() {
  // View state: 'landing' (Onboarding Page) or 'dashboard' (Controls Portal)
  const [view, setView] = useState('landing');

  // Customer Onboarding Form states
  const [companyName, setCompanyName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [selectedFramework, setSelectedFramework] = useState('SOC 2');
  const [companySize, setCompanySize] = useState('1-50 Employees');

  // Dashboard states
  const [controls, setControls] = useState([]);
  const [filter, setFilter] = useState('All');
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newStatus, setNewStatus] = useState('In Progress');

  // Fetch controls from backend
  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setControls(data);
        } else {
          setControls([]);
        }
      })
      .catch((err) => {
        console.log('Error fetching controls:', err);
        setControls([]);
      });
  }, []);

  // Handle Onboarding Submit
  const handleOnboardingSubmit = (e) => {
    e.preventDefault();
    if (!companyName || !workEmail) return;
    setNewFramework(selectedFramework);
    setView('dashboard');
  };

  // Add new control
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

  // Update control status
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

  // Delete control
  const handleDelete = async (mongoId) => {
    try {
      await fetch(`${API_URL}/${mongoId}`, {
        method: 'DELETE',
      });
      setControls((prev) =>
        Array.isArray(prev) ? prev.filter((c) => c._id !== mongoId) : []
      );
    } catch (err) {
      console.log('Error deleting control:', err);
    }
  };

  const safeControls = Array.isArray(controls) ? controls : [];
  const filteredControls = filter === 'All'
    ? safeControls
    : safeControls.filter((c) => c.status === filter);

  // ==========================================
  // VIEW 1: CUSTOMER ONBOARDING LANDING PAGE
  // ==========================================
  if (view === 'landing') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col justify-between">
        {/* Top Navbar */}
        <nav className="border-b border-gray-800 px-8 py-4 flex justify-between items-center max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded-lg text-sm">SEC</span>
            <span className="font-bold text-lg tracking-wide text-blue-400">ComplianceGuard</span>
          </div>
          <button
            onClick={() => setView('dashboard')}
            className="text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-lg transition"
          >
            Skip to Portal →
          </button>
        </nav>

        {/* Hero & Onboarding Section */}
        <div className="max-w-6xl mx-auto px-8 py-12 grid md:grid-cols-2 gap-12 items-center">
          {/* Left Side: Value Proposition */}
          <div>
            <span className="bg-blue-900/50 text-blue-300 border border-blue-700/50 text-xs font-semibold px-3 py-1 rounded-full">
              ENTERPRISE SECURITY COMPLIANCE
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mt-4 leading-tight">
              Get <span className="text-blue-400">SOC 2</span> & <span className="text-blue-400">ISO 27001</span> Audit-Ready Faster.
            </h1>
            <p className="text-gray-400 mt-4 text-base leading-relaxed">
              Automate your compliance tracking, monitor security controls in real time, and streamline readiness assessments for your organization.
            </p>

            {/* 3-Step Onboarding Highlights */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg px-2.5 py-1 font-bold text-sm">1</div>
                <div>
                  <h3 className="font-semibold text-gray-200">Organization Profile Setup</h3>
                  <p className="text-gray-400 text-sm">Register your workspace and choose your target compliance framework.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg px-2.5 py-1 font-bold text-sm">2</div>
                <div>
                  <h3 className="font-semibold text-gray-200">Map & Track Controls</h3>
                  <p className="text-gray-400 text-sm">Document SOC 2 Trust Services Criteria and ISO 27001 Annex A controls.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg px-2.5 py-1 font-bold text-sm">3</div>
                <div>
                  <h3 className="font-semibold text-gray-200">Real-Time Audit Readiness</h3>
                  <p className="text-gray-400 text-sm">Filter compliant vs. non-compliant items instantly for external auditors.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Customer Onboarding Form Card */}
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white">Customer Onboarding</h2>
            <p className="text-gray-400 text-sm mt-1 mb-6">Set up your organization workspace to begin tracking controls.</p>

            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Organization / Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Technologies Pvt Ltd"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Work Email</label>
                <input
                  type="email"
                  placeholder="admin@company.com"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Target Framework</label>
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
                  <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Company Size</label>
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
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg mt-2 transition shadow-lg"
              >
                Complete Onboarding & Launch Portal →
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
          Enterprise SOC 2 & ISO 27001 Readiness Portal • Secure Compliance Management
        </footer>
      </main>
    );
  }

  // ==========================================
  // VIEW 2: MAIN COMPLIANCE DASHBOARD PORTAL
  // ==========================================
  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-4 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">Enterprise SOC 2 & ISO 27001 Readiness Portal</h1>
            <p className="text-gray-400 mt-1">
              {companyName
                ? `Workspace: ${companyName} (${companySize}) • Contact: ${workEmail}`
                : 'Track, document, and manage security compliance controls.'}
            </p>
          </div>
          <button
            onClick={() => setView('landing')}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition"
          >
            ← Onboarding Home
          </button>
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