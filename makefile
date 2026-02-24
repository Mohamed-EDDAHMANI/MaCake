# Makefile for managing all services with Docker Compose

.PHONY: up down restart logs build

up:
	docker-compose up -d

down:
	docker-compose down

restart:
	docker-compose down
	docker-compose up -d

logs:
	docker-compose logs -f

up-build:
	docker-compose up --build

build:
	docker-compose build
# Run all services in dev mode
start-dev:
	cd auth-service && npm run start:dev & \
	cd catalog-service && npm run start:dev & \
	cd gateway && npm run start:dev & \
	cd orders-service && npm run start:dev