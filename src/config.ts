// API Configuration
// 
// For GitHub Pages: Set your deployed backend URL here so everyone uses the same API
// Example: 'https://your-app.railway.app/api' or 'https://your-app.onrender.com/api'
//
// For local development: Use environment variable VITE_API_URL or it defaults to localhost

// IMPORTANT: Replace this with your actual deployed backend URL!
// This URL will be used by ALL users when they visit your GitHub Pages site
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  'https://random-champ-backend.onrender.com/api'; // ⚠️ CHANGE THIS to your deployed backend URL

// For local development, you can temporarily override:
// export const API_BASE_URL = 'http://localhost:3001/api';

