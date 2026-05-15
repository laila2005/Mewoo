# 🐾 PetPulse — Mewoo

A full-stack pet care platform connecting owners with veterinarians, trainers, and a community of pet lovers.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla JS, HTML5, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | PostgreSQL |
| **Auth** | JWT (Bearer tokens) |
| **AI** | Microservice bridge (port 5001) |
| **Security** | Helmet, rate limiting, SQLi protection, input validation |

## Project Structure

```
Mewoo/
├── client/              # User-facing frontend
│   └── src/
│       ├── pages/       # Login, Signup, Home, Vet Booking, Community, Profile
│       ├── assets/      # Images, icons, fonts
│       └── styles/      # CSS
│
├── admin/               # Admin dashboard (users, bookings, services, vets)
│
├── backend/             # Express REST API
│   ├── server.js        # Entry point
│   └── src/
│       ├── config/      # Database pool (db.js)
│       ├── controllers/ # Auth, Bookings, Community, Pets, Services, Providers, AI
│       ├── middlewares/  # JWT auth, input validation, SQLi detection
│       └── routes/      # API route definitions
│
├── ai-services/         # AI triage microservice
├── docs/                # Documentation, diagrams, presentations
├── .gitignore
└── README.md
```

## Quick Start

```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 3. Start the server
npm run dev
# or: node --watch server.js
```

The app will be available at:
- **Frontend**: http://localhost:5000/pages/user.html
- **Admin**: http://localhost:5000/admin/
- **API**: http://localhost:5000/api/

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|---------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, get JWT |
| GET | `/api/auth/me` | ✅ | Current user profile |
| PUT | `/api/auth/profile` | ✅ | Update profile |
| GET | `/api/auth/users` | ✅ | All users (admin) |
| GET | `/api/providers` | — | List vets & trainers |
| GET | `/api/providers/:id/reviews` | — | Provider reviews |
| POST | `/api/providers/:id/reviews` | ✅ | Add review |
| POST | `/api/bookings/appointments` | ✅ | Book appointment |
| GET | `/api/bookings/appointments` | ✅ | My appointments |
| GET | `/api/bookings/all` | ✅ | All bookings (admin) |
| GET | `/api/services` | — | List services |
| POST | `/api/services` | ✅ | Create service |
| GET | `/api/community/posts` | — | Community feed |
| POST | `/api/community/posts` | ✅ | Create post |
| POST | `/api/community/posts/:id/like` | ✅ | Toggle like |
| GET | `/api/pets` | ✅ | My pets |
| POST | `/api/pets` | ✅ | Add pet |
| GET | `/api/pets/adoptable` | — | Adoptable pets |
| POST | `/api/lost-found/lost` | ✅ | Report lost pet |
| POST | `/api/lost-found/found` | ✅ | Report found pet |

## Security

All 10 SQL injection security stories are implemented:

- ✅ Parameterized queries (`$1, $2..`) on every SQL statement
- ✅ Input validation middleware (type, length, format, UUID)
- ✅ SQLi pattern detection & request blocking (20 attack patterns)
- ✅ Generic error responses — no DB schema leakage
- ✅ Least-privilege database user (no DROP/ALTER/CREATE)
- ✅ Rate limiting (login: 10/15min, register: 5/15min)
- ✅ Security event logging (`backend/logs/security.log`)
- ✅ Helmet HTTP security headers

## Environment Variables

```env
PORT=5000
POSTGRES_USER=petpulse_app
POSTGRES_PASSWORD=<your_password>
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=petpulse_db
JWT_SECRET=<your_secret>
AI_SERVICE_URL=http://localhost:5001
```

## Team

Mewoo — PetPulse Team
