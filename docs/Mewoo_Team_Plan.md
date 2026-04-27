# Mewoo (PetPulse) - Team Assignment & Core Features Plan

This document provides a structured project plan for the **Mewoo (PetPulse)** platform. It is designed specifically for the project supervisor to assign clear, measurable tasks to the 6-member team (5 CS, 1 IT), ensuring each member has a substantial role aligned with their academic major. *(Note: The 3-member Cyber Security team will provide their own dedicated security implementation plan.)*

## Core Features & Unique Value Proposition

Mewoo is a comprehensive cross-platform (Web/Mobile) pet care community. While it includes essential platform features like Veterinary Booking, Lost & Found, and Community Chat, **its core differentiator is the Agentic AI Microservice**.

### The Unique Factor: Agentic AI Layer
The platform utilizes an autonomous, standalone AI Microservice (Python/FastAPI + LangChain) that operates as the primary logic engine of the application:
1. **AI Vet Triage**: Users can describe symptoms or upload images of their pets. The AI agent analyzes the input, asks follow-up questions, determines urgency, and recommends whether to book a veterinary appointment immediately.
2. **Automated Matchmaking**: Intelligent algorithms that analyze pet profiles, behaviors, and genetics to recommend optimal matches for adoption, playdates, or mating.

### Supporting Core Features
- **Geospatial Tracking (Lost & Found)**: Leveraging PostGIS for real-time location tracking and broadcasting "lost pet" alerts to nearby users.
- **Real-Time Community Hub**: Live WebSocket (Socket.io) chat and notifications for community engagement.
- **Service Marketplace**: A secure booking system for veterinarians, trainers, and pet sitters.
- **Admin Moderation Panel**: Dedicated dashboard for verifying users and managing service listings.

---

## Team Role Breakdown (6 Members)

The team detailed in this plan consists of **5 Computer Science (CS)** and **1 Information Technology (IT)** members. 

### Computer Science Team (5 Members)
*Focuses on software engineering, AI logic, and the cross-platform client.*

#### 1. Lead AI Engineer: Agentic Workflows (CS Member 1)
**Focus**: The core artificial intelligence engine of the platform.
* **Tasks**:
  * Develop the standalone Python/FastAPI AI Microservice.
  * Build the LangChain agentic workflows for the **AI Vet Triage** system.
  * Integrate Large Language Models (LLMs) and Image Recognition models for symptom analysis.
  * Design the AI logic for automated pet matchmaking.

#### 2. Backend Engineer: API Gateway & AI Integration (CS Member 2)
**Focus**: Connecting the AI engine to the primary application logic.
* **Tasks**:
  * Develop the Node.js/Express API Gateway.
  * Build the secure communication bridge between the Node.js backend and the Python AI Microservice.
  * Implement the business logic for the Service Marketplace and Vet Booking systems.

#### 3. Database & Geospatial Engineer (CS Member 3)
**Focus**: Complex data structures, optimization, and mapping.
* **Tasks**:
  * Design and maintain the highly normalized PostgreSQL database schema.
  * Implement PostGIS spatial queries for the "Lost & Found" radius alerts and "Nearest Vet" search.
  * Optimize database indexing and query performance for application scale.

#### 4. Real-Time & Full-Stack Engineer (CS Member 4)
**Focus**: Live interactivity and asynchronous communication.
* **Tasks**:
  * Architect the Socket.io real-time server for live community chat.
  * Build the real-time push notification system (alerts for lost pets, appointment updates).
  * Assist with integrating WebSocket events into the Vanilla JavaScript client.

#### 5. Lead Frontend Engineer: Cross-Platform App (CS Member 5)
**Focus**: User Interface architecture and User Experience.
* **Tasks**:
  * Build the unified Vanilla JS + Capacitor application (deployable to Web, iOS, Android).
  * Design the UI/UX utilizing modern, responsive components.
  * Integrate REST APIs and AI endpoints into the frontend seamlessly.
  * Develop the separate Admin Panel dashboard.

---

### Information Technology Team (1 Member)

#### 6. IT / DevOps Engineer (IT Member 1)
**Focus**: Deployment, infrastructure, and reliability.
* **Tasks**:
  * Write and manage the `docker-compose.yml` for local, staging, and production environments.
  * Set up CI/CD pipelines (e.g., GitHub Actions) for automated testing and deployment.
  * Manage cloud server provisioning (AWS/DigitalOcean), ensuring maximum uptime.
  * Monitor system health (Prometheus/Grafana) and manage the Redis caching layer.

---

## Evaluation Guide

When evaluating the team, the project supervisor can use the following milestones to track progress:
1. **Phase 1 (Foundation)**: IT sets up Docker/DB. CS3 designs DB schemas. CS5 builds base UI.
2. **Phase 2 (Core Logic)**: CS2 builds API routes. CS1 starts AI Triage. 
3. **Phase 3 (Integration & Unique Value)**: CS1 & CS2 connect AI to backend. CS4 enables live chat. 
4. **Phase 4 (Testing & Launch)**: IT deploys to cloud. CS5 finalizes the mobile build.
