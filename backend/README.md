# ⚙️ PetPluse Backend API

Welcome to the backend infrastructure of PetPluse! This directory contains the highly scalable, secure Node.js & Express REST API that powers the entire PetPluse ecosystem.

## 🏗 Architecture Overview

The backend is structured using a robust multi-layered architecture:
- **Controllers** (`src/controllers/`): Business logic handling for users, products, services, and community posts.
- **Routes** (`src/routes/`): API endpoint definitions cleanly separated by domain.
- **Middlewares** (`src/middlewares/`): Advanced security checks including JWT validation, role-based access control (RBAC), and active SQL injection threat detection.
- **Config** (`src/config/`): Database connection pooling customized for optimal performance and limited connections to prevent database exhaustion.

## 🔒 Security Posture

We take security seriously:
- **100% Parameterized Queries**: All PostgreSQL interactions use parameterized bindings to completely neutralize first-order SQL injection vectors.
- **Stateless Authorization**: We utilize JSON Web Tokens (JWT) to securely authenticate and authorize requests without server-side session overhead.
- **Least Privilege**: Application connections are restricted to minimal required permissions.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- PostgreSQL v14+ (or a remote Supabase instance)

### Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Ensure you have an `.env` file in this directory with your `DATABASE_URL` and `JWT_SECRET`.

3. **Run the Server**
   ```bash
   # Development mode with hot-reloading
   npm run dev
   ```

## 🧪 Testing

We include a comprehensive E2E integration test suite and SQL injection penetration tests.
```bash
# Run End-to-End Tests
node tests/test_e2e.js

# Run SQLi Penetration Tests
node tests/test_sqli.js
```
