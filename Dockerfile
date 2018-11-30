FROM node:10-stretch  as builder
LABEL maintainer="Abel Luck <abel@guardianproject.info>"
RUN mkdir -p /usr/src/app
RUN chown node:node /usr/src/app
USER node
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn --production

FROM node:10-stretch
RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y --no-install-recommends \
    dumb-init
RUN mkdir -p /usr/src/app
RUN chown node:node /usr/src/app
RUN mkdir -p /var/lib/sigarillo
RUN chown node:node /var/lib/sigarillo
USER node
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
EXPOSE 3000
ENV PORT=3000
ENV SECRETS=changeme,
ENV NODE_ENV=production
ENV DATA_PATH=/var/lib/sigarillo
ENV DB_CLIENT=
ENV DB_CONNECTION=
COPY src ./src
CMD ["dumb-init", "node", "src/index.js"]
