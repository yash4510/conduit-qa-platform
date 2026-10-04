# App under test: gothinkster/react-redux-realworld-example-app (archived).
# Pinned to a commit so builds are reproducible.

# Node 16: the app uses react-scripts 1.1.1 (webpack 3), which predates Node 17+'s OpenSSL 3.
FROM node:16-alpine AS builder

ARG REPO=https://github.com/gothinkster/react-redux-realworld-example-app.git
ARG SHA=ee72eba4056392c95a27bc48d385d3f54ba38a18

RUN apk add --no-cache git

WORKDIR /app

RUN git init -q . \
 && git remote add origin "$REPO" \
 && git fetch -q --depth 1 origin "$SHA" \
 && git checkout -q FETCH_HEAD \
 && rm -rf .git

# Upstream hardcodes a public API. The browser (not a container) makes these calls,
# so it must target the API port published on the host.
RUN sed -i "s|https://conduit.productionready.io/api|http://localhost:3000/api|g" src/agent.js \
 && grep -q "http://localhost:3000/api" src/agent.js

# The theme URL upstream (demo.productionready.io/main.css) is dead (404). Serve the
# official RealWorld theme from our own image, pinned, so the UI never depends on a CDN.
# --checksum fails the build if the file content ever changes. --chmod because ADD from a
# URL writes mode 600, which the nginx worker cannot read (403).
ADD --checksum=sha256:f4b3d6224f725fc0ba08a943d931d341082e57cc8dac3a7cf7fff5b93b7a750c --chmod=644 \
    https://raw.githubusercontent.com/realworld-apps/realworld/ebbcdeb8d55b42a3a613c787560498b8ef10003f/assets/theme/styles.css \
    public/main.css
RUN sed -i "s|//demo.productionready.io/main.css|/main.css|" public/index.html \
 && grep -q 'href="/main.css"' public/index.html

# No lockfile upstream, so `npm ci` is not possible.
RUN npm install && npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
