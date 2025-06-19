# Centrika Neobank - Rwanda Mobile Banking Platform

## Project Overview
A comprehensive mobile neobank application for Rwanda featuring:
- React Native frontend with bilingual support (French/English)
- Node.js backend with micro-ledger architecture
- PostgreSQL database for data persistence
- Self-service KYC with ML-powered verification
- MoMo integration for deposits/withdrawals
- P2P transfers and QR payments
- UnionPay virtual card issuance
- Admin back-office for operations

## Target Users
- Urban residents in Rwanda
- Micro-merchants
- Remittance senders/receivers

## Technical Constraints
- OPEX budget: ≤ 5,000 USD/month
- BNR Tier II limits: 1M RWF single transaction, 1M RWF daily, 2M RWF balance
- Bilingual interface (French/English)
- Mobile-first design

## Project Architecture
- **Frontend**: React Native + Expo
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based
- **File Storage**: AWS S3 (encrypted)
- **KYC**: ML Kit + AWS Rekognition
- **Payments**: MoMo API integration
- **Admin Panel**: Next.js

## Development Phases
### Phase 0 - Clickable Demo (≤24h)
- Mobile prototype with mocked screens
- Local micro-ledger (JSON store)
- QR scan demo
- Design tokens from centrika.rw
- Demo script

### Phase 1 - MVP Sandbox (1 day)
- Full self-KYC flow
- MoMo deposit/withdrawal
- P2P transfers
- UnionPay virtual cards
- QR scan-to-pay
- Back-office admin console
- Push notifications
- BNR reporting
- CI/CD pipeline

## Recent Changes
- 2025-06-19: All three components successfully started and operational
- 2025-06-19: Backend API server running on port 8002 with complete endpoints
- 2025-06-19: Admin dashboard running on port 3000 with Next.js
- 2025-06-19: Mobile app running on port 8081 with Expo development server
- 2025-06-19: PostgreSQL database configured with complete schema
- 2025-06-19: Simplified route implementations to resolve Express middleware issues
- 2025-06-19: Built comprehensive back-office system with agent network management
- 2025-06-19: Implemented cash management with nostro accounts and reconciliation
- 2025-06-19: Created micro-ledger with double-entry bookkeeping system
- 2025-06-19: Added 9 new database tables for complete financial operations
- 2025-06-19: DEPLOYMENT READY - All critical deployment issues resolved:
  - Fixed entry point mismatch: deploy script now uses production.js (not index.js)
  - Added cross-env for cross-platform environment variable compatibility
  - Dynamic PORT handling: updated to use process.env.PORT || 8002
  - Optimized health check: moved / endpoint before middleware for instant response
  - Backend-only deployment strategy (excludes mobile/backoffice from deployment)
  - KYC wallet limits: Added kyc_level field to wallets table for transaction limits
  - Created KYC limits configuration with BNR Tier II compliance (4 tiers)
  - Added Procfile for proper web process configuration
  - Health check endpoints verified working at / and /health
  - Server tested and ready for Cloud Run deployment
- 2025-06-19: Port configuration updated - Backend moved to port 8000 for production deployment
- 2025-06-19: Vercel deployment configured - Created serverless API structure with /api directory
- 2025-06-19: External deployment setup - Railway, Vercel, and Docker configurations ready
- 2025-06-19: Supabase integration - Complete SQL schema for PostgreSQL deployment

## User Preferences
- Focus on authentic data integration
- Prioritize security and compliance
- Maintain professional communication