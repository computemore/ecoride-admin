# Ecoride Driver Admin Portal

A React-based administration dashboard for managing drivers in the Ecoride platform.

## Overview

This portal allows administrators to:
- View dashboard statistics (total drivers, active drivers, pending approvals)
- Register new drivers with user accounts and vehicles
- View and manage existing drivers
- Update driver information and status
- Add and manage vehicles for drivers
- Activate/deactivate drivers

## Contents

- [Ecoride Driver Admin Portal](#ecoride-driver-admin-portal)
  - [Overview](#overview)
  - [Contents](#contents)
  - [Tech Stack](#tech-stack)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Development](#development)
    - [Production Build](#production-build)
  - [Docker](#docker)
  - [Default Admin Credentials](#default-admin-credentials)
  - [Project Structure](#project-structure)
  - [API Endpoints Used](#api-endpoints-used)
  - [Role-Based Access](#role-based-access)
  - [Version](#version)

---

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **React Router v6** for navigation
- **TanStack React Query** for data fetching/caching
- **Axios** for API requests

## Getting Started

### Prerequisites

- Node.js 18+
- The Ecoride API running on `http://localhost:5000`

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server runs on `http://localhost:3002`.

### Production Build

```bash
npm run build
```

Output is in the `dist/` folder.

## Docker

The portal is included in the main `docker-compose.yml`:

```bash
# From the project root
docker-compose up driver-admin
```

Or build and run standalone:

```bash
docker build -t ecoride-driver-admin .
docker run -p 3002:80 ecoride-driver-admin
```

## Default Admin Credentials

An admin user has been created for testing:

- **Email**: `admin@ecoride.co.za`
- **Password**: `Admin123!`

> **Note**: In production, change this password immediately after first login.

## Project Structure

```
src/
├── api.ts              # API client with axios
├── types.ts            # TypeScript interfaces
├── App.tsx             # Router configuration
├── context/
│   └── AuthContext.tsx # Authentication state
├── components/
│   └── Layout.tsx      # Sidebar navigation
└── pages/
    ├── LoginPage.tsx           # Admin login
    ├── DashboardPage.tsx       # Stats overview
    ├── DriversPage.tsx         # Driver listing
    ├── RegisterDriverPage.tsx  # Multi-step driver registration
    └── DriverDetailPage.tsx    # Driver detail/edit view
```

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Admin authentication |
| `/api/admin/stats` | GET | Dashboard statistics |
| `/api/admin/drivers` | GET | List drivers (paginated) |
| `/api/admin/drivers` | POST | Register new driver |
| `/api/admin/drivers/{id}` | GET | Get driver details |
| `/api/admin/drivers/{id}` | PUT | Update driver |
| `/api/admin/drivers/{id}` | DELETE | Deactivate driver |
| `/api/admin/drivers/{id}/activate` | POST | Activate driver |
| `/api/admin/drivers/{id}/vehicles` | POST | Add vehicle |
| `/api/admin/drivers/{id}/vehicles/{vehicleId}` | DELETE | Remove vehicle |

## Role-Based Access

Only users with the `admin` role can access the admin API endpoints. The portal checks the user's role from the JWT token and redirects non-admins to the login page.

## Version

**0.6.4-alpha**
