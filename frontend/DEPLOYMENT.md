cd # Deployment Guide

This guide will help you deploy the Task Management System to various platforms.

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- MongoDB Atlas account (for database)
- Git repository

### Step 1: Set up MongoDB Atlas

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account
   - Create a new cluster

2. **Configure Database**
   - Create a database user
   - Set up network access (allow all IPs: 0.0.0.0/0)
   - Get your connection string

### Step 2: Deploy Backend to Vercel

   ```bash
   npm i -g vercel
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   vercel
   ```

3. **Configure Environment Variables**
   - Go to Vercel dashboard
   - Select your backend project
   - Go to Settings > Environment Variables
   - Add the following variables:
     ```
     MONGODB_URI=your-mongodb-atlas-connection-string
     JWT_SECRET=your-super-secret-jwt-key
     JWT_EXPIRE=7d
     NODE_ENV=production
     FRONTEND_URL=https://your-frontend-domain.vercel.app
     ```

4. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

### Step 3: Deploy Frontend to Vercel

1. **Update Frontend Environment**
   ```bash
   cd frontend
   # Create .env.production file
   echo "REACT_APP_API_URL=https://your-backend-domain.vercel.app/api" > .env.production
   ```

2. **Deploy Frontend**
   ```bash
   vercel
   ```

3. **Configure Environment Variables**
   - Go to Vercel dashboard
   - Select your frontend project
   - Go to Settings > Environment Variables
   - Add:
     ```
     REACT_APP_API_URL=https://your-backend-domain.vercel.app/api
     ```

4. **Redeploy**
   ```bash
   vercel --prod
   ```

## 🌊 Heroku Deployment

### Step 1: Deploy Backend to Heroku

1. **Install Heroku CLI**
   ```bash
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Create Heroku App**
   ```bash
   cd backend
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-atlas-connection-string
   heroku config:set JWT_SECRET=your-super-secret-jwt-key
   heroku config:set JWT_EXPIRE=7d
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-frontend-domain.herokuapp.com
   ```

4. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Step 2: Deploy Frontend to Heroku

1. **Create Frontend App**
   ```bash
   cd frontend
   heroku create your-frontend-app-name
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set REACT_APP_API_URL=https://your-backend-app-name.herokuapp.com/api
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy frontend to Heroku"
   git push heroku main
   ```

## 📦 Docker Deployment

### Step 1: Create Dockerfile for Backend

Create `backend/Dockerfile`:
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

### Step 2: Create Dockerfile for Frontend

Create `frontend/Dockerfile`:
```dockerfile
FROM node:16-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Step 3: Create Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      MONGODB_URI: mongodb://admin:password@mongodb:27017/task-manager?authSource=admin
      JWT_SECRET: your-super-secret-jwt-key
      JWT_EXPIRE: 7d
      NODE_ENV: production
      FRONTEND_URL: http://localhost:3000
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    depends_on:
      - backend

volumes:
  mongodb_data:
```

### Step 4: Deploy with Docker

```bash
# Build and run
docker-compose up --build

# Run in background
docker-compose up -d --build
```

## 🔧 Environment Variables Reference

### Backend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRE` | JWT expiration time | No | 7d |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No | - |
| `FRONTEND_URL` | Frontend URL for CORS | No | http://localhost:3000 |
| `MAX_FILE_SIZE` | Max file upload size | No | 10485760 |
| `ALLOWED_FILE_TYPES` | Allowed file types | No | image/*,application/pdf,... |

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_API_URL` | Backend API URL | Yes | http://localhost:5000/api |
| `REACT_APP_BACKEND_URL` | Backend URL | No | http://localhost:5000 |
| `REACT_APP_ENV` | Environment | No | development |
| `REACT_APP_MAX_FILE_SIZE` | Max file size | No | 10485760 |
| `REACT_APP_ALLOWED_FILE_TYPES` | Allowed file types | No | image/*,application/pdf,... |
| `REACT_APP_APP_NAME` | Application name | No | Task Manager |
| `REACT_APP_APP_VERSION` | Application version | No | 1.0.0 |

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Set up MongoDB Atlas with proper authentication
- [ ] Configure CORS properly
- [ ] Use HTTPS in production
- [ ] Set up rate limiting
- [ ] Configure proper file upload limits
- [ ] Use environment variables for sensitive data
- [ ] Set up proper logging
- [ ] Configure backup strategy for database
- [ ] Set up monitoring and alerts

### SSL/HTTPS Setup

For Vercel and Heroku, SSL is automatically configured. For custom domains:

1. **Vercel**: Automatic SSL with custom domains
2. **Heroku**: Automatic SSL with paid plans
3. **Custom Server**: Use Let's Encrypt or your SSL provider

## 📊 Monitoring and Logs

### Vercel Monitoring

- Built-in analytics and performance monitoring
- Function logs in dashboard
- Real-time metrics

### Heroku Monitoring

```bash
# View logs
heroku logs --tail

# Monitor dyno usage
heroku ps

# Check app status
heroku status
```

### Custom Monitoring

Consider setting up:
- Application performance monitoring (APM)
- Error tracking (Sentry)
- Uptime monitoring
- Database monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd backend && npm install
      - run: cd backend && npm test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./backend

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.FRONTEND_PROJECT_ID }}
          working-directory: ./frontend
```

## 🆘 Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `FRONTEND_URL` in backend environment
   - Ensure frontend URL is correct

2. **Database Connection Issues**
   - Verify MongoDB Atlas connection string
   - Check network access settings
   - Ensure database user has proper permissions

3. **File Upload Issues**
   - Check file size limits
   - Verify allowed file types
   - Ensure upload directory exists

4. **Authentication Issues**
   - Verify JWT secret is set
   - Check token expiration settings
   - Ensure proper CORS configuration

### Debug Commands

```bash
# Check backend logs
vercel logs
heroku logs --tail

# Test API endpoints
curl -X GET https://your-api.vercel.app/api/health

# Check environment variables
vercel env ls
heroku config
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review platform-specific documentation
3. Open an issue in the repository
4. Contact the developer (Rogshivam) 