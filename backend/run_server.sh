#!/bin/bash
# Run this script from the project root directory

# Initialize conda for shell interaction
eval "$(conda shell.bash hook)"
conda activate web-geo

export PYGEOAPI_CONFIG=backend/local.config.yml
export PYGEOAPI_OPENAPI=backend/local.openapi.yml

# Check if pygeoapi is installed
if ! command -v pygeoapi &> /dev/null
then
    echo "pygeoapi could not be found. Please install dependencies first."
    echo "pip install -r backend/requirements.txt"
    exit 1
fi

# Generate OpenAPI document
pygeoapi openapi generate $PYGEOAPI_CONFIG > $PYGEOAPI_OPENAPI

# Download sample GLB if not exists
if [ ! -f backend/data/model.glb ]; then
    echo "Downloading sample GLB model..."
    curl -L -o backend/data/model.glb https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb
fi

# Start static file server for data (background)
echo "Starting static file server on http://localhost:5001"
python3 backend/simple_cors_server.py 5001 backend/data &
STATIC_PID=$!

# Run the pygeoapi server
echo "Starting pygeoapi on http://localhost:5002"
pygeoapi serve

# Kill static server when pygeoapi stops
kill $STATIC_PID
