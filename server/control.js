const mongoose = require('mongoose');

const controlSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  framework: { type: String, required: true },
  status: { type: String, required: true },
});

module.exports = mongoose.model('Control', controlSchema);