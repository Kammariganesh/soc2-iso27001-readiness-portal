const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'complianceguard';

let db;

// Min 6 chars, >=1 uppercase, >=1 lowercase, >=1 special char; numbers allowed
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[^A-Za-z0-9]).{6,}$/;

function validatePassword(pw) {
  if (typeof pw !== 'string' || !PASSWORD_REGEX.test(pw)) {
    return 'Password must be at least 6 characters with 1 uppercase letter, lowercase letters, and 1 special character (numbers allowed).';
  }
  return null;
}

async function sendOtpEmail(toEmail, otpCode) {
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const senderEmail = (
    process.env.BREVO_SENDER_EMAIL ||
    process.env.EMAIL_USER ||
    'kammariganesh777@gmail.com'
  ).trim();

  if (!brevoKey) {
    throw new Error('BREVO_API_KEY is missing in Render Environment.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'ComplianceGuard',
          email: senderEmail,
        },
        to: [{ email: toEmail }],
        subject: 'ComplianceGuard Password Reset OTP',
        textContent: `Your OTP to reset your ComplianceGuard password is: ${otpCode}. It expires in 10 minutes.`,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Brevo API error (${response.status}): ${JSON.stringify(data)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', dbConnected: Boolean(db) });
});

app.post('/api/login', async (req, res) => {
  try {
    const cleanEmail = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';
    const requestedRole = req.body?.role;

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await db.collection('users').findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        error: 'This email is not registered, so please register.',
      });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name || cleanEmail.split('@')[0],
        email: user.email,
        role: requestedRole || user.role || 'Super Admin',
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed on server.' });
  }
});

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const existing = await db.collection('users').findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        error: 'This email is already registered. Please sign in.',
      });
    }

    const newUser = {
      name: cleanName || cleanEmail.split('@')[0],
      email: cleanEmail,
      password,
      role: role || 'Super Admin',
      createdAt: new Date(),
    };

    const result = await db.collection('users').insertOne(newUser);
    return res.status(201).json({
      user: {
        id: result.insertedId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Signup failed on server.' });
  }
});

app.post('/api/forgot-password/send-otp', async (req, res) => {
  try {
    const cleanEmail = (req.body?.email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Please enter an email address.' });
    }

    const registeredUser = await db.collection('users').findOne({ email: cleanEmail });
    if (!registeredUser) {
      return res.status(404).json({
        error: 'This email is not registered, so please register.',
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.collection('password_otps').updateOne(
      { email: cleanEmail },
      { $set: { email: cleanEmail, otp, expiresAt, createdAt: new Date() } },
      { upsert: true }
    );

    await sendOtpEmail(cleanEmail, otp);
    return res.json({
      message: `OTP sent to ${cleanEmail}. Check Inbox or Spam.`,
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    return res.status(400).json({
      error: err.message || 'Failed to send OTP.',
    });
  }
});

app.post('/api/forgot-password/verify-reset', async (req, res) => {
  try {
    const cleanEmail = (req.body?.email || '').trim().toLowerCase();
    const cleanOtp = (req.body?.otp || '').trim();
    const newPassword = req.body?.newPassword || '';

    if (!cleanEmail || !cleanOtp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required.' });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ error: pwError });
    }

    const record = await db.collection('password_otps').findOne({ email: cleanEmail });
    if (!record || record.otp !== cleanOtp || new Date() > new Date(record.expiresAt)) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    await db.collection('users').updateOne(
      { email: cleanEmail },
      { $set: { password: newPassword, updatedAt: new Date() } }
    );
    await db.collection('password_otps').deleteOne({ email: cleanEmail });

    return res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('Verify reset error:', err);
    return res.status(500).json({ error: 'Could not reset password.' });
  }
});

app.get('/api/organizations', async (req, res) => {
  try {
    const email = (req.query?.email || '').trim().toLowerCase();
    if (!email) {
      return res.json([]);
    }

    const orgs = await db
      .collection('organizations')
      .find({
        $or: [{ ownerEmail: email }, { email }],
      })
      .sort({ _id: -1 })
      .toArray();

    return res.json(orgs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch organizations.' });
  }
});

app.post('/api/organizations', async (req, res) => {
  try {
    const body = req.body || {};
    const name = (body.name || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const ownerEmail = (body.ownerEmail || email).trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ error: 'Company name is required.' });
    }

    const newOrg = {
      name,
      email,
      ownerEmail,
      ownerName: (body.ownerName || `${name} Admin`).trim(),
      industry: body.industry || 'SaaS / Technology',
      companySize: body.companySize || '1-50 Employees',
      framework: body.framework || 'SOC 2',
      cloud: body.cloud || 'AWS',
      createdAt: new Date(),
    };

    const result = await db.collection('organizations').insertOne(newOrg);
    return res.status(201).json({
      organization: { ...newOrg, _id: result.insertedId, id: String(result.insertedId) },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create organization.' });
  }
});

app.get('/api/controls', async (req, res) => {
  try {
    const orgId = (req.query?.orgId || '').trim();
    const filter = orgId ? { orgId } : {};
    const list = await db.collection('controls').find(filter).sort({ _id: -1 }).toArray();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch controls.' });
  }
});

app.post('/api/controls', async (req, res) => {
  try {
    const body = req.body || {};
    const doc = {
      id: (body.id || body.code || '').trim().toUpperCase(),
      code: (body.code || body.id || '').trim().toUpperCase(),
      name: (body.name || body.title || '').trim(),
      title: (body.title || body.name || '').trim(),
      description: (body.description || '').trim(),
      framework: body.framework || 'SOC 2',
      status: body.status || 'In Progress',
      evidence: (body.evidence || body.evidenceNote || '').trim(),
      evidenceNote: (body.evidenceNote || body.evidence || '').trim(),
      orgId: body.orgId || '',
      updatedBy: body.updatedBy || 'Alex Morgan',
      createdAt: new Date(),
    };

    const result = await db.collection('controls').insertOne(doc);
    return res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add control.' });
  }
});

app.put('/api/controls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;

    const query = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { id }] }
      : { id };

    await db.collection('controls').updateOne(query, { $set: updates });
    return res.json({ ok: true, id, updates });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update control.' });
  }
});

app.delete('/api/controls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = ObjectId.isValid(id)
      ? { $or: [{ _id: new ObjectId(id) }, { id }] }
      : { id };

    await db.collection('controls').deleteOne(query);
    return res.json({ ok: true, id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete control.' });
  }
});

app.get('/api/members', async (req, res) => {
  try {
    const orgId = (req.query?.orgId || '').trim();
    const filter = orgId ? { orgId } : {};
    const list = await db.collection('members').find(filter).sort({ _id: -1 }).toArray();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch members.' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const body = req.body || {};
    const doc = {
      name: (body.name || '').trim(),
      email: (body.email || '').trim().toLowerCase(),
      role: body.role || 'Editor',
      orgId: body.orgId || '',
      createdAt: new Date(),
    };
    const result = await db.collection('members').insertOne(doc);
    return res.status(201).json({ ...doc, _id: result.insertedId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add member.' });
  }
});

MongoClient.connect(MONGO_URI)
  .then(async (client) => {
    db = client.db(DB_NAME);
    await db.collection('password_otps').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    console.log('MongoDB Connected Successfully!');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });