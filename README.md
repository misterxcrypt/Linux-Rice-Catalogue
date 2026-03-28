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

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

Required environment variables:
- `MONGODB_URI`: Your MongoDB connection string
- `IMAGEKIT_*`: ImageKit API keys (optional for basic functionality)
- `REDDIT_*`: Reddit API credentials for submission scraping
- `ADMIN_PASSWORD`: Secure password for admin login

#### Local Development Mode
For easier setup without external services:
- Set `LOCAL_DEV=true` in `.env`
- This uses `sample-db.json` for data and local images instead of MongoDB/ImageKit
- Add dummy images to `public/local-images/` (e.g., sample1.png, sample2.png, sample3.png)
- Run the backend locally or use Vercel dev for API functions

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