FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY .env.example ./.env
EXPOSE 3001
CMD ["npm", "run", "start"]
