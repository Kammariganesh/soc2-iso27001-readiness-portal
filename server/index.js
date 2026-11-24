const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.log('nodemailer not installed; using Resend API if configured.');
}

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
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Super Admin' },
    resetOtp: { type: String, default: '' },
    resetOtpExpires: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const organizationSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    ownerEmail: { type: String, required: true, lowercase: true, index: true },
    industry: { type: String, default: 'SaaS / Technology' },
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
    email: { type: String, required: true, lowercase: true },
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
    description: { type: String, default: '' },
    status: { type: String, default: 'In Progress' },
    evidence: { type: String, default: '' },
    updatedBy: { type: String, default: 'Super Admin' },
  },
  { timestamps: true, strict: false }
);

const User = mongoose.model('User', userSchema);
const Organization = mongoose.model('Organization', organizationSchema);
const Member = mongoose.model('Member', memberSchema);
const Control = mongoose.model('Control', controlSchema);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const DEMO_OWNER_EMAIL = 'ganesh@complianceguard.app';

async function sendOtpEmail(toEmail, otp) {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ComplianceGuard <onboarding@resend.dev>',
        to: [toEmail],
        subject: 'ComplianceGuard - Password Reset OTP',
        html: `<p>Your 6-digit OTP to reset your <b>ComplianceGuard</b> password is:</p><h2>${otp}</h2><p>Valid for 10 minutes.</p>`,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API error: ${errText}`);
    }

    return { sent: true };
  }

  if (nodemailer && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.replace(/\s+/g, ''),
      },
    });

    await transporter.sendMail({
      from: `"ComplianceGuard" <${process.env.EMAIL_USER.trim()}>`,
      to: toEmail,
      subject: 'ComplianceGuard - Password Reset OTP',
      text: `Your 6-digit OTP to reset your ComplianceGuard password is: ${otp}. Valid for 10 minutes.`,
      html: `<p>Your 6-digit OTP to reset your <b>ComplianceGuard</b> password is:</p><h2>${otp}</h2><p>Valid for 10 minutes.</p>`,
    });

    return { sent: true };
  }

  return {
    sent: false,
    reason: 'RESEND_API_KEY is not configured on Render.',
  };
}

// Helper: Demo Starter Controls (c1-c4)
function buildStarterControls(orgId, framework = 'SOC 2') {
  return [
    {
      orgId,
      id: 'CC6.1',
      name: 'Review access permissions',
      framework,
      description: 'Review user access to critical systems every quarter. Confirm permissions follow least privilege and remove access that is no longer required.',
      status: 'In Progress',
      evidence: 'Q4 access review log attached',
      updatedBy: 'Super Admin',
    },
    {
      orgId,
      id: 'CC1.1',
      name: 'Maintain security policies',
      framework,
      description: 'Establish, document, and review information security policies annually across all engineering and operations teams.',
      status: 'Non-Compliant',
      evidence: 'Draft policy awaiting CISO approval',
      updatedBy: 'Super Admin',
    },
    {
      orgId,
      id: 'CC7.2',
      name: 'Monitor system activity',
      framework,
      description: 'Continuously monitor production infrastructure and alert on anomalous access or configuration changes.',
      status: 'Compliant',
      evidence: 'Centralized audit logs retained for 90+ days with alerting',
      updatedBy: 'Super Admin',
    },
    {
      orgId,
      id: 'A1.2',
      name: 'Back up critical data',
      framework,
      description: 'Perform automated encrypted backups daily and test restoration procedures periodically.',
      status: 'Compliant',
      evidence: 'Automated daily snapshots verified',
      updatedBy: 'Super Admin',
    },
  ];
}

// Seed default users, demo organizations & demo starter data
async function seedInitialData() {
  try {
    const defaultUsers = [
      {
        name: 'Ganesh Kumar',
        email: 'ganesh@complianceguard.app',
        password: 'Pass@123',
        role: 'Super Admin',
      },
      {
        name: 'Kamari Ganesh',
        email: 'kammariganesh777@gmail.com',
        password: 'Pass@123',
        role: 'Super Admin',
      },
      {
        name: 'Admin Lead',
        email: 'admin@complianceguard.io',
        password: 'Admin@123',
        role: 'Super Admin',
      },
      {
        name: 'Security Auditor',
        email: 'auditor@complianceguard.io',
        password: 'Audit@123',
        role: 'Auditor',
      },
      {
        name: 'Compliance Analyst',
        email: 'analyst@complianceguard.io',
        password: 'Edit@123',
        role: 'Editor',
      },
    ];

    for (const u of defaultUsers) {
      await User.updateOne(
        { email: u.email.toLowerCase() },
        { $setOnInsert: u },
        { upsert: true }
      );
    }

    // Backfill ownerEmail on legacy demo orgs if missing
    await Organization.updateMany(
      { id: { $in: ['ORG-101', 'ORG-102'] }, ownerEmail: { $exists: false } },
      { $set: { ownerEmail: DEMO_OWNER_EMAIL } }
    );

    const orgCount = await Organization.countDocuments();
    if (orgCount === 0) {
      await Organization.insertMany([
        {
          id: 'ORG-101',
          name: 'Acme Inc.',
          email: 'security@acmeinc.io',
          ownerEmail: DEMO_OWNER_EMAIL,
          industry: 'FinTech & Cloud',
          framework: 'SOC 2',
          cloud: 'AWS',
          status: 'Active',
        },
        {
          id: 'ORG-102',
          name: 'DataPulse Systems',
          email: 'grc@datapulse.dev',
          ownerEmail: DEMO_OWNER_EMAIL,
          industry: 'SaaS / AI',
          framework: 'ISO 27001',
          cloud: 'Azure',
          status: 'In Review',
        },
      ]);

      await Member.insertMany([
        { orgId: 'ORG-101', name: 'Ganesh Kumar', email: 'ganesh@complianceguard.app', role: 'Super Admin', status: 'Active' },
        { orgId: 'ORG-101', name: 'Kamari Ganesh', email: 'kammariganesh777@gmail.com', role: 'Super Admin', status: 'Active' },
        { orgId: 'ORG-101', name: 'Admin Lead', email: 'admin@complianceguard.io', role: 'Super Admin', status: 'Active' },
        { orgId: 'ORG-101', name: 'Security Auditor', email: 'auditor@complianceguard.io', role: 'Auditor', status: 'Active' },
        { orgId: 'ORG-101', name: 'Compliance Analyst', email: 'analyst@complianceguard.io', role: 'Editor', status: 'Active' },
        { orgId: 'ORG-102', name: 'Ganesh Kumar', email: 'ganesh@complianceguard.app', role: 'Super Admin', status: 'Active' },
        { orgId: 'ORG-102', name: 'DataPulse Admin', email: 'admin@datapulse.dev', role: 'Super Admin', status: 'Active' },
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
      console.log('Seeded demo users, isolated demo organizations, members, and starter controls!');
    }
  } catch (err) {
    console.log('Seed check error:', err.message);
  }
}

// ==========================================
// AUTH ROUTES (SIGN UP, LOGIN, OTP RESET)
// ==========================================
app.post('/api/signup', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();
    const role = req.body.role || 'Super Admin';

    if (!name) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email like name@domain.com' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered. Please Sign In.' });
    }

    const newUser = await User.create({ name, email, password, role });
    return res.status(201).json({
      user: { name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = (req.body.password || '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid email like name@domain.com' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({
      user: {
        name: user.name,
        email: user.email,
        role: req.body.role || user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Enter a valid registered email (e.g. name@domain.com).' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    const mailResult = await sendOtpEmail(email, otp);
    if (!mailResult.sent) {
      return res.status(503).json({
        error: mailResult.reason || 'Email service is not configured on Render.',
      });
    }

    return res.json({
      message: '6-digit OTP sent to your email. Check Inbox or Spam.',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/forgot-password/verify-reset', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = (req.body.otp || '').trim();
    const newPassword = (req.body.newPassword || '').trim();

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }
    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: 'Enter the 6-digit OTP.' });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: 'New password must be at least 4 characters.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }
    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(401).json({ error: 'Invalid OTP. Please check your email and try again.' });
    }
    if (Date.now() > user.resetOtpExpires) {
      return res.status(401).json({ error: 'OTP expired. Request a new OTP.' });
    }

    user.password = newPassword;
    user.resetOtp = '';
    user.resetOtpExpires = 0;
    await user.save();

    return res.json({ message: 'Password reset successful! Please Sign In with your new password.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ORGANIZATION ROUTES (USER-WISE ISOLATED)
// ==========================================
app.get('/api/organizations', async (req, res) => {
  try {
    const userEmail = (req.query.email || req.query.ownerEmail || '').trim().toLowerCase();

    // Strict isolation: if no email is passed, return empty array instead of leaking all orgs
    if (!userEmail) {
      return res.json([]);
    }

    // Include organizations where user is owner OR an invited team member
    const memberRecords = await Member.find({ email: userEmail });
    const memberOrgIds = memberRecords.map((m) => m.orgId);

    const orgs = await Organization.find({
      $or: [
        { ownerEmail: userEmail },
        { email: userEmail },
        { id: { $in: memberOrgIds } },
      ],
    }).sort({ createdAt: -1 });

    res.json(orgs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/organizations', async (req, res) => {
  try {
    const {
      name,
      email,
      contactEmail,
      ownerEmail,
      ownerName,
      industry = 'SaaS / Technology',
      framework = 'SOC 2',
      cloud = 'AWS',
      cloudEnvironment,
      companySize = '1-50 Employees',
      targetTimeline = 'Within 3 Months',
      seedControls = false, // False by default so new commercial companies start at 0% empty controls
    } = req.body;

    const normalizedOwner = (ownerEmail || email || contactEmail || '').trim().toLowerCase();
    const finalEmail = (email || contactEmail || normalizedOwner || '').trim().toLowerCase();

    if (!name || !finalEmail) {
      return res.status(400).json({ error: 'Organization name and email are required' });
    }

    const orgId = `ORG-${Date.now().toString().slice(-6)}`;

    const newOrg = await Organization.create({
      id: orgId,
      name: name.trim(),
      email: finalEmail,
      ownerEmail: normalizedOwner || finalEmail,
      industry,
      framework,
      cloud: cloudEnvironment || cloud,
      companySize,
      targetTimeline,
      status: 'Active',
    });

    const createdControls = seedControls
      ? await Control.insertMany(buildStarterControls(orgId, framework))
      : [];

    const createdMember = await Member.create({
      orgId,
      name: (ownerName || `${name.trim()} Admin`).trim(),
      email: normalizedOwner || finalEmail,
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
    const orgFilter = req.query.orgId || req.query.organizationId;
    if (!orgFilter) return res.json([]);
    const members = await Member.find({ orgId: orgFilter }).sort({ createdAt: 1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const newMember = await Member.create({
      ...req.body,
      email: (req.body.email || '').trim().toLowerCase(),
      orgId: req.body.orgId || req.body.organizationId,
    });
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
    const orgFilter = req.query.orgId || req.query.organizationId;
    if (!orgFilter) return res.json([]);
    const controls = await Control.find({ orgId: orgFilter }).sort({ createdAt: -1 });
    res.json(controls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/controls', async (req, res) => {
  try {
    const newControl = new Control({
      ...req.body,
      orgId: req.body.orgId || req.body.organizationId,
      id: req.body.id || req.body.code || `CC${Math.floor(1 + Math.random() * 9)}.${Math.floor(1 + Math.random() * 9)}`,
      name: req.body.name || req.body.title,
    });
    const savedControl = await newControl.save();
    res.json(savedControl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/controls/:id', async (req, res) => {
  try {
    const updateFields = {};
    if (req.body.status !== undefined) updateFields.status = req.body.status;
    if (req.body.evidence !== undefined) updateFields.evidence = req.body.evidence;
    if (req.body.evidenceNote !== undefined) updateFields.evidence = req.body.evidenceNote;
    if (req.body.updatedBy !== undefined) updateFields.updatedBy = req.body.updatedBy;

    const updated = await Control.findByIdAndUpdate(
      req.params.id,
      updateFields,
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