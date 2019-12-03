FROM node:12-slim

COPY . /app

WORKDIR /app

RUN npm i
RUN npm run build

EXPOSE 8080

ENTRYPOINT [ "node", "dist/Main.js" ]