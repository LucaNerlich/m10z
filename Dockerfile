# https://sreyaj.dev/deploy-nodejs-applications-on-a-vps-using-coolify-with-dockerfile
FROM node:20-alpine

# install curl for healthcheck
RUN apk --no-cache add curl

ARG PORT

ENV PORT=$PORT
ENV NODE_ENV=production

# https://stackoverflow.com/a/65443098/4034811
WORKDIR /app
# starts in repo root
COPY . /app

# Install dependencies
RUN npm install --legacy-peer-deps

RUN npm run generateAuthors
RUN npm run generateAudioFeed
RUN npm run coolify-build

# Expose port
EXPOSE $PORT

# Start the Docusaurus application
CMD ["npm", "run", "coolify"]
