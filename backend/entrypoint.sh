#!/bin/bash
set -e

# Default to localhost if API_URL is not set
TARGET_URL=${API_URL:-http://localhost:5002}
echo "Configuring pygeoapi for URL: $TARGET_URL"

# Replace http://localhost:5002 with the actual API_URL in the config file
# We use | as delimiter to avoid issues with slashes in the URL
sed -i "s|http://localhost:5002|$TARGET_URL|g" /app/local.config.yml

# Re-generate the OpenAPI document with the updated config
pygeoapi openapi generate /app/local.config.yml > /app/local.openapi.yml

# Start Gunicorn
# Exec replaces the shell with the gunicorn process, verifying signal handling
exec gunicorn --workers 1 --bind 0.0.0.0:8080 pygeoapi.flask_app:APP
