# Personal Finance & Budget Tracker

A full-stack web application for tracking personal finances, logging expenses, managing budgets, and visualizing spending through charts.

---

## Tech Stack

### Frontend
| Tool | Version |
|------|---------|
| Angular | 21.2.5 |
| TypeScript | 5.x |
| Angular Material | latest |
| Chart.js | latest |
| ng2-charts | latest |

### Backend
| Tool | Version |
|------|---------|
| Node.js | 22.22.2 |
| npm | 10.9.7 |
| Express | 4.x |
| TypeScript | 5.x |
| PostgreSQL | 17.x |
| JWT (jsonwebtoken) | 9.x |
| bcryptjs | 2.x |

### Dev Tools
| Tool | Purpose |
|------|---------|
| nvm-windows | Node version management |
| Angular CLI 21.2.5 | Frontend scaffolding & dev server |
| ts-node-dev | Backend hot reload |
| pgAdmin | PostgreSQL GUI |
| Git | Version control |

### Environment
| | |
|--|--|
| OS | Windows 11 (win32 x64) |
| Package Manager | npm 10.9.7 |

---

## Project Structure

```
practice/
├── frontend/        ← Angular 21 app
├── backend/         ← Node.js + Express API
│   ├── src/
│   │   ├── index.ts
│   │   ├── db/          ← PostgreSQL connection & migrations
│   │   ├── middleware/  ← JWT auth, error handler
│   │   ├── models/      ← TypeScript interfaces
│   │   ├── routes/      ← auth, transactions, budgets
│   │   └── controllers/ ← business logic
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## Build Phases

- [x] Phase 1 — Project setup & repo structure
- [ ] Phase 2 — Backend API & database (users, transactions, budgets)
- [ ] Phase 3 — Frontend expense logging forms
- [ ] Phase 4 — Dashboard & charts
- [ ] Phase 5 — Auth + polish + CSV export

---

## Getting Started

### Prerequisites
- Node.js 22.22.2 (via [nvm-windows](https://github.com/coreybutler/nvm-windows))
- PostgreSQL 17+
- Angular CLI 21.2.5 (`npm install -g @angular/cli`)

### Backend Setup
```bash
cd backend
cp .env.example .env       # fill in your DB credentials
npm install
npm run db:migrate         # create tables
npm run dev                # starts on http://localhost:3000
```

### Frontend Setup
```bash
cd frontend
npm install
ng serve                   # starts on http://localhost:4200
```

### API Health Check
```
GET http://localhost:3000/api/health
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/transactions` | List transactions | Yes |
| POST | `/api/transactions` | Create transaction | Yes |
| PUT | `/api/transactions/:id` | Update transaction | Yes |
| DELETE | `/api/transactions/:id` | Delete transaction | Yes |
| GET | `/api/budgets` | List budgets | Yes |
| PUT | `/api/budgets` | Create/update budget | Yes |
| DELETE | `/api/budgets/:id` | Delete budget | Yes |
