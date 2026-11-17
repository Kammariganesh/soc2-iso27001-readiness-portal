const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Control = require('./control');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.log('MongoDB Connection Error: ', err));

// 1. GET: Fetch all controls
app.get('/api/controls', async (req, res) => {
  try {
    const controls = await Control.find();
    res.json(controls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST: Save a new control
app.post('/api/controls', async (req, res) => {
  try {
    const newControl = new Control(req.body);
    const savedControl = await newControl.save();
    res.status(201).json(savedControl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. PUT: Update a control's status
app.put('/api/controls/:id', async (req, res) => {
  try {
    const updatedControl = await Control.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(updatedControl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE: Remove a control
app.delete('/api/controls/:id', async (req, res) => {
  try {
    await Control.findByIdAndDelete(req.params.id);
    res.json({ message: 'Control deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('SOC 2 & ISO 27001 Readiness API is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});