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
- 2025-01-19: Project initialized with PostgreSQL database
- 2025-01-19: Started building foundation structure

## User Preferences
- Focus on authentic data integration
- Prioritize security and compliance
- Maintain professional communication