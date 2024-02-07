#!/bin/bash

downDatabase() {
    echo "Removing all databases..."
    pnpm database:down
    pnpm test:database:down
}

upDatabase() {
    echo "Starting the database..."
    pnpm database:up
    pnpm test:database:up
    sleep 3
}

migateDatabase() {
    echo "Migrating the database..."
    pnpm database:migrate
    pnpm test:database:migrate
}

downDatabase
upDatabase
migateDatabase