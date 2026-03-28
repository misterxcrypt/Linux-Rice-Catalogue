# Rice Gallery

A simple, modern gallery for Linux rices, built with HTML/CSS/JS frontend, MongoDB Atlas backend, and serverless functions for authentication and data access.

## Features
- Static frontend (see `/public/rice.html`)
- MongoDB Atlas for rice data
- Serverless functions for login, fetching, and updating rices
- Simple admin authentication (password-only)
- Deployable to Vercel or Netlify

## Project Structure
```
/project-root
├── /public
│   └── rice.html
├── /functions
│   ├── login.js
│   ├── getRices.js
│   └── updateRice.js
├── /static
│   └── styles.css
├── /utils
│   └── db.js
├── .env.example
└── README.md
```

## Setup
1. Copy `.env.example` to `.env` and fill in your MongoDB Atlas URI and admin password.
2. Deploy to Vercel/Netlify (functions auto-detected in `/functions`)
3. Open `/public/rice.html` in your browser (or set as site root)

## Serverless Functions
- `/functions/login.js`: Admin login (POST, password-only)
- `/functions/getRices.js`: Get all rices (GET)
- `/functions/updateRice.js`: Update/approve rice (POST, admin only)

## Security
- Admin password never exposed to frontend
- All sensitive logic runs server-side
- Use HTTPS in production

## TODO
- Add rice submission and stats endpoints
- Improve session/token security 