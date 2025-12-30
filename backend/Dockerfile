FROM python:3.10-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for GDAL/PROJ if complex processing is required)
# For simple GeoJSON serving, pure python might suffice, but pygeoapi often needs them.
RUN apt-get update && apt-get install -y \
    libsqlite3-mod-spatialite \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the port
EXPOSE 8080

# Expose the port
EXPOSE 8080

ENV PYGEOAPI_CONFIG=/app/local.config.yml
ENV PYGEOAPI_OPENAPI=/app/local.openapi.yml

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Use entrypoint script to handle env substitution and startup
ENTRYPOINT ["/app/entrypoint.sh"]
