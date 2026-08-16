# Senior SDET & QA Job Search Monitor (v2.0)

Automated LinkedIn Job Search Monitor tailored specifically for **Ankita Agrawal** (Senior SDET / QA Lead / AI Test Automation / Validation Engineer with 11+ years of experience).

Unlike standard H1B monitors, this version searches **all US-authorized openings (no visa sponsorship requirement)** across **Remote (US)** and **Pittsburgh & Greater Area (Onsite/Hybrid/Local)**, identifies **Top 100 Tech/Enterprise Employers** and **Pittsburgh Regional Anchors**, runs automated **3-hour scraping cycles**, and provides direct **1-click Company Career Site links** and **personalized AI pitches**.

---

## Key Capabilities

1. **Dual-Track Scraping Engine**:
   - **🌐 Remote Track**: Scrapes all US remote openings matching Senior/Lead SDET and QA roles (`f_WT=2`).
   - **📍 Pittsburgh Local Track**: Scrapes Pittsburgh, Cranberry Twp, Monroeville, Greater Pittsburgh Area (Onsite, Hybrid, and Regional employers).
2. **Targeted Senior Profile Queries**:
   - Senior SDET & Lead SDET
   - Senior QA Automation Engineer & Quality Engineering Lead
   - AI Test Automation Engineer (Amazon Bedrock, Agentic AI, LLM evaluation)
   - Software Validation Engineer & Systems Validation
   - API Automation Engineer (REST Assured, Postman, GraphQL)
3. **Employer Intelligence & Match Scoring**:
   - **⭐ Top 100 Tech & Enterprise Filter**: FAANG/MAMAA, Cloud Leaders, Fortune 500 tech companies.
   - **📍 Pittsburgh Local Leaders Filter**: PNC Bank, Duolingo, Highmark Health, UPMC, Dick's Sporting Goods, Ansys, Carnegie Mellon / SEI, Aurora Innovation, Stack AV, Shield AI, Gecko Robotics, Philips Healthcare, Nutrien, Thermo Fisher, Motional, etc.
   - **Resume Skill Fit Badge**: Evaluates match score (%) against Ankita's core skillset (Playwright, WebdriverIO, Selenium, Java, TypeScript, Python, Bedrock, Appium, CI/CD Jenkins).
4. **Smart Direct Application Flow**:
   - **🚀 Apply on Company Site**: 1-click link to search and apply directly on the company's official career portal (Workday/Greenhouse/Lever/Google Requisition).
   - **View on LinkedIn**: Direct original LinkedIn job link.
   - **📝 1-Click Intro Pitch**: Generates a tailored 3-bullet introduction highlighting her 11+ years experience ready to paste into cover letter boxes or recruiter messages.
   - **Application Status Pipeline**: Track stages (`New`, `Viewed`, `Applied`, `Interviewing`, `Offer`, `Rejected`).
   - **Personal Notes & CSV Export**: Save recruiter details, interview notes, and export filtered lists to CSV.
5. **Automated 3-Hour Scraping & Email Alerts**:
   - Auto-scrapes every 3 hours (`0 */3 * * *`).
   - Sends beautiful light-themed HTML email digests of newly found jobs directly to `ankita.vinculum@gmail.com`.
   - On-demand instant **"Scan Now"** button on the dashboard.

---

## Quick Start

### 1. Requirements
- Node.js 18+ and npm

### 2. Installation & Launch
```bash
cd c:\Users\shubh\OneDrive\Documents\sdet-job-monitor
npm install
npm start
```

### 3. Access Dashboard
- **Web Dashboard**: [http://localhost:3001](http://localhost:3001)
- **API Status**: [http://localhost:3001/api/stats](http://localhost:3001/api/stats)

*(Runs on Port 3001 so it never collides with Port 3000)*

---

## Configuration (`.env`)

```dotenv
# Gmail sender credentials for notification digests
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password_here

# Direct recipients for job alerts (comma-separated)
NOTIFY_EMAIL=ankita.vinculum@gmail.com, your_email@gmail.com

# Server port
PORT=3001

# Scrape interval (every 3 hours)
CRON_SCHEDULE=0 */3 * * *

# Target search queries
JOB_TITLES=Senior SDET,Lead SDET,QA Automation Engineer,Senior Quality Assurance,QA Lead,Software Validation Engineer,AI Test Automation,API Test Engineer
```
