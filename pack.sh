#!/bin/bash
git log --format="%H" -n 1 > LAST_GIT_COMMIT
docker build -t dashboard-backend-nodejs:dev ./
docker save dashboard-backend-nodejs:dev | gzip > dashboard-backend-nodejs.dev.tgz
