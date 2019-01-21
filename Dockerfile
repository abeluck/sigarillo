FROM node:10-stretch  as builder
LABEL maintainer="Abel Luck <abel@guardianproject.info>"
ARG SIGARILLO_DIR=/opt/sigarillo
RUN mkdir -p ${SIGARILLO_DIR}/
COPY package.json yarn.lock ${SIGARILLO_DIR}/
RUN chown -R node:node ${SIGARILLO_DIR}/
USER node
WORKDIR ${SIGARILLO_DIR}
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
ARG SIGARILLO_DIR=/opt/sigarillo
ENV SIGARILLO_DIR ${SIGARILLO_DIR}
ENV SIGARILLO_READY_FILE ${SIGARILLO_DIR}/sigarillo.ready

RUN DEBIAN_FRONTEND=noninteractive apt-get update && \
    apt-get install -y --no-install-recommends \
    dumb-init
RUN mkdir -p ${SIGARILLO_DIR}
RUN chown -R node:node ${SIGARILLO_DIR}/
RUN mkdir -p /var/lib/sigarillo
RUN chown -R node:node /var/lib/sigarillo
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
USER node
WORKDIR ${SIGARILLO_DIR}
COPY --from=builder ${SIGARILLO_DIR}/node_modules ./node_modules
EXPOSE 3000
ENV PORT 3000
ENV SECRETS changeme
ENV NODE_ENV production
ENV DATA_PATH /var/lib/sigarillo
ENV DB_CLIENT pg
COPY src ./src
COPY package.json ./
ENTRYPOINT ["/docker-entrypoint.sh"]
