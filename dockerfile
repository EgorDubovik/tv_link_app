FROM node

# Set the working directory
WORKDIR /var/www

# Copy the current directory contents into the container at /var/www
COPY . /var/www

# Install any needed packages specified in package.json
RUN npm install

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run app using node
CMD ["node", "server.js"]
