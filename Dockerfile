FROM node:14

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies in the image
RUN npm install

# Copy the rest of your app's source code to the working directory
COPY . .

# Expose the port your app runs on
EXPOSE 8080

# Define the command to run your app
CMD [ "node", "server.js" ]
