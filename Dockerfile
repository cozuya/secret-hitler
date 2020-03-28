FROM node:12

WORKDIR /application

COPY ./ ./

RUN yarn --ignore-engines --frozen-lockfile
RUN yarn build

ENTRYPOINT node bin/dev.js
