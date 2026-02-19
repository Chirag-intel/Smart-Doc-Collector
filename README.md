# Smart-Doc-Collector

A full-stack **Document Pendency Management System** for loan processing — built with Next.js 16 + React 19.

## ✨ Features

| Feature | Description |
|---|---|
| 📋 **Case Management** | Create cases, track document progress, manage workflows |
| 📨 **Multi-Channel Invites** | Send upload links via SMS, Email, WhatsApp simultaneously |
| 🔗 **DigiLocker Multi-Doc Fetch** | Fetch PAN + Aadhaar in a single DigiLocker journey |
| 🏦 **Account Aggregator** | Fetch bank statements directly from banks (RBI regulated) |
| 🤖 **ABC Assist Voice Bot** | Bilingual voice guidance (Hindi + English) on the upload portal |
| 🔍 **AI/OCR Validation** | Auto-validate uploaded documents with intelligent checks |
| ⚠️ **Manual Override** | Submit documents with remarks when validation fails |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
# → http://localhost:3000

# Production build
npm run build && npm start
```

## 📁 Project Structure

```
src/
├── app/
│   ├── page.js                     # Admin dashboard
│   ├── cases/new/page.js           # New case creation
│   ├── cases/[id]/page.js          # Case detail + invite management
│   ├── upload/[token]/page.js      # Customer upload portal
│   └── api/                        # REST API routes
├── components/
│   └── Sidebar.js                  # Navigation sidebar
└── lib/
    ├── store.js                    # Data store (singleton)
    └── ocr-validator.js            # Document validation logic
```

## 🏗️ Tech Stack

- **Framework:** Next.js 16 + React 19
- **Language:** JavaScript (ES2022+)
- **Voice:** Web Speech API (SpeechSynthesis)
- **Styling:** Vanilla CSS with custom dark design system

## 📸 Screenshots

### Customer Upload Portal with ABC Assist
The upload portal features a floating voice assistant and DigiLocker/Account Aggregator integration.

### DigiLocker Multi-Document Fetch
A single DigiLocker journey fetches all pending documents (PAN + Aadhaar) at once.

## ⚠️ Production Notes

This is a prototype. For production deployment:
- Replace in-memory store with a database (PostgreSQL/MongoDB)
- Integrate real SMS/Email/WhatsApp providers (Twilio, SendGrid)
- Connect real DigiLocker and Account Aggregator APIs
- Add authentication, file storage (S3/GCS), and rate limiting

## 📄 License

MIT
