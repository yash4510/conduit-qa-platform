# App under test: gothinkster/node-express-realworld-example-app
# (Express + Prisma + PostgreSQL). Pinned to a commit so builds are reproducible;
# the upstream repo is not archived and can change.
FROM node:20-alpine

ARG REPO=https://github.com/gothinkster/node-express-realworld-example-app.git
ARG SHA=30b68e1e881462b2f4164ea09ab4c4f5699c7b0b

# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache git openssl

WORKDIR /app

# Fetch exactly one commit; `git clone --branch` cannot take a SHA.
RUN git init -q . \
 && git remote add origin "$REPO" \
 && git fetch -q --depth 1 origin "$SHA" \
 && git checkout -q FETCH_HEAD \
 && rm -rf .git

# Upstream ships a package-lock.json, so `npm ci` gives a reproducible install.
RUN npm ci

# Nx daemon and cloud are pointless inside a one-shot image build.
ENV NX_DAEMON=false NX_NO_CLOUD=true
RUN npx prisma generate && npx nx build api --configuration=production

ENV PORT=3000
EXPOSE 3000

# Migrate on every start so a fresh volume (`docker compose down -v`) comes up usable.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/api/main.js"]
