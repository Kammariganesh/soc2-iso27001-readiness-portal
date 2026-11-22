const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://<username>:<password>@cluster.mongodb.net/soc2db?retryWrites=true&w=majority';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected Successfully!');
    await seedInitialData();
  })
  .catch((err) => console.log('MongoDB Connection Error:', err));

// ==========================================
// SCHEMAS & MODELS
// ==========================================
const organizationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    framework: { type: String, default: 'SOC 2' },
    cloud: { type: String, default: 'AWS' },
    companySize: { type: String, default: '1-50 Employees' },
    targetTimeline: { type: String, default: 'Within 3 Months' },
    status: { type: String, default: 'Active' },
  },
  { timestamps: true, strict: false }
);

const memberSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'Editor' },
    status: { type: String, default: 'Active' },
  },
  { timestamps: true, strict: false }
);

const controlSchema = new mongoose.Schema(
  {
    orgId: { type: String, default: 'ORG-101' },
    id: { type: String, required: true },
    name: { type: String, required: true },
    framework: { type: String, default: 'SOC 2' },
    status: { type: String, default: 'In Progress' },
  },
  { timestamps: true, strict: false }
);

const Organization = mongoose.model('Organization', organizationSchema);
const Member = mongoose.model('Member', memberSchema);
const Control = mongoose.model('Control', controlSchema);

// Helper: Starter Controls (c1-c4) for any newly created organization
function buildStarterControls(orgId, framework = 'SOC 2') {
  return [
    { orgId, id: 'c1', name: 'Access Control & MFA', framework, status: 'Compliant' },
    { orgId, id: 'c2', name: 'Database Access & Encryption', framework, status: 'In Progress' },
    { orgId, id: 'c3', name: 'Network Firewall & Segmentation', framework, status: 'Non-Compliant' },
    { orgId, id: 'c4', name: 'System Logging & Monitoring', framework, status: 'Compliant' },
  ];
}

// Seed default organizations & starter data only if DB has zero organizations
async function seedInitialData() {
  try {
    const orgCount = await Organization.countDocuments();
    if (orgCount === 0) {
      await Organization.insertMany([
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

      await Member.insertMany([
        { orgId: 'ORG-101', name: 'Admin Lead', email: 'admin@complianceguard.io', role: 'Super Admin', status: 'Active' },
        { orgId: 'ORG-101', name: 'Security Auditor', email: 'auditor@complianceguard.io', role: 'Auditor', status: 'Active' },
        { orgId: 'ORG-101', name: 'Compliance Analyst', email: 'analyst@complianceguard.io', role: 'Editor', status: 'Active' },
        { orgId: 'ORG-102', name: 'DataPulse Admin', email: 'admin@datapulse.dev', role: 'Super Admin', status: 'Active' },
        { orgId: 'ORG-102', name: 'ISO Auditor', email: 'auditor@datapulse.dev', role: 'Auditor', status: 'Active' },
      ]);

      const existingControls = await Control.countDocuments();
      if (existingControls === 0) {
        await Control.insertMany([
          ...buildStarterControls('ORG-101', 'SOC 2'),
          ...buildStarterControls('ORG-102', 'ISO 27001'),
        ]);
      } else {
        await Control.updateMany({ orgId: { $exists: false } }, { $set: { orgId: 'ORG-101' } });
        await Control.insertMany(buildStarterControls('ORG-102', 'ISO 27001'));
      }
      console.log('Seeded default organizations, members, and starter controls!');
    }
  } catch (err) {
    console.log('Seed check error:', err.message);
  }
}

// ==========================================
// ORGANIZATION ROUTES
// ==========================================
app.get('/api/organizations', async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/organizations', async (req, res) => {
  try {
    const { name, email, framework = 'SOC 2', cloud = 'AWS', companySize, targetTimeline } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Organization name and email are required' });
    }

    const count = await Organization.countDocuments();
    const orgId = `ORG-${101 + count}`;

    const newOrg = await Organization.create({
      id: orgId,
      name: name.trim(),
      email: email.trim(),
      framework,
      cloud,
      companySize,
      targetTimeline,
      status: 'Active',
    });

    const createdControls = await Control.insertMany(buildStarterControls(orgId, framework));
    const createdMember = await Member.create({
      orgId,
      name: `${name.trim()} Lead`,
      email: email.trim(),
      role: 'Super Admin',
      status: 'Active',
    });

    res.status(201).json({
      organization: newOrg,
      controls: createdControls,
      member: createdMember,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/organizations/:orgId/status', async (req, res) => {
  try {
    const updated = await Organization.findOneAndUpdate(
      { id: req.params.orgId },
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// TEAM MEMBER ROUTES
// ==========================================
app.get('/api/members', async (req, res) => {
  try {
    const filter = req.query.orgId ? { orgId: req.query.orgId } : {};
    const members = await Member.find(filter).sort({ createdAt: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const newMember = await Member.create(req.body);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  try {
    const updated = await Member.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// CONTROL ROUTES
// ==========================================
app.get('/api/controls', async (req, res) => {
  try {
    const filter = req.query.orgId ? { orgId: req.query.orgId } : {};
    const controls = await Control.find(filter);
    res.json(controls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/controls', async (req, res) => {
  try {
    const newControl = new Control(req.body);
    const savedControl = await newControl.save();
    res.json(savedControl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/controls/:id', async (req, res) => {
  try {
    const updated = await Control.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/controls/:id', async (req, res) => {
  try {
    await Control.findByIdAndDelete(req.params.id);
    res.json({ message: 'Control deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});