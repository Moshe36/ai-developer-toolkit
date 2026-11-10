# Project rules for AI agents

## Workshop deck

`workshop/agentic-workshop.pptx` contains manual edits by the user and is the source of truth.

- Never regenerate, rebuild or overwrite the whole deck. Change only the slides the user asks for.
- Edit existing slides directly in the .pptx through PowerPoint COM.
- For new slides only: design them with the helpers in `workshop/deck-src/build-deck.js`, build to a temp file, and copy the single slide in with `workshop/deck-src/replace-slides.ps1`. `build-deck.js` is a slide factory, not a mirror of the deck.
- Slide numbers are PowerPoint slide-number fields. Never type slide numbers as text.
- Read `workshop/deck-notes.md` before working on the deck.
