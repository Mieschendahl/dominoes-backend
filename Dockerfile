FROM node:22-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

ARG START_SCRIPT
ENV START_SCRIPT=$START_SCRIPT

EXPOSE 4000

CMD ["sh", "-c", "pnpm $START_SCRIPT"]