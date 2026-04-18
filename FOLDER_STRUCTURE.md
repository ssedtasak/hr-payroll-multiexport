# HR Payroll Multi-Export - Folder Structure

## Project Overview
Internal web app for HR to enter payroll once, export to Accounting and KBank formats.

## Architecture
Static frontend app (no backend) using the WATS framework.

```
hr-payroll-multiexport/
├── src/                      # Frontend source code
│   ├── components/            # UI components
│   ├── models/                # Canonical payroll data model
│   ├── engines/               # Calculation & validation engines
│   ├── templates/             # Export template renderers
│   ├── utils/                 # Utility functions
│   ├── main.js                # Entry point
│   └── App.js                 # Main app component
├── tools/                    # Python scripts (future automation)
├── workflows/                # Markdown SOPs (WATS framework)
├── skills/                   # Agent skills (symlinked)
├── public/                   # Static assets
├── .tmp/                     # Temporary files
├── index.html                 # Entry HTML
├── package.json               # Dependencies
└── spec.md                    # Full PRD
```

## Key Principles
1. **Single Entry** - HR enters payroll data once
2. **Multi Output** - Export to Accounting and KBank formats
3. **Template Isolation** - Export logic separated from data model
4. **Deterministic** - Same input = same output always

## Tech Stack
- Vanilla JS or lightweight framework
- ExcelJS for .xlsx generation
- Vite for bundling
- Static hosting (GitHub Pages / Cloudflare Pages)
