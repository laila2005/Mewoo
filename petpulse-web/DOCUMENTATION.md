# 📘 Technical & Architectural Documentation Handbook

Welcome to the official developer and system documentation for **PetPulse**. This handbook covers the system architecture, frontend design systems, state management engines, and scaling guidelines to assist developers, stakeholders, and academic examiners.

---

## 🏛️ 1. Architectural Blueprint & Design System

PetPulse is a unified Single Page Application (SPA) utilizing a modern client-server model. The frontend focuses on atomic, reusable, and responsive components, while the backend exposes structured RESTful APIs and real-time WebSocket listeners.

### 🎨 Design Tokens & UI Guidelines
The design system of PetPulse is built using Tailwind CSS to produce vibrant aesthetics, sleek dark-mode glassmorphic cards, and readable layouts:
*   **Typography:** Primary font family is `'Plus Jakarta Sans'`, designed for clean structural hierarchies and premium readability.
*   **Primary Palette:**
    *   `Blue (Brand Primary):` `#005da7` (main) & `#004883` (gradient end). Reposes trustworthiness, clinical excellence, and intelligence.
    *   `Pink (Pet Match):` `#ec4899` to `#f43f5e`. Reposes friendliness, warmth, and animal companionship.
    *   `Emerald (Adoptions & Success):` `#10b981`. Reposes natural health, growth, and verified statuses.
    *   `Amber (PulseBox & Rewards):` `#f59e0b`. Reposes energy, playfulness, and high value.
*   **Micro-interactions:** Custom hover scaling, smooth dropdown expansions, slide-in sidebar animations, and pulse effects for real-time notifications.

---

## 🔒 2. Authentication & Route Guarding

Global user session context is managed in `AuthContext.jsx` and injected at the root of the app. 

### Protected & Guest Routes
The client-side routing engine is guarded by two core wrapper components:
1.  **`ProtectedRoute`**: Evaluates `user` state. If null, automatically redirects the visitor to `/login` while storing their intent. Used for profiles, booking transactions, and messaging.
2.  **`GuestRoute`**: Prevents authenticated users from returning to onboarding views like login/signup. Automatically redirects them to the Home dashboard `/`.

```text
       ┌──────────────┐
       │  AppRoutes   │
       └──────┬───────┘
              │
      ┌───────┴────────┐
      ▼                ▼
┌───────────┐    ┌───────────┐
│ Guest Only│    │ Protected │
└─────┬─────┘    └─────┬─────┘
      │                │
      ▼                ▼
(Login / Signup)  (Messages / Profile)
```

---

## 🤖 3. Agentic AI Copilot & Chatbot (VetAI)

The VetAI assistant is a highly integrated, **agentic floating chatbot** present inside `MainLayout.jsx`. 

### A. The Agentic Callback Loop
Unlike simple retrieval-augmented chatbots, VetAI acts as a dynamic coordinator in the UI. It doesn't just answer questions—it guides user actions by generating **interactive action chips and adaptive UI cards**:

```text
               ┌───────────────────────┐
               │    AI Chat Message    │
               └───────────┬───────────┘
                           │
             Injects Custom Action Cards
                           │
                           ▼
          [ Book a Vet ]    [ Adopt a Pet ]  (HTML Class Trigger)
                 │                 │
                 └────────┬────────┘
                          │ (User Clicks Button)
                          ▼
            handleHtmlClick(event) inside Chatbot
                          │
          Executes Event Callbacks & Navigation
                          │
                          ▼
        useNavigate("/explore") / useNavigate("/adoption")
```

1.  **Intelligent Parsing:** The backend triage system parses symptom queries or user statements and determines if they contain actionable intents (e.g. searching pets for adoption, consulting a professional vet, buying special diets).
2.  **Dynamic HTML Injection:** The system returns specialized HTML components with interactive buttons styled using the `.bot-chip` and `.bot-card-btn` selectors.
3.  **The HTML Click Event Delegate (`handleHtmlClick`):**
    ```javascript
    const handleHtmlClick = (e) => {
        if (e.target.classList.contains('bot-chip')) {
            // Conversational agentic callback: triggers automatic text queries
            handleSend(e.target.textContent);
        } else if (e.target.closest('.bot-card-btn')) {
            // Navigational agentic callback: captures href parameters and routes the app
            e.preventDefault();
            const href = e.target.closest('.bot-card-btn').getAttribute('href');
            if (href) navigate(href);
        }
    };
    ```
    This delegates interactions back to React's client router (`useNavigate`), redirecting the user and carrying session contexts.

### B. Dynamic Mobile Hiding Mechanism
A common UX bottleneck on mobile is the overlapping of interactive floating badges (like a chatbot trigger button) with active screen drawers or bottom-action modals. PetPulse solves this using a **MutationObserver**:

*   **Initialization:** When `Chatbot.jsx` mounts, a `MutationObserver` begins watching mutations inside `document.body`.
*   **Trigger:** If a mobile navigation drawer or a full-screen modal backdrop (`div.backdrop-blur-sm`, `div[class*="bg-slate-900/"]`, or `div[class*="bg-black/50"]`) is injected into the DOM, the observer instantly updates the `isOverlayActive` state.
*   **Result:** Under mobile viewports (`< 768px`), the chatbot is assigned a `.hidden` Tailwind class, causing it to disappear instantly. Once the overlay is unmounted, it returns smoothly.

---

## 💬 4. Real-time Messaging (WebSocket Subsystem)

The messaging dashboard (`Messages.jsx`) connects to the Socket.io server to provide low-latency communications.

### Viewport-Adaptive Interface
To optimize narrow screens, the chat interface adapts its column layouts responsively:

```text
MOBILE VIEWPORTS (<768px)
┌───────────────────────────┐      ┌───────────────────────────┐
│       Sidebar (Active)    │      │        Chat (Active)      │
│  ┌─────────────────────┐  │      │  ┌─────────────────────┐  │
│  │   Search Bar        │  │      │  │ [<- Back] Avatar    │  │
│  ├─────────────────────┤  │      │  ├─────────────────────┤  │
│  │ Convo list item     ├────────►│  │ Message Bubbles     │  │
│  │ Convo list item     │  │      │  │                     │  │
│  └─────────────────────┘  │      │  └─────────────────────┘  │
└───────────────────────────┘      └───────────────────────────┘
```

*   **Single-Column Toggle:** On mobile, `currentChat` state controls visibility. When `currentChat` is empty, only the Sidebar is rendered. When a conversation is loaded, the sidebar is hidden, and the full active chat slides into view.
*   **Mobile Header Navigation:** A back arrow button (`<-`) is conditionally rendered inside the chat header. When clicked, it sets `currentChat` to `null`, taking the user back to the conversation list.
*   **Dual-Column Dashboard:** On larger viewports (`>= 768px`), both panels display side-by-side.

---

## 🤝 5. Safety-Shielded Connections Ecosystem

To foster collaborative relationships without introducing platform abuse, PetPulse features a dedicated **Connections Subsystem** built with strict role-based constraints:
*   **Active Connection Metrics**: On all profiles (standard owners, vets, and trainers), a dynamic connection counter showcases the user's active accepted connections.
*   **Role Isolation (Business Accounts)**: Business/Shop profiles (vendors) are entirely restricted from the connection subsystem. Their layouts automatically hide the "Connect" actions, and the API denies connection requests targeting vendor profiles to keep business operations clean.
*   **Secure Connection Workflows**: Chat requests operate via an invite-and-accept protocol (`chat_requests` table). Unaccepted requests isolate messages into the "Spam" folder and render protective interface headers.

---

## 🎭 6. Premium Comment Reactions System

PetPulse features a premium **Emoji Reactions Overlay** for post comments, facilitating high-fidelity micro-interactions:
*   **Reactions Array**: Supports six curated reaction states: 👍 (Like), ❤️ (Heart), 😂 (Laugh), 😮 (Surprise), 😢 (Sad), and 😡 (Angry).
*   **Hover-Persistent Overlay Engine**: Optimized to prevent standard mobile/desktop hover-collapse bugs where reaction drawers close prematurely. The reaction drawer implements dedicated delay wrappers and cursor-tracking listeners that persist during selection.
*   **Reactive UI Updates**: Selecting a reaction updates database metrics immediately, causing real-time animations and count displays to update in the view port.

---

## 🎁 7. PulseBox Loyalty & Gamification

To maximize retention and create an industry-first pet care model, PetPulse uses a unified loyalty database model:
*   **Earning Triggers:** Points are calculated on the backend and awarded upon successful API transactions:
    *   *Marketplace Purchase:* `1 point per dollar spent`.
    *   *Appointment Booking:* `50 points`.
    *   *Adoption Listing creation:* `25 points`.
*   **Redemption System:** Users browse the `PulseBox.jsx` loyalty portal to claim rewards (such as "Free Grooming Coupons" or "10% Chew Toys Discounts") using their accumulated point balance.

---

## 🔧 8. Scaling & Maintenance Guidelines

### Adding New Marketplace Products
To register new product schemas, update the backend database model and issue a `POST` request to `/api/products` with the following payload structure:
```json
{
  "name": "Organic Salmon Treat",
  "price": 14.99,
  "category": "Food & Treats",
  "stock": 120,
  "image_url": "https://example.com/salmon.jpg",
  "description": "High-protein wild-caught organic salmon treats."
}
```

### Expanding VetAI Diagnostics & Agentic Operations
To expand VetAI diagnostics, modify the LLM prompts under backend services. By training the AI core to return structures enclosing custom `.bot-card-btn` and `href` schemas, the AI can seamlessly guide users to newly implemented modules or pages.
