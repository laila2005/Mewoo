# Business Requirements Description (BRD)

## 1. Project Information
- **Project Name:** PetPulse Platform
- **Document Version:** 1.1
- **Status:** Approved

## 2. Executive Summary
The PetPulse Platform is an integrated digital ecosystem designed to bridge the gap between pet owners, veterinary clinics, and pet supply vendors in the MENA region. This document outlines the functional and non-functional requirements necessary to deliver a secure, scalable, and highly available platform that resolves severe market fragmentation.

## 3. Scope
The scope of the PetPulse platform includes:
- A progressive web application (PWA) for pet owners.
- A dedicated dashboard for veterinary clinics and vendors.
- A centralized Admin Dashboard for platform oversight and moderation.
- Backend infrastructure featuring real-time WebSockets, Agentic AI, and a custom Web Application Firewall (WAF).

## 4. User Personas
1. **The Pet Owner (e.g., Sara Ahmed):** Needs immediate, reliable access to emergency veterinary care, a trusted marketplace for pet supplies, and community features for adoption, mating, and lost pet recovery.
2. **The Veterinary Professional (e.g., Dr. Laila):** Requires an automated booking system, real-time chat with patients in emergency situations, and digitized medical record preservation.
3. **The System Administrator:** Requires overarching visibility into platform health, user moderation tools, and automated threat detection alerts.

## 5. Functional Requirements
### 5.1 Authentication & Authorization
- **FR1.1:** The system shall support secure registration and login with bcrypt password hashing.
- **FR1.2:** The system shall implement JWT (JSON Web Tokens) for stateless session management across all microservices.
- **FR1.3:** Role-Based Access Control (RBAC) must differentiate privileges between Users, Vendors, Vets, and Administrators.

### 5.2 Agentic AI Triage
- **FR2.1:** The platform shall integrate the OpenAI API to process natural language input regarding pet symptoms.
- **FR2.2:** The AI must accurately classify cases into NORMAL, URGENT, or EMERGENCY severity levels.
- **FR2.3:** Based on the severity, the system shall execute spatial queries (PostGIS) to locate and suggest the nearest available veterinary clinic.

### 5.3 E-Commerce Marketplace & Checkouts
- **FR3.1:** The system shall provide a multi-vendor catalog supporting high-resolution image uploads.
- **FR3.2:** A unified shopping cart state must be managed via Redux, persisting across user sessions.
- **FR3.3:** Checkout processes must support frictionless single-transaction payloads for both product purchases and service bookings.

### 5.4 Paid Ad Campaigns & Moderation Pipeline
- **FR4.1:** The system shall allow vendors and vets to purchase and build promotional ad campaigns through a dedicated ads self-serve panel.
- **FR4.2:** The campaign creation form shall accept start/end dates, target placement selectors, and promotional image assets.
- **FR4.3:** Newly created campaigns must be routed to a pending status, remaining invisible to public feeds until reviewed.
- **FR4.4:** The Admin Dashboard shall expose a moderation suite allowing system administrators to approve or reject pending ad campaigns with optional reason feedback.

### 5.5 Real-Time Communications & Presence
- **FR5.1:** The system shall implement Socket.IO to enable bi-directional, real-time messaging between users and vets.
- **FR5.2:** The system shall track active connection states via a WebSockets presence tracker, showing live "Online/Offline" status badges for service providers and admins.
- **FR5.3:** A geo-fenced SOS broadcast feature must alert all registered users within a 5km radius of a reported lost pet.
- **FR5.4:** The platform shall provide an algorithmic matchmaking interface for safe animal mating based on species, breed, and location.

## 6. Non-Functional Requirements
### 6.1 Security & custom WAF Infrastructure (Zero-Trust)
- **NFR1.1:** A custom, low-overhead Node.js WAF middleware must intercept all incoming HTTP requests before routing handlers.
- **NFR1.2:** The WAF shall evaluate request payloads (queries, parameters, bodies) against deterministic regex signatures to detect SQL Injection (SQLi) and Cross-Site Scripting (XSS) in under 1 millisecond.
- **NFR1.3:** The WAF shall log blocked intrusion attempts (including source IP, attack vector, and payload snippet) to the PostgreSQL database for security diagnostic audits without degrading overall request-response speeds.
- **NFR1.4:** Asset uploads (e.g., profile pictures, product images) must bypass local server disk buffers and stream directly to cloud storage (e.g., Cloudinary) to prevent Remote Code Execution (RCE) vectors.

### 6.2 Performance & Latency
- **NFR2.1:** Core API routes must resolve in under 100ms to accommodate emergency triage requirements.
- **NFR2.2:** Frontend rendering must utilize React optimizations (memoization, lazy loading) to achieve a Lighthouse Performance score of >90.

### 6.3 Scalability & Testability
- **NFR3.1:** The relational PostgreSQL database must utilize proper indexing and connection pooling to support concurrent traffic spikes.
- **NFR3.2:** The architecture must be containerization-ready (Docker) for seamless horizontal scaling across cloud providers.
- **NFR3.3:** The frontend and critical user checkout workflows must be validated by headless Cypress end-to-end integration suites to guarantee stability across code deployments.

