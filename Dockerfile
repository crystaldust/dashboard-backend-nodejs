FROM node:lts-slim
RUN npm install -g pm2
WORKDIR /app
ADD ck.js ./
ADD app.js ./
ADD package-lock.json ./
ADD package.json ./
ADD yarn.lock ./

RUN yarn

CMD ["pm2-runtime", "start", "app.js"]
