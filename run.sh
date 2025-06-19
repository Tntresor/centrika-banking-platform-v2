#!/bin/bash

# Simple deployment script for Replit Deployments
set -e

cd server && npm install && exec node index.js