# Google Sign-In Configuration Debug Guide

## Current Issue
Error: "invalid_audience: Audience is not a valid client ID"

## Root Cause
Mismatched Google Client IDs between app configuration and Supabase setup.

## Current Configuration (from .env)
- Web Client ID: `132449152942-hpoctk1anvm6pg03cge89opmcm85o3ci.apps.googleusercontent.com` (Project: 132449152942)
- iOS Client ID: `1063993481887-dc5u4v8ktj7c37acd6m97guj33faingm.apps.googleusercontent.com` (Project: 1063993481887)
- Android Client ID: `1063993481887-sg8s8chte064pdm43cd9jes8hi2aed56.apps.googleusercontent.com` (Project: 1063993481887)

## Problem
**All Client IDs should be from the same Google Cloud project, but Web uses project 132449152942 while iOS/Android use project 1063993481887.**

## Steps to Fix

### 1. Choose which Google Cloud project to use:
   - Either use project `132449152942` for all three
   - Or use project `1063993481887` for all three (recommended since iOS/Android already use this)

### 2. Update .env file:
   If using project `1063993481887` (recommended), get the correct Web Client ID from that project.

### 3. Update Supabase Settings:
   - Go to: https://hecpxuoxynuamcmzwulm.supabase.co/project/hecpxuoxynuamcmzwulm/auth/providers
   - Click on Google provider
   - Update "Authorized Client IDs" field with the **Web Client ID** from the chosen project

### 4. Verify Client IDs in Google Cloud Console:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Make sure you're in the correct project
   - Verify all three Client IDs exist and are properly configured

## Expected Result
After fixing the configuration, Google Sign-In should work without the "invalid_audience" error.

## Testing
Run the app and try Google Sign-In. The error logging has been improved to show which Client IDs are being used.