'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [controls, setControls] = useState([]);
  const [filter, setFilter] = useState('All');
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newFramework, setNewFramework] = useState('SOC 2');
  const [newStatus, setNewStatus] = useState('In Progress');

  // Fetch controls from backend when page loads
  useEffect(() => {
    fetch('http://localhost:5000/api/controls')
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

  // Add new control
  const handleAddControl = async (e) => {
    e.preventDefault();
    if (!newId || !newName) return;

    const newControl = { id: newId, name: newName, framework: newFramework, status: newStatus };

    try {
      const response = await fetch('http://localhost:5000/api/controls', {
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
      const response = await fetch(`http://localhost:5000/api/controls/${mongoId}`, {
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
      await fetch(`http://localhost:5000/api/controls/${mongoId}`, {
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

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold text-blue-400">Enterprise SOC 2 & ISO 27001 Readiness Portal</h1>
          <p className="text-gray-400 mt-1">Track, document, and manage security compliance controls.</p>
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