FROM node:10-stretch  as builder
LABEL maintainer="Abel Luck <abel@guardianproject.info>"
RUN mkdir -p /usr/src/app
COPY package.json yarn.lock /usr/src/app/
RUN chown -R node:node /usr/src/app
USER node
WORKDIR /usr/src/app
RUN yarn --production

FROM node:10-stretch
LABEL maintainer="Abel Luck <abel@guardianproject.info>"
ARG BUILD_DATE
ARG VCS_REF
ARG VCS_URL
ARG VERSION

LABEL org.label-schema.schema-version="1.0"
LABEL org.label-schema.name="abeluck/sigarillo"
LABEL org.label-schema.description="Write Signal bots with https"
LABEL org.label-schema.build-date=$BUILD_DATE
LABEL org.label-schema.vcs-url=$VCS_URL
LABEL org.label-schema.vcs-ref=$VCS_REF
LABEL org.label-schema.version=$VERSION

RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init
RUN mkdir -p /usr/src/app
RUN chown -R node:node /usr/src/app
RUN mkdir -p /var/lib/sigarillo
RUN chown -R node:node /var/lib/sigarillo
USER node
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
EXPOSE 3000
ENV PORT=3000
ENV SECRETS=changeme
ENV NODE_ENV=production
ENV DATA_PATH=/var/lib/sigarillo
ENV DB_CLIENT=
ENV DB_CONNECTION=
COPY src ./src
COPY package.json ./
CMD ["dumb-init", "node", "src/index.js"]
