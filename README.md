# Taldium Frontend

React + Vite + Tailwind CSS frontend for the Taldium platform.

## Tech Stack

- **React** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP client
- **TanStack Query** - Data fetching

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Environment Variables

Create a `.env` file:
```
VITE_API_URL=http://localhost:3000
```

## Features

- User authentication (login, register)
- Professional profile setup
- Organisation setup
- Job posting and browsing
- Job applications

## Project Structure

```
src/
├── pages/          # Page components
├── contexts/       # React contexts
└── services/      # API services
```

