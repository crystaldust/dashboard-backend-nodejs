FROM node:lts-slim
RUN npm install -g pm2
WORKDIR /app
ADD airflow.js ./
ADD ck.js ./
ADD errors.js ./
ADD postgres.js ./
ADD auth.js ./
ADD github.js ./
ADD jobqueue.js ./
ADD app.js ./
ADD package-lock.json ./
ADD package.json ./
ADD yarn.lock ./
ADD LAST_GIT_COMMIT ./

RUN yarn

CMD ["pm2-runtime", "start", "app.js"]
