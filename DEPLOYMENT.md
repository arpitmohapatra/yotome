# GitHub Pages Deployment Setup

This document outlines the setup for deploying the Yotome frontend to GitHub Pages at `arpitmohapatra.github.io/yotome`.

## Changes Made

### 1. Vite Configuration (`frontend/vite.config.ts`)
- Added `base: '/yotome/'` for production builds to ensure proper asset paths
- This ensures all assets (CSS, JS, images) are loaded with the correct GitHub Pages subdirectory path

### 2. Package.json Scripts (`frontend/package.json`)
- Added `build:gh-pages` script that explicitly sets `NODE_ENV=production`
- Added `preview:gh-pages` script for local testing with production settings

### 3. GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- Automated deployment workflow that triggers on:
  - Push to `main` branch (when frontend files change)
  - Manual workflow dispatch
- Workflow steps:
  - Installs Node.js dependencies
  - Runs type checking and linting
  - Builds the application with production settings
  - Deploys to GitHub Pages

### 4. Static Assets Configuration
- Added `.nojekyll` file in `public/` directory to prevent Jekyll processing
- This ensures Vite-generated files (including those starting with `_`) are served correctly

## Repository Setup Required

To complete the deployment setup, you need to:

1. **Push these changes to your GitHub repository** at `https://github.com/arpitmohapatra/yotome`

2. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"
   - The workflow will automatically deploy when you push to main

3. **Repository Permissions** (if needed):
   - Ensure the repository has the necessary permissions for GitHub Actions
   - The workflow uses `GITHUB_TOKEN` which should be automatically available

## Local Testing

To test the GitHub Pages build locally:

```bash
cd frontend
npm run build:gh-pages
npm run preview:gh-pages
```

Then visit `http://localhost:4173/yotome/` to see how it will appear on GitHub Pages.

## Deployment Process

1. Push changes to the `main` branch
2. GitHub Actions will automatically:
   - Build the frontend application
   - Deploy to GitHub Pages
3. Your site will be available at `https://arpitmohapatra.github.io/yotome/`

## Important Notes

- The application will be available at the `/yotome/` subpath
- All internal routing and asset loading accounts for this base path
- The workflow only triggers when frontend files are changed to avoid unnecessary deployments
- Local development continues to work normally at the root path (`/`)
