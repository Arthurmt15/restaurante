FROM node:20-alpine AS build

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY --from=build /app/.next ./.next
COPY --from=build /app/next.config.js ./

EXPOSE 3000

CMD ["npm", "start"]
