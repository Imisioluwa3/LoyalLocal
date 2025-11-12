/**
 * Configuration file for LoyalLocal
 *
 * This file demonstrates how to support both:
 * 1. Environment variables (Netlify, Vercel, etc.)
 * 2. Hardcoded values (GitHub Pages)
 *
 * To use this:
 * 1. Rename to 'config.js'
 * 2. Import in your script files: import { config } from './config.js'
 * 3. Use config.supabaseUrl and config.supabaseAnonKey
 */

// Check if we're in a build environment with env vars (Netlify, Vercel, etc.)
const hasEnvVars = typeof import.meta?.env !== 'undefined';

export const config = {
  // Supabase configuration
  supabaseUrl: hasEnvVars
    ? import.meta.env.VITE_SUPABASE_URL
    : 'https://mhwsjjumsiveahfckcwr.supabase.co',

  supabaseAnonKey: hasEnvVars
    ? import.meta.env.VITE_SUPABASE_ANON_KEY
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1od3NqanVtc2l2ZWFoZmNrY3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwMTc4MTQsImV4cCI6MjA2MzU5MzgxNH0.5varGB23DXpfi1adlwejmYwLlTbbjCPfKGDm9rWEQBo',

  // Supabase auth configuration
  supabaseAuthConfig: {
    persistSession: true,
    autoRefreshToken: true
  }
};

// For non-module environments (vanilla JS), also expose as global
if (typeof window !== 'undefined') {
  window.LoyalLocalConfig = config;
}

/**
 * Usage example in your scripts:
 *
 * // If using ES6 modules:
 * import { config } from './config.js';
 * const supabase = window.supabase.createClient(
 *   config.supabaseUrl,
 *   config.supabaseAnonKey,
 *   { auth: config.supabaseAuthConfig }
 * );
 *
 * // If using vanilla JS:
 * const supabase = window.supabase.createClient(
 *   window.LoyalLocalConfig.supabaseUrl,
 *   window.LoyalLocalConfig.supabaseAnonKey
 * );
 */
