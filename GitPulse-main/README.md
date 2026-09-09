# GitPulse — GitHub Audience Tracker

<div align="center">

[![Stars](https://img.shields.io/github/stars/KalyanM45/GitPulse?style=flat&logo=github&color=yellow)](https://github.com/KalyanM45/GitPulse/stargazers) [![Issues](https://img.shields.io/github/issues/KalyanM45/GitPulse?style=flat&logo=github)](https://github.com/KalyanM45/GitPulse/issues) [![Live Demo](https://img.shields.io/badge/Live-Demo-4f8ef7?style=flat&logo=vercel&logoColor=white)](https://gitpulse.vercel.app) [![Deployment](https://img.shields.io/badge/Deployment-Render%20%2B%20Vercel-brightgreen?style=flat&logo=vercel&logoColor=white)](https://gitpulse-api-tznz.onrender.com/health) [![Version](https://img.shields.io/badge/Version-2.0.0-a371f7?style=flat)](https://github.com/KalyanM45/GitPulse/releases)

</div>

## About The Project

GitPulse is a full-stack GitHub audience tracker built with FastAPI and MongoDB. On every sync it fetches your followers and following from the GitHub REST API, diffs them against the stored snapshot in MongoDB, and logs every change as a timestamped event. The event log is append-only so the full history is always preserved.

The dashboard has three views — current followers newest first, current following in GitHub order, and lost followers built from a MongoDB aggregation that deduplicates by user and excludes anyone who has re-followed. A daily cron job via GitHub Actions keeps everything up to date automatically.

## Library Requirements

- FastAPI
- Uvicorn
- PyMongo
- Requests
- Python-dotenv
- APScheduler

## Getting Started

This will help you understand how to set up GitPulse to track your own GitHub followers. To get a local copy up and running follow these simple steps.

## Installation Steps

### Option 1: Installation from GitHub

1. **Clone the Repository**

   ```bash
   git clone https://github.com/KalyanM45/GitPulse.git
   cd GitPulse
   ```

2. **Create a Virtual Environment**

   ```bash
   python -m venv backend/venv
   ```

3. **Activate the Virtual Environment**

   Windows:
   ```bash
   backend\venv\Scripts\activate
   ```

   macOS / Linux:
   ```bash
   source backend/venv/bin/activate
   ```

4. **Install Dependencies**

   ```bash
   pip install -r backend/requirements.txt
   ```

5. **Configure Environment Variables**

   ```bash
   cp backend/.env.example backend/.env
   ```

   Open `backend/.env` and fill in your values — see the [API Key Setup](#api-key-setup) section below.

6. **Run the Backend**

   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

7. **Run the Frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_BASE=http://localhost:8000` in `frontend/.env.local` when running the backend locally.

   Click **Sync Now** to pull in your GitHub followers for the first time.

## API Key Setup

GitPulse needs two credentials to run — a GitHub token and a MongoDB connection string.

### 1. GitHub Personal Access Token (`GITHUB_TOKEN`)

This is required. Without it, GitHub blocks the following list endpoint entirely (authentication required) and applies strict rate limits on all other endpoints.

**Steps to create one:**

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Set a name like `gitpulse` and choose an expiration
4. Select the following scope:
   - `read:user` — to read your profile and your own following list
5. Click **Generate token** and copy it immediately — you cannot see it again

Add it to `backend/.env`:
```dotenv
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** Keep your token private. Never commit it to a public repository.

### 2. MongoDB Connection URI (`MONGODB_URI`)

GitPulse stores all follower snapshots and event history in MongoDB.

**For local development**, a local MongoDB instance works:
```dotenv
MONGODB_URI=mongodb://localhost:27017
```

**For production** (required for GitHub Actions nightly sync), use MongoDB Atlas:

1. Create a free account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free **M0 cluster**
3. Go to **Database Access** → create a user with read/write access
4. Go to **Network Access** → Add IP `0.0.0.0/0` (allow from anywhere — needed for GitHub Actions dynamic IPs)
5. Go to your cluster → **Connect** → **Drivers** → copy the URI

```dotenv
MONGODB_URI=mongodb+srv://db-user:password@cluster0.xxxxx.mongodb.net/?appName=Cluster0
```

### Complete `.env` file

```dotenv
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_USERNAME=your-github-username
MONGODB_URI=mongodb+srv://db-user:password@cluster0.xxxxx.mongodb.net/?appName=Cluster0
DB_NAME=github_analytics
SYNC_INTERVAL_MINUTES=60
```

## Deployment

### Backend → Render

The repository includes a `render.yaml` blueprint for the Docker-based API.

1. In Render, create a new **Blueprint** and connect this repository.
2. The blueprint creates the `gitpulse-api` Docker web service and uses `/health` as its health check.
3. Set these environment variables in Render:

   | Variable | Value |
   |---|---|
   | `GITHUB_TOKEN` | GitHub personal access token |
   | `GITHUB_USERNAME` | GitHub username to track |
   | `MONGODB_URI` | MongoDB Atlas connection string |
   | `DB_NAME` | `github_analytics` |
   | `CORS_ORIGINS` | Your exact Vercel frontend origin, plus `http://localhost:3000` if needed |

4. Deploy and copy the resulting API URL, for example `https://your-api.onrender.com`.
5. Verify `https://your-api.onrender.com/health` returns `{"status":"ok"}`.

> **Free Render note:** the service may sleep when idle. The included `keep_warm.yml` workflow can ping `/health` every 10 minutes when the `API_BASE_URL` repository variable is configured, but GitHub Actions scheduling is not guaranteed to be exact.

### Frontend → Vercel

1. In Vercel, create a new project from this repository.
2. Set **Root Directory** to `frontend`.
3. Add the environment variable `NEXT_PUBLIC_API_BASE` with the deployed Render API URL.
4. Deploy.
5. Copy the Vercel deployment origin and put that exact origin into the Render `CORS_ORIGINS` variable. Redeploy the API after changing CORS.

`NEXT_PUBLIC_API_BASE` is embedded into the Next.js client bundle at build time, so changing it requires a new Vercel deployment.

### Deployment smoke test

After both services are deployed, verify:

- `GET /health` returns HTTP 200.
- The frontend loads without CORS errors.
- **Sync Now** completes successfully.
- Followers/following data appears.
- Audience Growth loads for 30/90/180/365 days.
- Repository traffic history loads when GitHub traffic data is available.
- Repository comparison works for up to four repositories.
- Refreshing each dashboard route works directly (no 404).
- The browser console contains no uncaught errors.

### Nightly Sync → GitHub Actions

The workflow at `.github/workflows/auto_sync.yml` runs four times per day and imports the backend sync code directly against MongoDB Atlas. It does not depend on the Render server being awake.

Go to your repository → **Settings** → **Secrets and variables** → **Actions** and add:

| Secret Name | Value |
|---|---|
| `GH_ANALYTICS_TOKEN` | Your GitHub personal access token |
| `GH_USERNAME` | Your GitHub username |
| `MONGODB_URI` | Your MongoDB Atlas URI |
| `DB_NAME` | `github_analytics` |

> Use `GH_ANALYTICS_TOKEN` — not `GITHUB_TOKEN`, which is reserved by GitHub Actions.

To test immediately: **Actions** → **Sync Workflow** → **Run workflow**.


## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

- **Report bugs**: Open an issue and describe the problem clearly.
- **Contribute code**: Follow the steps below to get started.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

- **Suggestions**: Have ideas for new features? Open an issue and describe what you'd like to see!

#### Don't forget to give the project a star! Thanks again!

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

Thanks to the GitHub REST API for making follower data accessible, MongoDB Atlas for a generous free tier, Render and Vercel for free hosting, and the open-source community for the libraries that power this project.
## Version 3 polish

- Redesigned the dashboard around a profile-first hero and clearer analytics sections for Audience, Repositories, and Performance.
- Added restrained dashboard atmosphere, responsive profile presentation, and direct GitHub profile access.
- Preserved the existing glassmorphism design system while improving visual hierarchy and scanability.
