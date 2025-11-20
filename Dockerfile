# Use a Node.js image for the build and production environment
FROM node:20-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY package*.json ./

# Install all dependencies (including devDependencies for the build)
RUN npm install

# Copy the rest of the project files
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# The command to start the application will be taken from the Procfile
