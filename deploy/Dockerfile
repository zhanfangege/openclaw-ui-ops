FROM node:22-alpine

WORKDIR /app/openclaw-ui

COPY openclaw-ui/package*.json ./
RUN npm ci --omit=dev

COPY openclaw-ui/ ./

ENV PORT=18790
ENV HOST=0.0.0.0
EXPOSE 18790

CMD ["npm", "start"]
