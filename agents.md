# PaintPalette — Project Context

## Vision

PaintPalette is a community-driven web app for tabletop miniature painters. It lets gamers:

- **Share painted miniatures** — upload photos and showcase finished work.
- **Track collections** — catalogue owned paints and miniatures in one place.
- **Share painting recipes** — document step-by-step paint schemes tied to specific miniatures.
- **Find inspiration** — browse what other users have painted for the same or similar miniatures, discover new techniques and colour schemes.

## Core audience

Tabletop gamers and hobbyists who paint miniatures (e.g. Warhammer, D&D, historicals). Ranges from beginners looking for guidance to experienced painters sharing knowledge.

## Tech stack

- Static HTML / CSS / JS (no framework)
- Firebase Firestore (data)
- Firebase Storage (image uploads)

## Key data entities

| Entity     | Purpose                                         |
|------------|--------------------------------------------------|
| Paints     | User's paint collection (brand, colour, notes)   |
| Miniatures | User's miniature collection with photos          |
| Recipes    | Step-by-step painting guides tied to a miniature |

## Current state

Scaffolded with basic CRUD for paints, miniatures, and recipes against Firestore. No auth, no community/social features yet.

## Security rules

- **NEVER commit secrets, API keys, tokens, or credentials to the repo** — not in source files, config files, URLs, comments, or any other form. This includes Firebase config values. Use placeholder values (e.g. `REPLACE_ME`) in committed files and document how to supply real values locally.
- Keep `src/firebase-config.js` with placeholder values only; real config should be set up per-developer.
