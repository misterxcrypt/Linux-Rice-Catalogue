# Rice Gallery

A modern, centralized gallery for showcasing Linux desktop rices (customized desktop environments). Built with a static HTML/CSS/JS frontend, MongoDB backend, and serverless API functions.

**Note:** This is a centralized platform - all users share the same gallery and admin dashboard. The code is open source, allowing you to fork and deploy your own instance if desired.

## Features
- **Gallery View**: Browse approved rices with filtering by WM, DE, distro, and theme
- **Admin Dashboard**: Moderate submissions, manage keywords, view stats
- **Submission System**: Users can submit rices via Reddit links or direct uploads
- **Image Hosting**: Integrated with ImageKit for optimized image delivery
- **Responsive Design**: Works on desktop and mobile
- **Dark/Light Mode**: With customizable accent themes
- **MongoDB Atlas**: For data storage
- **Serverless Functions**: For API endpoints (login, CRUD operations)

## Project Structure
```
rice-gallery/
├── public/
│   ├── index.html          # Main gallery page
│   ├── admin.html          # Admin dashboard
│   └── ...
├── api/                    # Client-side API helpers
│   ├── getRices.js
│   ├── updateRice.js
│   └── ...
├── scripts/                # Utility scripts for data migration, etc.
├── backend/                # Backend API (if included)
├── .env.example            # Environment variables template
├── .gitignore
└── README.md
```

## Setup & Installation

### Prerequisites
- Node.js (for running scripts)
- MongoDB Atlas account (for database)
- ImageKit account (for image hosting, optional for local dev)
- Reddit API credentials (for scraping submissions)

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/rice-gallery.git
cd rice-gallery
```

### 2. Prerequisites
- Node.js >= 14
- Docker (for local MongoDB)
- Vercel CLI: `npm install -g vercel`

### 3. Local Development Setup
```bash
# Clone the repo
git clone https://github.com/yourusername/rice-gallery.git
cd rice-gallery

# Copy development environment
cp .env.development .env

# Install dependencies
npm install

# Start development environment (includes local DB, seeding, and server)
npm run dev
```

This will:
- Start a local MongoDB instance via Docker
- Seed the database with sample data
- Start the development server on http://localhost:3000

#### Adding Sample Images
- Place dummy images in `public/uploads/` (e.g., sample1.png, sample2.png)
- The sample data references these files

#### Contributing New Data
- Add JSON files to `contributions/` folder
- Format: Same as `sample-db.json` entries
- Submit PR with your contribution file
- Maintainers will review and add approved data to production

### 4. Production Deployment
```bash
# Copy production environment
cp .env.production .env
# Fill in your production credentials

# Deploy to Vercel
npm run dev:vercel
vercel --prod
```

Required production environment variables:
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `IMAGEKIT_*`: ImageKit API keys for cloud image storage
- `REDDIT_*`: Reddit API credentials for scraping
- `ADMIN_PASSWORD`: Secure admin password

### 3. Deploy Backend
The backend consists of serverless functions. Deploy to Vercel, Netlify, or your preferred serverless platform.

For Vercel:
```bash
npm install -g vercel
vercel --prod
```

### 4. Deploy Frontend
The frontend is static HTML/CSS/JS. Host on Netlify, Vercel, or any static hosting service.

```bash
# For static hosting, just upload the /public directory
```

## API Endpoints
- `GET /api/getRices`: Fetch approved rices
- `POST /api/submitRice`: Submit a new rice
- `POST /api/login`: Admin authentication
- `POST /api/updateRice`: Update rice details (admin only)
- `GET /api/keywords`: Get keyword lists
- And more...

## Security Notes
- Admin authentication uses secure tokens
- Sensitive operations are server-side only
- Never expose API keys to the frontend
- Use HTTPS in production

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
MIT License - see LICENSE file for details

## Disclaimer
This is a centralized platform. All submissions are moderated and shared publicly. If you deploy your own instance, you'll have control over your data and moderation. 