# 🐾 PetPluse Project: Comprehensive Codebase Documentation & Q&A

This document is designed to help you prepare for your graduation project discussion. It explains the entire architecture of the **PetPluse (Mewoo)** platform and provides a highly-refined Q&A section with precise answers to potential questions your university examiners or professors might ask.

---

## 🏛️ Part 1: Architecture Overview

PetPluse is built using a modern **Decoupled Monorepo Architecture** separating concern layers between an interactive client interface and a secure, database-backed REST API.
* **Frontend:** Built with **React.js 19** (via Vite 8), utilizing **Tailwind CSS** for a premium, highly responsive UI, and **React Router v6** for routing.
* **Backend:** Built with **Node.js (Express.js)**, utilizing **PostgreSQL** for strict relational data integrity, and stateless **JSON Web Token (JWT)** for session authentication.
* **Real-Time Layer:** Powered by **Socket.IO** to handle low-latency connection requests, message deliveries, and instantaneous global notifications.

---

### 🎨 Frontend Structure (React)
The frontend uses React's **Context API** for global state management to handle authentication, cart persistence, and user preferences efficiently without "prop drilling".

1. **AuthContext (`src/context/AuthContext.jsx`):** 
   - Manages the user's active session, storing JWT tokens securely in browser `localStorage`.
   - Handles real-time **Geolocation Tracking**, coordinating neighborhood settings (e.g. Cairo neighborhoods like Maadi, Zamalek, Heliopolis) or browser GPS coordinates to Pan map centers and calculate Haversine distances to local clinics.
2. **CartContext (`src/context/CartContext.jsx`):** 
   - Manages shopping cart states for e-commerce transactions, persisting selected products in local storage to prevent data loss.
3. **Route Guarding (`src/App.jsx`):** 
   - **`<ProtectedRoute>`**: Redirects unauthorized visitors to `/login` if they attempt to enter professional dashboard or chat paths.
   - **`<GuestRoute>`**: Restricts logged-in users from returning to signup/login pages.
4. **Role-Based Access Control (RBAC):**
   - Implemented within `Community.jsx`. Professional accounts (`trainer`, `vet`) and business accounts (`vendor`) are restricted from viewing consumer-only boards (Lost & Found, Adoptions, Mating, Hosting). They are directed exclusively to the **Community Feed** to offer professional guidance and post academic tips.

---

### ⚙️ Backend Structure (Express & PostgreSQL)
The backend leverages a modular modularized middleware controller structure.

1. **Database Schema (`src/config/db` & Seeding):**
   - Powered by PostgreSQL for relational integrity. 
   - Uses lateral joins (`LEFT JOIN LATERAL`) to fetch professional plan statuses dynamically without N+1 query overhead.
2. **Security-First Middlewares:**
   - **SQL Injection Defense**: Proprietary middleware intercepts and rejects malicious SQL patterns.
   - **Strict Parameterization**: 100% of database queries utilize strict parameterized placeholders (`$1, $2`), completely eliminating first-order SQL injection (SQLi) vectors.
   - **JWT Auth Middleware (`requireAuth`)**: Decodes and verifies client authorization headers (`Authorization: Bearer <token>`) and loads user metadata into the request context (`req.user`).
3. **Agentic AI & Symptom Triage (`aiAgentController.js`):**
   - Integrated with OpenAI's `gpt-4o-mini` model utilizing **Function Calling / Tool Use**.
   - The AI assistant acts as an autonomous coordinator: it assessed symptoms, queries PostgreSQL via `query_doctor` tools, checks slot availability, and books appointments autonomously through database insertion tools.

---

## 🎓 Part 2: Professor Q&A Prep

Use these precise technical definitions to demonstrate absolute mastery of full-stack engineering, web performance, database isolation, and security postures.

> [!IMPORTANT]
> When answering, emphasize keywords like **Parameterized Queries**, **Context State Management**, **Haversine Distance**, **MutationObserver**, and **Lateral Joins**.

---

### 1. General Architecture & Framework Choices

#### **Q: Why did you choose React (Vite) and Node.js (Express) instead of a single monolith framework like PHP/Laravel or Django?**
* **A:** We chose a decoupled single-page application (SPA) architecture to separate presentation from business logic. React handles high-fidelity UI rendering and dynamic routing on the client side, avoiding full-page reloads. Express serves as a lightweight, event-driven REST API that scales horizontally and handles real-time WebSockets (Socket.IO) concurrently with minimal system memory overhead.

#### **Q: How does client-server communication work in PetPluse?**
* **A:** Communication is fully stateless. The client makes asynchronous HTTP requests using the `axios` library to the Express API. The backend returns standard JSON payloads. For real-time updates (like messaging requests or global notifications), a persistent TCP connection is established between the frontend and backend using the **Socket.IO** protocol.

---

### 2. Security & Defense-in-Depth

#### **Q: How does the application protect against SQL Injection (SQLi) vulnerabilities?**
* **A:** We use a double-layer defense:
  1. **Strict Query Parameterization:** We never concatenate raw input strings into SQL statements. We use database driver placeholders (e.g., `db.query('SELECT * FROM users WHERE email = $1', [email])`). The SQL command structure is pre-compiled by PostgreSQL, and inputs are treated strictly as literal values.
  2. **Active Threat Detection Middleware:** Incoming requests are inspected for malicious SQL signatures (e.g. `UNION SELECT`, `' OR '1'='1`) and rejected instantly before they even reach database routes.

#### **Q: How is User Session Authentication managed securely?**
* **A:** We use stateless **JSON Web Tokens (JWT)**. On successful login, the server signs a token containing the user's ID and role using a secret hash key (`JWT_SECRET`). The client stores this token in `localStorage` and attaches it in the HTTP headers of all protected requests: `Authorization: Bearer <JWT_TOKEN>`. The server decodes it using cryptography to verify identity without doing database session lookups. Passwords are encrypted before database insertion using **bcrypt** with a work factor of 10.

---

### 3. Geolocation & Real-Time Proximity Mapping

#### **Q: How does the "Nearest-First" sorting of veterinarians and trainers work?**
* **A:** When a user shares their location (via GPS or Cairo neighborhood presets), the coordinates (`latitude` and `longitude`) are retrieved. When rendering clinics or academies, the client calculates the spherical distance between the user and the professional in-memory using the **Haversine Formula**:
  $$\Delta \sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)} \right)$$
  The system then automatically sorts the clinics nearest-first, and injects proximity distance badges (e.g., `"1.2 km away"`).

#### **Q: How do you prevent Leaflet maps from breaking when a user switches neighborhoods?**
* **A:** In React-Leaflet, the map container is static. To pan smoothly, we created a custom `<MapRecenter>` helper component that taps into the Leaflet `useMap` hook. When the user's location coordinate state updates, `<MapRecenter>` executes `map.flyTo([lat, lng], zoom)` to programmatically pan and center the viewport with a fluid gliding animation.

---

### 4. Advanced Agentic AI Symptom Triage (VetAI)

#### **Q: How does the AI chatbot do more than just text chatting? Explain "Agentic Triage".**
* **A:** The assistant uses **OpenAI Function Calling (Tool Use)**. When the user reports symptoms, the system passes tool definitions (like `query_doctor`, `check_availability`, `book_appointment`) to `gpt-4o-mini`. If the LLM determines the user needs a booking, it returns an execution command. Node.js intercepts this, runs the PostgreSQL database queries, returns the raw data back to the LLM, and the LLM completes the task (e.g., booking the slot) autonomously.

#### **Q: How did you fix the chatbot overlapping forms on mobile screens?**
* **A:** We implemented a **MutationObserver** inside `Chatbot.jsx`. It listens for class name updates on the `document.body` element. When a form wizard is active (which applies the `.wizard-active` class) or a mobile backdrop overlay is injected, the chatbot dynamically detects the class mutation and assigns a hidden CSS class to the trigger badge, completely removing the overlap on mobile viewports.
* Additionally, we added a semi-transparent mobile backdrop wrapper (`bg-slate-900/50 backdrop-blur-xs`) that allows users to close the chatbot smoothly by tapping anywhere outside the modal.

---

### 5. Performance Optimizations & Advanced Database Queries

#### **Q: How does the platform load premium subscriber subscription badges without causing N+1 query bottlenecks?**
* **A:** If we queried subscription plans individually for every post, comment, or conversation participant, it would lead to catastrophic database loads (N+1 database connections). 
* To prevent this, we optimized our SQL queries with **`LEFT JOIN LATERAL` Subqueries** on the backend. This acts like an SQL "for-each" loop executed entirely within the database engine, returning user profiles, matching posts, and active subscription plan records unified in a single query execution.

#### **Q: How does the e-commerce shopping cart survive page refreshes?**
* **A:** The shopping cart is managed globally using a React **CartContext**. We utilize a React `useEffect` hook synchronized with local state. Whenever the cart changes, the context stringifies the object and saves it in `localStorage`. On application mounting, the context checks `localStorage` and initializes the cart state with the cached items.

---

### 6. Connections & Messenger Spam Moderation

#### **Q: How does the Connections and Inbox Spam routing work?**
* **A:** When users search for other owners or professionals, we display their unique email address to resolve identical name ambiguities. 
* To eliminate unsolicited spam, a user's messaging screen is split into **Inbox** and **Spam** folders:
  - If a user receives a message from an unaccepted connection, the client renders a warning banner.
  - If marked as Spam, the connection status is set to `'spam'` in PostgreSQL, which immediately triggers client-side safety overrides: it mounts a security shield in the chat header, disables message input fields, and locks the conversation until marked safe.

#### **Q: How did you design the connection counters for profiles, and why are business profiles (vendors) isolated?**
* **A:** On standard user profiles, vet profiles, and trainer profiles, a dynamic connection badge shows the total count of accepted active connections (`COUNT(*)` on accepted `chat_requests`). However, to keep commercial transactions clean and prevent platform abuse, **business profiles (vendors/pet shops)** are completely isolated from this system. We disabled connection controls on vendor layouts, and the API rejects any connection attempts targeting vendor IDs, rendering shop portfolios strictly transaction-oriented.

---

### 7. Core UI/UX & Database Infrastructure Safeguards

#### **Q: How did you resolve the bug where comment reaction overlays would immediately disappear on hover?**
* **A:** Standard CSS/JS hover drawers often trigger immediate collapse events when the cursor transitions across margin boundaries. To resolve this, we engineered a **Hover-Persistent Reaction Overlay** for comment threads. It introduces specific delay wrappers and mouse-enter tracking handlers. The reaction selection drawer remains active and visible as the user hovers over individual emoji options, ensuring a responsive, zero-latency micro-interaction.

#### **Q: How did you protect the database against connection limit exhaustion errors like `EMAXCONNSESSION` in Supabase?**
* **A:** Hosted databases (especially Supabase on free/transactional tiers) restrict concurrent connections to a maximum of 15. Standard client-server applications that open unlimited pools will exhaust these resources instantly, causing connection failures. To safeguard our database reliability, we re-engineered the connection pooling parameter in `db.js`, restricting the maximum pool size to **`max: 5`** with a tight `idleTimeoutMillis` of `30000ms`. This guarantees robust, reuse-optimized database queries under high loads without ever crashing our Supabase quotas.
