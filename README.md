# PetPulse Project Structure test

This repository contains the full stack implementation for **PetPulse**, a comprehensive pet care and community platform.

## Project Overview
The platform connects pet owners, trainers, and veterinarians, offering services like vet booking, lost & found alerts, pet adoption, a service marketplace, and real-time community chat.

## Tech Stack
- **Architecture**: Client-Server with Monorepo structure
- **Client**: Vanilla JS + Capacitor (Cross-platform Web & Mobile)
- **Backend**: Node.js + Express.js REST APIs
- **Real-Time System**: Socket.io
- **Database**: PostgreSQL with PostGIS (Geolocation)
- **Caching**: Redis
- **AI Layer**: Separate AI services (Python/Node)
- **Admin Panel**: Role-based access control, verification, moderation
- **Security**: JWT authentication, HTTPS, audit logs

---

## Folder Structure

```text
PetPulse/
├── client/                 # Vanilla JS + Capacitor app (Web & Mobile)
│   ├── src/
│   │   ├── assets/         # Images, icons, and static fonts
│   │   ├── components/     # Reusable UI components (buttons, cards, inputs)
│   │   ├── pages/          # Full page views (Vet Booking, Lost & Found, Mating)
│   │   ├── services/       # API integration, WebSocket clients
│   │   ├── styles/         # Global CSS/SCSS styling
│   │   └── utils/          # Helper functions, constants
│   └── index.html          # Entry HTML point
│
├── backend/                # Node.js + Express REST API
│   ├── src/
│   │   ├── config/         # Environment, DB config, Redis connections
│   │   ├── controllers/    # API Route handlers
│   │   ├── middlewares/    # Auth (JWT), Validation, Roles, Error handling
│   │   ├── models/         # Database models/queries (PostgreSQL + PostGIS)
│   │   ├── routes/         # Express routing definitions
│   │   ├── services/       # Business logic layer
│   │   ├── sockets/        # Socket.io real-time chat and notifications
│   │   └── utils/          # Helpers, loggers, password hashing
│   └── server.js           # Entry point for the backend
│
├── admin/                  # Admin Panel frontend
│   ├── src/
│   │   ├── dashboard/      # Admin analytics and metrics views
│   │   ├── users/          # User verification and role moderation
│   │   ├── listings/       # Service listings management
│   │   └── shared/         # Admin-specific UI components
│   └── index.html
│
├── ai-services/            # Standalone AI Layer
│   ├── src/
│   │   ├── agents/         # Agentic AI workflows and tools (LangChain)
│   │   ├── models/         # Pre-trained models or external API wrappers
│   │   ├── endpoints/      # AI service routes for symptom & image analysis
│   │   ├── utils/          # Data preprocessing and image formatting
│   │   └── server.js       # Express entry point
│   ├── package.json        # Node.js dependencies
│   └── README.md
│
├── docs/                   # Documentation, API specs, DB schema
├── docker-compose.yml      # Setup for local PostgreSQL/PostGIS and Redis
└── README.md               # This file
```

## Structure Explanation

### 1. `client/`
Holds the Vanilla JS frontend wrapped in Capacitor. Organizing by `components`, `pages`, and `services` keeps the presentation layer separate from API communication logic. This guarantees the same codebase effectively runs on Web, iOS, and Android.

### 2. `backend/`
Follows a classic MVC-like Node.js architecture. 
- **`middlewares/`**: Handles our rigorous Security features (JWT validation, Role-based checks).
- **`models/`**: Manages the PostgreSQL schemas, specifically leveraging PostGIS for geolocation queries (critical for "nearby vets" and "lost & found").
- **`sockets/`**: Isolates real-time Socket.io logic from standard REST paths, handling live chat and notifications.

### 3. `admin/`
A separate minimal frontend dedicated strictly to admins and moderators. Segregating this from the main client ensures secure, role-restricted dashboard access for moderation, user verification, and listings control without bloating the primary app.

### 4. `ai-services/`
Isolating the AI models into their own microservice (or folder) prevents heavy AI dependencies from slowing down the primary backend, enabling them to be scaled or upgraded independently.

### 5. `docker-compose.yml`
Used to easily spin up a local environment comprising PostgreSQL (with PostGIS extensions) and a Redis instance for caching/session management, perfectly matching the required tech stack.
