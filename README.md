# PaintPalette

PaintPalette is a Firebase/Firestore-backed web app for miniature painters.

It supports:
- Uploading pictures of painted miniatures
- Tracking paint collection entries
- Tracking miniature collection entries
- Saving painting recipes for specific miniatures
- Browsing community recipes for the same miniature

## Tech stack

- Static HTML/CSS/JS
- Firebase Firestore (paints, miniatures, recipes)
- Firebase Storage (miniature photo uploads)

## Setup

1. Create a Firebase project with **Firestore** and **Storage** enabled.
2. Update `/home/runner/work/PaintPalette/PaintPalette/src/firebase-config.js` with your Firebase web config values.
3. Configure Firestore and Storage rules for your access model.
4. Start the app:

```bash
npm start
```

Then open `http://localhost:4173`.

## Data model

### `paints`
- `name`
- `brand`
- `colorFamily`
- `notes`
- `createdAt`

### `miniatures`
- `name`
- `faction`
- `scale`
- `notes`
- `imageUrl`
- `createdAt`

### `recipes`
- `miniatureId`
- `title`
- `paintIds` (array)
- `author`
- `steps`
- `createdAt`

## Tests

Run unit tests for shared utility logic:

```bash
npm test
```
