# Claude Code Prompt — Voice Command Shopping Assistant

## How to Use This

Copy the SYSTEM PROMPT section below and set it as your Claude Code project instructions (CLAUDE.md in your repo root). This gives Claude Code full context about your project architecture, coding standards, and what has been decided so that every interaction is productive without re-explaining.

---

## CLAUDE.md (Place in repo root)

```markdown
# CLAUDE.md — Voice Command Shopping Assistant

## Project Overview

Voice-first shopping list manager with marketplace UI. Users speak to add/remove/search items. 
NLP pipeline (spaCy + LLM fallback) parses commands. ML-powered recommendations (Apriori + Item2Vec 
trained on Instacart 3.4M orders) suggest co-purchases, substitutes, seasonal items.

## Architecture

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + React Router v6
- **Backend:** FastAPI + Python 3.11 + SQLAlchemy + SQLite (dev) / PostgreSQL (prod)
- **STT:** Faster Whisper (base model, CPU, int8 quantization)
- **NLP:** spaCy (en_core_web_md) primary + Groq API (Llama 3.1 8B) fallback
- **Recommendations:** Apriori (mlxtend) + Item2Vec (gensim Word2Vec) + seasonal + frequency
- **Deployment:** Vercel (frontend) + Railway (backend)

## Project Structure

```
voice-shopping-assistant/
├── CLAUDE.md                          # This file
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                        # FastAPI app entry, CORS, startup events
│   ├── config.py                      # Pydantic Settings (env vars)
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── voice.py               # POST /voice/command, /voice/transcribe, /voice/process
│   │       ├── lists.py               # CRUD /lists/{id}, /lists/{id}/items/{id}
│   │       ├── store.py               # GET /store/home, /store/category/{name}, /store/product/{name}/related, /store/search
│   │       └── health.py              # GET /health
│   │
│   ├── stt/
│   │   ├── __init__.py
│   │   └── whisper_service.py         # Faster Whisper model loading + transcription
│   │
│   ├── nlp/
│   │   ├── __init__.py
│   │   ├── pipeline.py                # Hybrid router: spaCy → LLM fallback
│   │   ├── preprocessor.py            # Text normalization, number words, filler removal
│   │   ├── spacy_parser.py            # Intent classification + entity extraction
│   │   └── llm_fallback.py            # Groq API structured extraction
│   │
│   ├── recommendations/
│   │   ├── __init__.py
│   │   ├── engine.py                  # Orchestrator: combines all layers
│   │   ├── co_purchase.py             # Apriori association rules
│   │   ├── similarity.py              # Item2Vec cosine similarity
│   │   ├── seasonal.py                # Month-based seasonal items
│   │   ├── personal.py                # User purchase frequency analysis
│   │   └── llm_suggestions.py         # LLM fallback for cold-start items
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── list_manager.py            # Shopping list business logic (add, remove, modify, check, clear)
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── database.py                # SQLAlchemy engine, session, init_db
│   │   ├── orm.py                     # ORM models (User, ShoppingList, ListItem, PurchaseHistory, ItemCatalog, CoPurchaseRule)
│   │   └── schemas.py                 # Pydantic request/response schemas
│   │
│   ├── data/
│   │   ├── item_catalog.json          # 3000 items with categories (derived from Instacart)
│   │   ├── co_purchase_rules.json     # Apriori output: item → top co-purchases
│   │   ├── seasonal_items.json        # Month → seasonal items
│   │   ├── substitutes.json           # Item → substitute items
│   │   ├── category_mapping.json      # Instacart aisle → simplified category
│   │   └── models/
│   │       └── item2vec.model         # Trained gensim Word2Vec model
│   │
│   └── tests/
│       ├── __init__.py
│       ├── test_nlp.py
│       ├── test_api.py
│       ├── test_recommendations.py
│       ├── nlp_accuracy_report.py
│       └── test_data/
│           └── voice_commands.json    # 100 test transcripts with expected outputs
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── index.html
│   │
│   └── src/
│       ├── App.tsx                    # Router setup, providers
│       ├── main.tsx                   # Entry point
│       │
│       ├── pages/
│       │   ├── HomePage.tsx           # Marketplace storefront
│       │   ├── CategoryPage.tsx       # Product grid for a category
│       │   └── MyListPage.tsx         # Shopping list management
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Layout.tsx         # TopBar + Outlet + BottomNav
│       │   │   ├── TopBar.tsx
│       │   │   ├── BottomNav.tsx
│       │   │   └── ListBadge.tsx
│       │   │
│       │   ├── voice/
│       │   │   ├── VoiceButton.tsx     # Mic button in bottom nav
│       │   │   ├── VoiceOverlay.tsx    # Full-screen voice interaction modal
│       │   │   └── TranscriptDisplay.tsx
│       │   │
│       │   ├── store/
│       │   │   ├── SearchVoiceBar.tsx  # Unified search + voice input
│       │   │   ├── CategoryGrid.tsx    # Category cards grid
│       │   │   ├── CategoryCard.tsx
│       │   │   ├── ProductCard.tsx     # Reusable product card (compact + grid variants)
│       │   │   ├── ProductCardRow.tsx  # Horizontal scroll container
│       │   │   ├── ProductSheet.tsx    # Bottom sheet with product details + suggestions
│       │   │   └── SectionHeader.tsx
│       │   │
│       │   ├── list/
│       │   │   ├── ShoppingList.tsx
│       │   │   ├── CategoryGroup.tsx
│       │   │   ├── ListItem.tsx
│       │   │   ├── EmptyListState.tsx
│       │   │   └── QuantityStepper.tsx
│       │   │
│       │   └── shared/
│       │       ├── CategoryBadge.tsx
│       │       ├── ChipButton.tsx
│       │       ├── Toast.tsx
│       │       ├── SkeletonLoader.tsx
│       │       └── SwipeToDelete.tsx
│       │
│       ├── hooks/
│       │   ├── useAudioRecorder.ts
│       │   ├── useWebSpeechFallback.ts
│       │   ├── useVoiceAssistant.ts
│       │   ├── useShoppingList.ts
│       │   ├── useHomeData.ts
│       │   ├── useCategoryProducts.ts
│       │   ├── useProductSuggestions.ts
│       │   └── useSpeechSynthesis.ts
│       │
│       ├── services/
│       │   └── api.ts                 # Backend API client (fetch wrapper)
│       │
│       ├── types/
│       │   └── index.ts              # All TypeScript interfaces
│       │
│       └── styles/
│           └── globals.css           # Tailwind imports + CSS variables + animations
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_association_rules.ipynb
│   ├── 03_item2vec.ipynb
│   └── 04_seasonal_patterns.ipynb
│
├── data/                             # Raw data (gitignored)
│   └── instacart/
│       ├── orders.csv
│       ├── order_products__prior.csv
│       ├── products.csv
│       ├── aisles.csv
│       └── departments.csv
│
└── docs/
    ├── APPROACH.md                   # 200-word writeup
    ├── ARCHITECTURE.md               # System design doc
    ├── NLP_ACCURACY.md               # Benchmark results
    ├── RECOMMENDATION.md             # ML model training details
    └── PRD.md                        # Product requirements
```

## Coding Standards

### Python (Backend)
- Python 3.11+
- Type hints on all function signatures
- Docstrings on all public functions (Google style)
- Pydantic for all request/response validation
- SQLAlchemy ORM, never raw SQL strings
- Async endpoints for IO-bound operations (STT, LLM calls)
- Logging via `logging` module, not print()
- Constants at module level, UPPER_SNAKE_CASE
- Error handling: raise HTTPException with specific status codes and detail messages
- No wildcard imports

### TypeScript (Frontend)
- Strict TypeScript (no `any` unless absolutely necessary, and comment why)
- Functional components only, no class components
- Custom hooks for all stateful logic (no business logic in components)
- Props interfaces defined inline or in types/index.ts
- Tailwind for styling, no CSS modules or styled-components
- No Redux, no Zustand — useReducer + Context for global state, useState for local
- API calls only through services/api.ts, never directly in components
- Error boundaries around major sections

### General
- No commented-out code in commits
- No console.log in production code (use proper logging)
- No hardcoded API URLs (use environment variables)
- No secrets in code (use .env)
- Meaningful variable names — `itemName` not `x`, `categoryProducts` not `data`
- Functions do one thing
- Files under 300 lines — split if longer

## Key Decisions (Do Not Revisit)

1. Faster Whisper base model on CPU with int8 quantization for STT
2. spaCy (en_core_web_md) as primary NLP, Groq Llama 3.1 8B as fallback at confidence < 0.85
3. Apriori + Item2Vec trained on Instacart dataset for recommendations
4. SQLite for dev, PostgreSQL for production via SQLAlchemy (swap via env var)
5. Marketplace UI — not a simple list app. Home page is a storefront.
6. Mobile-first design, 375px minimum width
7. Web Speech API as client-side fallback for instant interim transcripts
8. No user authentication in v1 — single default user
9. MediaRecorder API for audio capture (works in all browsers, unlike Web Speech API)
10. Vercel for frontend deployment, Railway for backend

## Database Schema

Tables: users, shopping_lists, list_items, purchase_history, item_catalog, co_purchase_rules
See backend/models/orm.py for full schema.
Key indexes: list_items(list_id), list_items(item_name_lower), purchase_history(user_id, item_name_lower)

## API Endpoints Summary

Voice:
  POST /api/voice/command     — full pipeline: audio → STT → NLP → action → response
  POST /api/voice/transcribe  — STT only
  POST /api/voice/process     — NLP only (text in, parsed command out)

Lists:
  POST   /api/lists/                    — create list
  GET    /api/lists/{id}                — get list with items grouped by category
  DELETE /api/lists/{id}                — delete list
  POST   /api/lists/{id}/items          — add item
  PATCH  /api/lists/{id}/items/{item_id} — update item
  DELETE /api/lists/{id}/items/{item_id} — remove item
  GET    /api/lists/{id}/share          — shareable text

Store (marketplace):
  GET /api/store/home                       — homepage data (seasonal, popular, reorder, categories)
  GET /api/store/category/{name}?page=1     — paginated products in category
  GET /api/store/product/{name}/related     — co-purchase + substitutes for product
  GET /api/store/search?q=apples            — search catalog

Health:
  GET /api/health

## Testing

- NLP: 100 test commands in backend/tests/test_data/voice_commands.json
- Run: `cd backend && python -m pytest tests/`
- Accuracy report: `cd backend && python -m tests.nlp_accuracy_report`
- Frontend: `cd frontend && npm test`

## Environment Variables

```env
# Backend
DATABASE_URL=sqlite:///./shopping.db
GROQ_API_KEY=your_groq_api_key
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
SPACY_MODEL=en_core_web_md
NLP_CONFIDENCE_THRESHOLD=0.85
DATA_DIR=./data
CORS_ORIGINS=["http://localhost:5173"]
DEBUG=true

# Frontend
VITE_API_URL=http://localhost:8000
```
```

---

## Folder-by-Folder Purpose (Quick Reference When Coding)

```
backend/api/routes/     → HTTP layer only. No business logic. Calls services/managers.
backend/stt/            → Whisper model loading and transcription. Pure STT, no NLP.
backend/nlp/            → All text understanding. preprocessor → spacy → llm fallback → pipeline router.
backend/recommendations/→ All suggestion logic. Each file = one recommendation layer.
backend/services/       → Business logic. list_manager.py handles add/remove/modify/check with DB.
backend/models/         → Data layer. ORM models, Pydantic schemas, DB session.
backend/data/           → Static artifacts. JSON files + trained ML models. Loaded at startup.
backend/tests/          → All tests + benchmark scripts.

frontend/src/pages/     → One file per route. Composes components.
frontend/src/components/→ Grouped by domain (voice/, store/, list/, shared/, layout/).
frontend/src/hooks/     → All stateful logic. Components are pure render.
frontend/src/services/  → API client. Single source of truth for backend communication.
frontend/src/types/     → TypeScript interfaces. Shared across all files.

notebooks/              → Jupyter notebooks for data exploration + model training. Not deployed.
data/                   → Raw Instacart CSVs. Gitignored. Only artifacts in backend/data/ are committed.
docs/                   → All documentation. PRD, architecture, accuracy reports, approach writeup.
```

---

## Common Claude Code Commands

When working with Claude Code on this project, here are effective prompts for each phase:

### Phase 0 — Setup
```
Initialize the project. Create the directory structure as defined in CLAUDE.md.
Set up the FastAPI backend with health check, CORS, and database initialization.
Set up the Vite + React + TypeScript + Tailwind frontend.
Create docker-compose.yml for local dev. Both services should run.
Create the SQLAlchemy ORM models as specified.
```

### Phase 1 — Data Pipeline
```
Create a Jupyter notebook that loads the Instacart dataset from data/instacart/.
Map aisles to simplified categories using the mapping I'll provide.
Build item_catalog.json with top 3000 products.
Train Apriori association rules and save co_purchase_rules.json.
Train Item2Vec on order sequences and save the model.
Extract seasonal patterns and save seasonal_items.json.
```

### Phase 2 — STT
```
Implement the Faster Whisper service in backend/stt/whisper_service.py.
Load the base model at startup. Accept audio bytes, return transcript + language + confidence.
Create the POST /api/voice/transcribe endpoint.
Handle edge cases: empty audio, corrupt audio, unsupported format.
```

### Phase 3 — NLP
```
Implement the spaCy parser in backend/nlp/spacy_parser.py.
Support these intents: add_item, remove_item, modify_item, check_item, search_item, list_items, clear_list, get_suggestions.
Extract entities: item_name, quantity, unit, category, brand, price_max.
Use PhraseMatcher against item_catalog.json for item matching.
Implement confidence scoring.

Then implement the Groq LLM fallback in backend/nlp/llm_fallback.py.
Wire both into the hybrid pipeline in backend/nlp/pipeline.py.
Threshold: 0.85 confidence.
```

### Phase 4 — Backend CRUD
```
Implement ListManager in backend/services/list_manager.py.
Handle all intents from the NLP pipeline: add (with duplicate detection), remove (fuzzy matching),
modify, check, clear, search.
Create all CRUD endpoints in backend/api/routes/lists.py.
Wire the voice command endpoint to use STT → NLP → ListManager → response.
```

### Phase 5 — Recommendations
```
Implement the recommendation engine. Load all model artifacts at startup.
co_purchase.py: lookup from co_purchase_rules.json
similarity.py: load item2vec.model, cosine similarity
seasonal.py: load seasonal_items.json, filter by current month
personal.py: query purchase_history, compute reorder predictions
engine.py: orchestrate all layers, deduplicate, LLM fallback for unknown items
Create the store API endpoints in backend/api/routes/store.py.
```

### Phase 6 — Frontend
```
Build the marketplace UI for the Voice Shopping Assistant.
Refer to CLAUDE.md for complete component tree, state management types, and design specs.
Mobile-first, warm green + neutral palette, clean grocery store aesthetic.
Start with Layout + BottomNav + routing, then HomePage, then CategoryPage, then MyListPage.
Then voice components: VoiceButton, VoiceOverlay, audio recording hooks.
Then ProductSheet bottom sheet with co-purchase and substitute suggestions.
Use Tailwind only. CSS animations for voice states and list transitions.
```

### Phase 7 — Testing
```
Create test data: 100 voice commands in backend/tests/test_data/voice_commands.json.
Cover all intents, complex phrases, edge cases.
Write pytest tests for NLP parser, API endpoints, and recommendations.
Build the accuracy benchmark script that compares spaCy vs LLM vs hybrid.
Output results as a markdown table.
```

### Phase 8 — Deploy
```
Prepare for deployment.
Backend Dockerfile: Python 3.11-slim, ffmpeg, spaCy model, Whisper model pre-downloaded.
Frontend: build and deploy to Vercel.
Backend: deploy to Railway.
Configure CORS for production domain.
Write the README with architecture diagram, tech stack, NLP accuracy table, getting started.
Write the 200-word approach document.
```
