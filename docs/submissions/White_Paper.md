# PetPluse: A High-Availability Ecosystem for Intelligent Veterinary Triage & Dual-Sided Commerce
*Technical White Paper*

## Abstract
The extreme fragmentation of the Egyptian veterinary and pet supply market results in fatal diagnostic delays and an unreliable consumer experience. PetPluse introduces a unified, full-stack ecosystem engineered on Node.js and React, featuring a custom Zero-Trust Web Application Firewall (WAF), Agentic AI triage logic, and bi-directional WebSockets. This white paper details the technical architecture and algorithmic implementations that ensure sub-millisecond threat mitigation and high-availability operations for critical veterinary emergencies.

## 1. Introduction
Modern digital infrastructure in the MENA pet care sector relies on disconnected legacy systems. This technical deficit forces manual scheduling during life-or-death situations and leaves sensitive medical records vulnerable to cyber-attacks. PetPluse abstracts these disparate workflows into a single, cohesive platform, leveraging advanced web technologies to deliver frictionless e-commerce, real-time communication, and AI-driven diagnostics.

## 2. Macro System Architecture
The platform is built on a modern JavaScript/TypeScript stack:
- **Frontend (Client/Admin):** Developed in React.js, utilizing Redux for centralized, deterministic state management (e.g., maintaining cart state and session data without constant database polling).
- **Backend API:** A Node.js/Express monolithic service that acts as the primary data broker.
- **Database Layer:** PostgreSQL handles relational data integrity for user profiles, vet schedules, and transactional ledgers. PostGIS extensions are utilized for rapid geospatial querying.
- **Real-Time Layer:** Socket.IO brokers maintain persistent WebSocket connections for live chat and emergency SOS broadcasts, bypassing HTTP overhead.

## 3. Custom Zero-Trust WAF Middleware
Commercial platforms in the region frequently suffer from inadequate input sanitization. Instead of relying on heavy, latency-inducing ML models for threat detection, PetPluse implements a custom, deterministic Web Application Firewall at the middleware layer.
- **Sub-Millisecond Regex Parsing:** The WAF intercepts all incoming HTTP requests before routing, evaluating headers and body payloads against 20+ aggressive attack signatures.
- **Instant Mitigation:** Upon detecting Cross-Site Scripting (XSS) vectors or SQL Injection (SQLi) patterns, the connection is instantly dropped, and the IP is flagged, preventing malicious queries from ever reaching the PostgreSQL instances.

## 4. Agentic AI & Algorithmic Triage
To eliminate the friction of manual emergency scheduling, PetPluse directly integrates the OpenAI SDK into the backend architecture.
- **Symptom Parsing:** The AI evaluates natural language inputs (e.g., "My dog ate chocolate and is vomiting") to classify the medical severity.
- **Geospatial Dispatching:** If classified as an EMERGENCY, the system autonomously queries PostGIS to lock the nearest active veterinary shift, securing an appointment instantly without human intervention.

## 5. Security in Asset Management
To mitigate Remote Code Execution (RCE) vulnerabilities commonly associated with vendor file uploads, the platform implements a Zero-Disk architecture.
- **Memory Buffering:** Uploaded product and profile images are ingested via Multer directly into RAM buffers.
- **Direct Cloud Proxy:** The memory buffers are streamed securely to Cloudinary over HTTPS, bypassing the local server disk entirely. Only the secure, sanitized CDN URL is stored in the PostgreSQL database.

## 6. Frictionless Guest Checkout Pipeline
During high-stress scenarios, enforced account creation causes significant user drop-off. PetPluse engineered a single-transaction pipeline:
1. Capture basic contact and pet details.
2. Automatically hash credentials via bcrypt.
3. Execute a relational database insert.
4. Sign and return a JWT within the same HTTP response cycle, allowing the user to seamlessly proceed to the emergency booking or checkout interface.

## 7. Conclusion & Future Roadmap
PetPluse establishes a robust technical baseline for modernizing pet care infrastructure. The current iteration successfully integrates AI triage, real-time WebSockets, and Zero-Trust security. Future iterations will focus on IoT hardware integration (e.g., PulseTag GPS collars) and microservice extraction to support massive regional scaling.
