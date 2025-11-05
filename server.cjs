// Production server for Render deployment
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000; // Render uses 10000 by default

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing - return index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// CRITICAL: Bind to 0.0.0.0 for Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving static files from ${path.join(__dirname, 'dist')}`);
});