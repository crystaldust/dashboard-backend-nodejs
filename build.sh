#!/bin/bash
TAG=$1
if [ -z "$1" ]; then
	TAG=dev
fi

ORG=$2
if [ -z "$1" ]; then
	ORG=oss-know
fi

git log --format="%H" -n 1 > LAST_GIT_COMMIT
docker build -t $ORG/dashboard-backend-nodejs:$TAG ./
rm LAST_GIT_COMMIT

# docker save dashboard-backend-nodejs:$TAG | gzip > dashboard-backend-nodejs.dev.tgz
