# Copilot Instructions for OpenWork React App

## Overview
OpenWork is a **React + Vite** web app using **TypeScript** and **smart contracts** for blockchain features.  
Designed for **speed**, **scalability**, and **maintainability**.

## Structure
- **`src/`** – Main code  
  - `components/` – Reusable UI  
  - `pages/` – App views  
  - `functions/` – Hooks & utilities  
  - `ABIs/` – Smart contract JSONs  
- **`contracts/`** – Solidity contracts  
- **`public/`** – Assets  
- **`vite.config.js`**, **`tsconfig.json`**

## Architecture
- Modular, component-based design  
- Smart contract integration via ABIs  
- Local or Context API state management  

## Commands
```bash
npm run dev     # Start dev server
npm run build   # Production build

---
description: Figma MCP server rules
globs:
alwaysApply: true
---
  - The Figma MCP Server provides an assets endpoint which can serve image and SVG assets
  - IMPORTANT: If the Figma MCP Server returns a localhost source for an image or an SVG, use that image or SVG source directly
  - IMPORTANT: DO NOT import/add new icon packages, all the assets should be in the Figma payload
  - IMPORTANT: do NOT use or create placeholders if a localhost source is provided

  **Important**: Do not use local host links download the image to public/ and reference them locally.
  - always get meta data from figma for a reference 
  - always match the style (size, color, etc) from figma