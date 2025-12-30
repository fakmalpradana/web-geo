# Geospatial Web Platform

A full-stack geospatial web application serving data via OGC API standards and visualizing it in a 3D environment using MapLibre GL JS and Three.js.

## Features

- **Backend**: Python `pygeoapi` serving OGC API - Features.
- **Frontend**: React + MapLibre GL JS + Three.js.
- **3D Visualization**:
    - Terrain (Raster-DEM).
    - 3D Models (glTF/GLB).
    - Vector Data (GeoJSON points).

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm

## Setup & Run

### 1. Backend

The backend serves the API and static data files.

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run the server from the project root
./backend/run_server.sh
```

Verify backend:
- OGC API: [https://web-geo-backend-ghrycmhzeq-et.a.run.app](https://web-geo-backend-ghrycmhzeq-et.a.run.app)
- Sample Data: 
```
curl -X 'GET' \
  'https://web-geo-backend-ghrycmhzeq-et.a.run.app/collections/terban/items?f=json&lang=en-US&limit=10&additionalProp1=%7B%7D&skipGeometry=false&offset=0' \
  -H 'accept: application/geo+json'
```

### 2. Frontend

The frontend is a React application.

```bash
cd frontend
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [https://web-geo-frontend-ghrycmhzeq-et.a.run.app](https://web-geo-frontend-ghrycmhzeq-et.a.run.app) to view the application.

## Usage

- **Navigate**: Left click to pan, Right click to rotate/pitch.
- **Terrain**: The map shows 3D terrain (exaggerated 1.5x).
- **Data**:
    - Red points are fetched from the OGC API (`/collections/obs`).
    - The 3D model (Duck) is loaded from the static server and placed at the sample location.

## Customization

- **Data**: Place new GLB models in `backend/data/` and update `Map3D.jsx` to point to them.
- **API**: Edit `backend/local.config.yml` to add new collections.

Deployment Complete!
Backend: https://web-geo-backend-ghrycmhzeq-et.a.run.app
Frontend: https://web-geo-frontend-ghrycmhzeq-et.a.run.app