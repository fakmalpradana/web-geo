#!/bin/bash

echo "Stopping servers..."

# Find PID for port 5001 (Static Server)
PID_5001=$(lsof -ti:5001)
if [ -n "$PID_5001" ]; then
  echo "Killing process on port 5001 (PID: $PID_5001)"
  kill $PID_5001
else
  echo "No process found on port 5001"
fi

# Find PID for port 5002 (Pygeoapi)
PID_5002=$(lsof -ti:5002)
if [ -n "$PID_5002" ]; then
  echo "Killing process on port 5002 (PID: $PID_5002)"
  kill $PID_5002
else
  echo "No process found on port 5002"
fi

echo "Servers stopped."
