# Centrika Neobank - Rwanda's First 100% Mobile Neobank

Centrika is a comprehensive mobile banking platform built specifically for Rwanda, featuring mobile money integration, virtual cards, P2P transfers, and full regulatory compliance with Bank of Rwanda (BNR) requirements.

## 🌍 Project Overview

- **Vision**: First 100% mobile neobank in Rwanda
- **Target Users**: Urban residents, micro-merchants, remittance senders/receivers
- **Core Features**: KYC verification, MoMo integration, P2P transfers, QR payments, virtual cards
- **Compliance**: BNR Tier II limits (1M RWF per transaction, 2M RWF balance limit)
- **Languages**: Bilingual support (English/French)

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based with role-based access
- **Payment Rails**: MoMo Rwanda integration, UnionPay virtual cards
- **KYC**: AWS Textract + Rekognition with manual review fallback
- **Compliance**: Automated BNR J+1 reporting

### Mobile App (React Native + Expo)
- **Framework**: Expo managed workflow
- **Navigation**: React Navigation v6
- **Styling**: Custom theme system with Centrika branding
- **Features**: Camera-based KYC, QR scanning, biometric auth
- **Offline**: AsyncStorage for local data persistence

### Back-office (Next.js)
- **Framework**: Next.js with TypeScript
- **UI Library**: Chakra UI for accessibility
- **Features**: User management, KYC review, metrics dashboard, audit trail
- **Auth**: JWT-based admin authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- AWS account (for S3, Textract, Rekognition)
- Expo CLI for mobile development

### Environment Variables

Create `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/centrika"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key"

# AWS Services
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
S3_BUCKET_NAME="centrika-kyc-documents"

# Firebase (for notifications)
FIREBASE_PROJECT_ID="centrika-rwanda"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@centrika-rwanda.iam.gserviceaccount.com"

# MoMo API (MTN Rwanda)
MOMO_API_URL="https://sandbox.momodeveloper.mtn.com"
MOMO_COLLECTION_USER_ID="your-collection-user-id"
MOMO_COLLECTION_API_KEY="your-collection-api-key"
MOMO_DISBURSEMENT_USER_ID="your-disbursement-user-id"
MOMO_DISBURSEMENT_API_KEY="your-disbursement-api-key"

# Card Encryption
CARD_ENCRYPTION_KEY="centrika-card-key-32-characters!"

# URLs
FRONTEND_URL="http://localhost:5000"
API_URL="http://localhost:8000/api"
