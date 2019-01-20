# Image and binary can be overidden with env vars.
DOCKER_IMAGE ?= abeluck/sigarillo

# Get the latest commit.
GIT_COMMIT = $(strip $(shell git rev-parse --short HEAD))

# Get the version number from the code
PACKAGE_VERSION=$(shell sed -nE 's/^\s*"version": "(.*?)",$$/\1/p' package.json)

# Find out if the working directory is clean
GIT_NOT_CLEAN_CHECK = $(shell git status --porcelain)
ifneq (x$(GIT_NOT_CLEAN_CHECK), x)
DOCKER_TAG_SUFFIX = -dirty
endif

# If we're releasing to Docker Hub, and we're going to mark it with the latest tag, it should exactly match a version release
ifeq ($(MAKECMDGOALS),release)
# Use the version number as the release tag.
DOCKER_TAG = $(PACKAGE_VERSION)

ifndef PACKAGE_VERSION
$(error Could not read version from package.json)
endif

# See what commit is tagged to match the version
VERSION_COMMIT = $(strip $(shell git rev-list $(PACKAGE_VERSION) -n 1 | cut -c1-7))
ifneq ($(VERSION_COMMIT), $(GIT_COMMIT))
$(error echo You are trying to push a build based on commit $(GIT_COMMIT) but the tagged release version is $(VERSION_COMMIT))
endif

# Don't push to Docker Hub if this isn't a clean repo
ifneq (x$(GIT_NOT_CLEAN_CHECK), x)
$(error echo You are trying to release a build based on a dirty repo)
endif

else
# Add the commit ref for development builds. Mark as dirty if the working directory isn't clean
DOCKER_TAG = $(PACKAGE_VERSION)-$(GIT_COMMIT)$(DOCKER_TAG_SUFFIX)
endif

SOURCES := $(shell find . -name '*.go')

default: build

# Build Docker image
build: docker_build output

# Build and push Docker image
release: docker_build docker_push output


docker_build:
	docker build \
  --build-arg BUILD_DATE=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ") \
  --build-arg VERSION=$(PACKAGE_VERSION) \
  --build-arg VCS_URL=$(shell git config --get remote.origin.url) \
  --build-arg VCS_REF=$(GIT_COMMIT) \
  -t $(DOCKER_IMAGE):$(DOCKER_TAG) .

docker_push:
	# Tag image as latest
	docker tag $(DOCKER_IMAGE):$(DOCKER_TAG) $(DOCKER_IMAGE):latest

	# Push to DockerHub
	docker push $(DOCKER_IMAGE):$(DOCKER_TAG)
	docker push $(DOCKER_IMAGE):latest

output:
	@echo Docker Image: $(DOCKER_IMAGE):$(DOCKER_TAG)
