FROM node:18-alpine AS build
WORKDIR /app
COPY test-app/package*.json ./
RUN npm install --legacy-peer-deps
COPY test-app/ .
RUN npm run build

FROM nginx:alpine
COPY test-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 8080