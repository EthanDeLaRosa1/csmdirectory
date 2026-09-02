# CSM Resource Guide

Build a modern, highly interactive, production-ready web application called 'CSM Internal Directory: Who to Go to for What' based on the attached 9-department Markdown dataset.

Key UI/UX Specifications:

Header & Navigation:

App Title: "CSM Internal Escalation & Resource Directory"

Owners: [Your Name] & Atravian | Target Date: August 15, 2026



Top Search Bar: Live full-text search across all departments, triggers, contact methods, and escalation tiers.

Category Tabs / Sidebar:

Customer Support[cite: 8]

TAM[cite: 7]

Professional Services[cite: 4]

Infrastructure (Red Warning Badge: Internal Only)

[cite: 2]

Product Management[cite: 3]

Sales / AE[cite: 5]

Finance / Billing[cite: 9]

Security / InfoSec[cite: 6]

Legal / Contracts[cite: 10]

Department Cards Layout:

Critical Rule Banner: Prominent alert box at top of each department view for warnings (e.g., "Infrastructure is NOT customer-facing" or "TAM is contract-dependent").

Grid View (Triggers vs Out-of-Scope): Side-by-side comparative table showing "When to Use" vs "Where to Go Instead".

SLA & Priority Matrix: Interactive table for Customer Support SLAs (P1–P4) with coverage indicators[cite: 8].

Interactive Escalation Stepper: 3-Tier vertical stepper component (Level 1 $\rightarrow$ Level 2 $\rightarrow$ Level 3) displaying contacts, escalation triggers, and CDR duties.

Verification Mode (Placeholder Tracker):

Toggle switch: "Show Unverified Placeholders ([CONFIRM]) Only".

Highlight missing POC names, email aliases, or dead links in yellow pill badges so team reviewers can audit unverified data fast[cite: 1].

Aesthetic & Theme:

Enterprise SaaS aesthetic (Linear / Vercel dark mode / light mode toggle).

Built with React, Tailwind CSS, Lucide icons, and Shadcn UI components."

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://csmdirectory.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e92e1610-a64d-49bb-aa69-1ffbe0e5c0a5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
