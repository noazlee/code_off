FROM node:20-slim
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY ./src ./src
COPY ./public ./public

EXPOSE 3000
CMD ["npm", "start"]