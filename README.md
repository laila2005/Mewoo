<div align="center">
  <img src="./petpulse-web/src/assets/images/logoo.png" alt="PetPulse Logo" width="300" />
</div>

<h1 align="center">🐾 PetPulse (Mewoo)</h1>

<div align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg?cacheSeconds=2592000" alt="Version 2.0.0" />
  <img src="https://img.shields.io/badge/build-passing-brightgreen.svg" alt="Build Passing" />
  <img src="https://img.shields.io/badge/react-18.2.0-61dafb.svg?logo=react" alt="React 18.2.0" />
  <img src="https://img.shields.io/badge/node.js-v18%2B-green.svg?logo=nodedotjs" alt="Node.js v18+" />
  <img src="https://img.shields.io/badge/PostgreSQL-v14%2B-336791.svg?logo=postgresql" alt="PostgreSQL v14+" />
</div>

<p align="center">
  <strong>The Ultimate Ecosystem for Pet Owners, Veterinarians, Trainers, and Pet Shops</strong><br>
  <em>A Full-Stack Modern Web Application built for our Graduation Project</em>
</p>

---

## 📑 Table of Contents

- [📖 Abstract](#-abstract)
- [🚀 Key Features](#-key-features)
- [🛠️ Technology Stack](#-technology-stack)
- [🏗️ System Architecture](#-system-architecture)
- [🔒 Security Implementations](#-security-implementations)
- [🌐 REST API Endpoints](#-rest-api-endpoints)
- [🧪 Automated Testing](#-automated-testing)
- [⚙️ Getting Started (Local Development)](#️-getting-started-local-development)
- [🎓 Graduation Project Deliverable](#-graduation-project-deliverable)

---

## 📖 Abstract

**PetPulse (Mewoo)** is a comprehensive, AI-enhanced ecosystem designed to connect pet owners with verified local veterinarians, professional trainers, local pet shops, and an engaged community of pet lovers. By providing an integrated marketplace alongside health tracking, adoption boards, and social community features, PetPulse centralizes the fragmented pet care industry into one beautiful, secure, and intuitive platform. 

This project was built from the ground up to showcase advanced modern web development practices, focusing heavily on interactive user interfaces, scalable backend architecture, and defense-in-depth security methodologies.

---

## 🚀 Key Features

- **Integrated E-Commerce Marketplace**: Verified vendors (Pet Shops) can list products. Users can browse, filter, add to cart, and complete simulated transactions (Paymob integration).
- **Verified Professional Profiles**: Veterinarians, Trainers, and Vendors manage dynamic portfolios, accept reviews, and display verified qualifications subject to an Admin Approval Workflow.
- **Geocentered Booking Ecosystem**: Complete scheduling pipelines for booking local vet and training services with integrated Leaflet maps, featuring nearest-first ordering via client-side Haversine distance calculations.
- **Interactive Community Feed & Reactions**: A real-time social feed with custom hover-persistent emoji reaction overlays on comments, optimized to resolve viewport layout overlays.
- **Advanced Connections Subsystem**: A dedicated, safety-shielded connection engine displaying total connections for normal users, vets, and trainers, with automatic spam routing and connection-disabled profiles for businesses/vendors.
- **Lost & Found Alerts**: Geolocation alerts designed to aid in the swift recovery of lost pets through map coordinates and AI image matching.
- **Adaptive Mobile Chatbot (VetAI)**: An intelligent, floating agentic chatbot utilizing function calling to automate bookings, equipped with a `MutationObserver` that dynamically conceals the trigger on mobile viewports to prevent form obstruction.
- **High-Performance DB Safeguards**: Custom-tailored connection pooling configurations (`max: 5`) built to withstand Supabase connection limits and eliminate `EMAXCONNSESSION` overhead.
- **Defense-in-Depth Security**: Shielded against OWASP vulnerabilities, including strict parameterized SQL queries, active threat detection middleware, rate limiting, and stateless JWT authorization.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|-------|-----------|-------------|
| **Frontend** | React, Vite, TailwindCSS | High-performance Single Page Application (SPA) with a vibrant, fully responsive UI. |
| **Backend** | Node.js, Express.js | Highly scalable REST API serving robust data endpoints. |
| **Database** | PostgreSQL | Relational database handling complex joints and strict relational integrity. |
| **Authentication** | JWT, bcrypt | Stateless JWT Bearer tokens for secure, scalable session management. |
| **Integrations** | Cloudinary, Leaflet Maps | Secure media uploads and real-time mapping functionality. |
| **Testing** | Node.js (Axios) | Custom End-to-End integration test suite ensuring seamless workflows. |

---

## 🏗️ System Architecture

Our system uses a robust multi-layered architecture separating concerns effectively across the frontend, REST APIs, and database stores.

```mermaid
graph TD
    Client[React SPA Client] <-->|HTTP / REST| API[Express API Gateway]
    Client <-->|WebSocket| Socket[Real-Time Notifications]
    
    subgraph Backend Core
        API --> Auth[JWT Authentication]
        API --> Sec[SQLi / Security Middleware]
        Sec --> Controllers[Business Logic Controllers]
    end
    
    Controllers <--> |Parameterized Queries| DB[(PostgreSQL Database)]
    Controllers <--> |External API| Cloud[Cloudinary / Map Services]
```

### 📁 Monorepo Structure

```text
Mewoo/
├── .github/             # [SDLC] Academic Workflows (Graduation Deliverable & Bug templates)
├── .vscode/             # [IDE] Shared workspace configurations & settings
├── petpulse-web/        # [Frontend] React.js + Vite Application
│   ├── src/pages/       # UI Routes (Dashboard, Marketplace, Booking, Explore, Auth)
│   ├── src/components/  # Reusable UI elements (Navbar, BackButton, Modals, Forms)
│   └── src/context/     # React Context for global auth & state
│
├── backend/             # [Backend] Node.js Express REST API
│   ├── server.js        # Core bootstrap and middleware configuration
│   ├── src/config/      # PostgreSQL connection pooling
│   ├── src/controllers/ # Business logic routing (Auth, Vendors, Pets, etc.)
│   ├── src/middlewares/ # Security (JWT verification, Input Validation)
│   ├── scripts/         # Core DB Migrations, Seeding & Backups
│   ├── scratch/         # Sandboxed ad-hoc developer & diagnostic scripts
│   └── tests/           # Consolidated E2E Integration & Security Penetration tests
```

---

## 🔒 Security Implementations

Security is treated as a first-class citizen in PetPulse. We have implemented core security stories to defend against common vulnerabilities:

1.  **Parameterized Queries**: 100% of all PostgreSQL interactions utilize strict `$1, $2` parameterized bindings, neutralizing first-order SQL injection vectors.
2.  **Input Validation Middleware**: Every payload is sanitized and validated for proper types, lengths, and valid UUID formats before reaching the controller.
3.  **Active Threat Detection**: Proprietary middleware actively detects and blocks malicious SQLi patterns.
4.  **Least-Privilege Database User**: Application connections operate strictly on Data Manipulation privileges.
5.  **Role-Based Access Control (RBAC)**: Strict separation of privileges between `user`, `vet`, `trainer`, `vendor`, and `admin` roles to ensure vendors can only manipulate their own shops and users cannot access admin tools.
6.  **Secure Headers**: Implemented via Helmet.js to prevent Cross-Site Scripting (XSS) and Clickjacking.

---

## 🌐 REST API Endpoints

Our scalable backend exposes multiple protected and public endpoints. Below is a subset highlighting the diverse capabilities:

### Authentication & Users
| Method | Endpoint | Auth | Description |
|--------|---------|:---:|-------------|
| **POST** | `/api/auth/register` | 🔓 Public | Create a new user (Owner, Vet, Trainer, Vendor) |
| **POST** | `/api/auth/login` | 🔓 Public | Authenticate and return JWT token |
| **GET** | `/api/auth/me` | 🔒 Required | Fetch the current active user profile |

### E-Commerce & Vendors
| Method | Endpoint | Auth | Description |
|--------|---------|:---:|-------------|
| **GET** | `/api/marketplace/products` | 🔓 Public | List all products from approved vendors |
| **GET** | `/api/vendor/shop` | 🔒 Required | Fetch the authenticated vendor's shop details |
| **POST** | `/api/vendor/products` | 🔒 Required | Add a new product to the vendor's shop |

### Pets & Community
| Method | Endpoint | Auth | Description |
|--------|---------|:---:|-------------|
| **GET** | `/api/pets/adoptable` | 🔓 Public | List pets seeking adoption |
| **GET** | `/api/pets/mating` | 🔓 Public | List pets seeking mating |
| **POST** | `/api/community/posts` | 🔒 Required | Create a global community post |
| **GET** | `/api/providers` | 🔓 Public | List all approved local Vets and Trainers |

*(Note: This is a truncated subset of over 50+ RESTful operations).*

---

## 🧪 Automated Testing & Security Penetration Suites

PetPulse includes an advanced, consolidated testing ecosystem under `backend/tests/` to satisfy rigorous evaluation criteria and verify core modules continuously:

1. **E2E Core Flow Integration Suite**:
   Autonomously registers a vendor, logs in as an admin to approve the shop, logs in as the vendor to publish a marketplace product, and verifies public availability.
   ```bash
   cd backend
   node tests/test_e2e.js
   ```

2. **OTP Password Recovery Simulation**:
   Tests the E2E forgot-password pipeline, OTP generation, secure JWT reset tokens, and single-use validation constraints.
   ```bash
   cd backend
   node tests/test_forgot_password.js
   ```

3. **SQL Injection Penetration Test Suite**:
   Simulates active black-hat SQLi attack vectors (UNION SELECTs, SLEEP payloads, DROP TABLEs) to verify defensive threat detection middleware and parameterized query blocks.
   ```bash
   cd backend
   node tests/test_sqli.js
   ```

---

## ⚙️ Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Git

### 1. Database Setup
Ensure PostgreSQL is running locally on port `5432` with a database named `petpulse_db`.
```bash
cd backend
npm install
```

### 2. Bootstrapping the Backend
The backend utilizes automated scripts to build the schema and seed mock data for testing.
```bash
# Start the Express REST API (Runs on port 5000)
npm run dev
```

### 3. Bootstrapping the Frontend
Our Vite-powered frontend compiles instantly. Open a new terminal window:
```bash
cd petpulse-web
npm install

# Start the React development server (Runs on port 5173)
npm run dev
```

### 4. Access the Application
- **Frontend SPA**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api`

*(Note: The system contains seeded default accounts for rapid testing. Admin credentials: `admin@petpulse.com` / `admin`).*

---

## 🎓 Graduation Project Engineering Excellence

This repository serves as the official source code submission for our University Graduation Project. It has been meticulously reorganized, pruned of loose development scripts, and equipped with industrial-grade configurations:
- **VS Code Workspace Optimization**: Tailored search exclusions (`.vscode/settings.json`) to keep legacy, scratch, and backup scripts isolated from active searches.
- **Academic Git Workflows**: Implemented custom `.github/` templates to track project requirement achievements, log dry-run bugs, and structure team pull request code reviews.
- **Unified Clean Layout**: Isolated helper diagnostic files in a sandboxed `backend/scratch` folder and organized the verification suite into `backend/tests`.

It demonstrates a thorough mastery of modern Software Engineering (SDLC) methodologies, secure database practices, and robust full-stack architecture.

**Presented by the PetPulse Team** 🐾
