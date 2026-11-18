const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://<username>:<password>@cluster.mongodb.net/soc2db?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch((err) => console.log('MongoDB Connection Error:', err));

// Schema & Model
// Schema & Model
const controlSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  framework: { type: String, default: 'SOC 2' },
  status: { type: String, default: 'In Progress' }
}, { strict: false }); // <--- ఈ strict: false యాడ్ చేయి

const Control = mongoose.model('Control', controlSchema);

// Routes
// 1. Get all controls
app.get('/api/controls', async (req, res) => {
  try {
    const controls = await Control.find();
    res.json(controls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add control
app.post('/api/controls', async (req, res) => {
  try {
    const newControl = new Control(req.body);
    const savedControl = await newControl.save();
    res.json(savedControl);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. Update status
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

// 4. Delete control
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