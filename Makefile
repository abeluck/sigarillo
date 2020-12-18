BUILD_DATE   ?=$(shell date -u +”%Y-%m-%dT%H:%M:%SZ”)
DOCKER_ARGS  ?=
DOCKER_NS    ?= registry.gitlab.com/digiresilience/link/sigarillo
DOCKER_TAG   ?= ${SIGARILLO_TAG}
DOCKER_BUILD := docker build ${DOCKER_ARGS} --build-arg BUILD_DATE=${BUILD_DATE} #--disable-content-trust=false
DOCKER_BUILD_FRESH := ${DOCKER_BUILD} --pull --no-cache
DOCKER_BUILD_ARGS := --build-arg VCS_REF=${CI_COMMIT_SHORT_SHA}
DOCKER_PUSH  := docker push #--disable-content-trust=false
DOCKER_BUILD_TAG := ${DOCKER_NS}:${DOCKER_TAG}

.PHONY: build build-fresh push build-push build-fresh-push clean env

env:
	@echo
	@echo
	@echo Build Environment
	@echo ---------------------------
	@echo "DOCKER_NS=${DOCKER_NS}"
	@echo "DOCKER_TAG=${DOCKER_TAG}"
	@echo "DOCKER_TAG_NEW=${DOCKER_TAG_NEW}"
	@echo "DOCKER_ARGS=${DOCKER_ARGS}"
	@echo ---------------------------
	@echo
	@echo

build: .npmrc
	${DOCKER_BUILD} ${DOCKER_BUILD_ARGS} -t ${DOCKER_BUILD_TAG} ${PWD}

build-fresh: .npmrc
	${DOCKER_BUILD_FRESH} ${DOCKER_BUILD_ARGS} -t ${DOCKER_BUILD_TAG} ${PWD}

push:
	${DOCKER_PUSH} ${DOCKER_BUILD_TAG}

build-push: build push
build-fresh-push: build-fresh push

add-tag:
	docker pull ${DOCKER_NS}:${DOCKER_TAG}
	docker tag ${DOCKER_NS}:${DOCKER_TAG} ${DOCKER_NS}:${DOCKER_TAG_NEW}
	docker push ${DOCKER_NS}:${DOCKER_TAG_NEW}

test: .npmrc
	npm install
	npm run build
	npm run ci:test

.npmrc:
	echo '@digiresilience:registry=https://gitlab.com/api/v4/packages/npm/' > .npmrc
	echo '@guardianproject-ops:registry=https://gitlab.com/api/v4/packages/npm/' >> .npmrc
	echo '//gitlab.com/api/v4/packages/npm/:_authToken=${CI_JOB_TOKEN}' >> .npmrc
	echo '//gitlab.com/api/v4/projects/:_authToken=${CI_JOB_TOKEN}' >> .npmrc
