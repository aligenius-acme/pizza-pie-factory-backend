# Pizza Pie Factory — Backend 🍕

A Node.js REST API and WebSocket server for the Pizza Pie Factory ordering platform, handling authentication, order management, image uploads, email/SMS notifications, and payment processing.

**Deployed at:** https://pizza-pie-factory-backend.vercel.app  
**Frontend:** https://github.com/aligenius-acme/pizza-pie-factory-frontend

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [WebSocket](#websocket)
- [Deployment](#deployment)

---

## Overview

Pizza Pie Factory Backend is a Node.js/Express server deployed as serverless functions on Vercel. It provides the REST API consumed by the React frontend and maintains a WebSocket connection for real-time order status updates. It integrates with SendGrid for transactional email, Twilio for OTP SMS, Cloudinary for image storage, and the ADCB payment gateway for UAE-based payments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Auth | JWT + Encryption |
| Real-time | WebSocket |
| Email | SendGrid |
| SMS / OTP | Twilio |
| Image Storage | Cloudinary |
| Payment | ADCB Payment Gateway |
| Deployment | Vercel (Serverless) |

---

## Features

- 🔐 **JWT Authentication** — signed tokens with configurable expiry (`JWT_EXPIRY=12h`)
- 🔒 **Payload Encryption** — sensitive data encrypted at rest using `ENCRYPTION_KEY`
- 📱 **OTP via SMS** — one-time passwords delivered via Twilio
- 📧 **Transactional Email** — order confirmations and password resets via SendGrid
- 🖼️ **Image Uploads** — product and user images stored on Cloudinary
- 💳 **ADCB Payments** — UAE payment gateway integration with callback handling
- 🔄 **Real-time Orders** — WebSocket server pushes live order status updates to the frontend
- 🔑 **Password Reset** — time-limited reset tokens (1 hour expiry)
- 🌐 **Google / Apple / Facebook OAuth** — social login (configured but optional)

---

## Project Structure

```
pizza-pie-factory-backend/
├── api/                    # Vercel serverless function entry points
├── src/
│   ├── controllers/        # Route handler logic
│   ├── middleware/         # Auth, error handling, upload middleware
│   ├── models/             # Database models / schemas
│   ├── routes/             # Express route definitions
│   ├── services/           # SendGrid, Twilio, Cloudinary, payment services
│   ├── utils/              # JWT, encryption, token helpers
│   └── websocket/          # WebSocket server setup
├── .env.example            # Environment variable template
├── .gitignore
├── vercel.json             # Vercel deployment configuration
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm
- Accounts for: SendGrid, Twilio, Cloudinary, ADCB (for payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/aligenius-acme/pizza-pie-factory-backend.git
cd pizza-pie-factory-backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

Fill in all values in `.env` (see [Environment Variables](#environment-variables)), then:

```bash
npm run dev
```

The API will be available at `http://localhost:5000/api`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. **Never commit `.env` to git.**

```env
# JWT & Encryption
JWT_SECRET=your_jwt_secret_min_64_chars_hex
ENCRYPTION_KEY=your_encryption_key_min_64_chars_hex
JWT_EXPIRY="12h"

# App URLs
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"

# SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDER_EMAIL=your_sender@yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=ACyour_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
API_ENVIRONMENT_VARIABLE=CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name

# ADCB Payment Gateway
ADCB_MERCHANT_ID=your_merchant_id
ADCB_API_KEY=your_api_key
ADCB_PAYMENT_GATEWAY_URL=https://adcb-payment-gateway.com
ADCB_RETURN_URL=https://your-backend-url.com/api/payment/callback

# Token Expiry
PASSWORD_RESET_TOKEN_EXPIRY=3600000

# Google OAuth (optional)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple OAuth (optional)
# APPLE_CLIENT_ID=your_apple_client_id
# APPLE_TEAM_ID=your_apple_team_id
# APPLE_KEY_ID=your_apple_key_id
# APPLE_PRIVATE_KEY="your_apple_private_key"

# Facebook OAuth (optional)
# FACEBOOK_CLIENT_ID=your_facebook_client_id
# FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

### Generating secrets

```bash
# Generate JWT_SECRET and ENCRYPTION_KEY
openssl rand -hex 64
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| POST | `/api/auth/send-otp` | Send OTP via SMS (Twilio) |
| POST | `/api/auth/verify-otp` | Verify OTP and return token |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Menu / Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product (admin) |
| PUT | `/api/products/:id` | Update product (admin) |
| DELETE | `/api/products/:id` | Delete product (admin) |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | Get user orders |
| POST | `/api/orders` | Place a new order |
| GET | `/api/orders/:id` | Get order details |
| PUT | `/api/orders/:id/status` | Update order status (admin) |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payment/initiate` | Initiate ADCB payment |
| POST | `/api/payment/callback` | ADCB payment callback webhook |

### Uploads

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload image to Cloudinary |

---

## WebSocket

The server maintains a WebSocket connection at the same base URL (`BACKEND_URL`). The frontend connects via `REACT_APP_WS_URL` for real-time order status updates.

Events pushed from server to client:

| Event | Payload | Description |
|-------|---------|-------------|
| `order:updated` | `{ orderId, status }` | Order status changed |
| `order:confirmed` | `{ orderId }` | Order confirmed by kitchen |
| `order:ready` | `{ orderId }` | Order ready for pickup/delivery |

---

## Deployment

The backend is deployed as serverless functions on **Vercel**.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set all environment variables from `.env` in the Vercel project under **Settings → Environment Variables**.

> Note: WebSocket support on Vercel serverless has limitations. For production real-time features, consider deploying to a persistent server (Railway, Render, or a VPS) instead.

---

## Related Repositories

| Repo | Description |
|---|---|
| [`pizza-pie-factory-frontend`](https://github.com/aligenius-acme/pizza-pie-factory-frontend) | React frontend — CRA, Tailwind CSS, WebSocket client |

---

## License

Private repository. All rights reserved by [aligenius-acme](https://github.com/aligenius-acme).
