FROM node:alpine
WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH
COPY package.json package-lock.json ./
COPY ./src ./src
COPY ./public ./public
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]