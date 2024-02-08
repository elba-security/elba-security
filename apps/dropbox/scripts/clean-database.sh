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
}

generate() {
    echo "Generating the database..."
    sleep 2
    pnpm database:generate
}

migateDatabase() {
    echo "Migrating the database..."
    sleep 2
    pnpm database:migrate
    pnpm test:database:migrate
}

downDatabase
upDatabase
generate
migateDatabase