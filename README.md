# Voice Command Shopping Assistant

A voice-first grocery list manager with a marketplace UI. Speak naturally in any language to add, remove, and search items. ML-powered suggestions from 3.4M real grocery transactions.

**[Live Demo](#)** | **[Approach Document](docs/APPROACH.md)** | **[NLP Accuracy Report](docs/NLP_ACCURACY.md)**

---

## My Understanding of the Problem Statement

Grocery list management is a low-attention task. You are cooking and realize you need eggs. You are driving and remember you forgot rice. Typing on a phone is slow and interruptive.

Existing voice assistants treat shopping lists as dumb append-only text. No understanding of quantities. No category organization. No awareness that people who buy pasta usually need pasta sauce.

I built something different: a system that understands natural speech, organizes items automatically, and suggests what you probably forgot -- backed by ML models trained on 3.4 million real grocery orders.

---

## What It Does

```
You say:  "I think we need a dozen eggs and some pasta"

System:   STT (Groq Whisper) → translates to English if needed
          NLP (spaCy) → intent: add_item
                        items: [eggs (qty: 12, dairy), pasta (qty: 1, grains)]
          Action → adds both to list, grouped by category
          ML → suggests: Pasta Sauce, Parmesan Cheese, Garlic Bread
          UI → green toast: "Added 2 items" + suggestion chips with [+] buttons
```

---

## Architecture

```
                          ┌────────────────────────-─┐
                          │       YOUR BROWSER       │
                          │                          │
                          │  Mic → MediaRecorder     │
                          │  (captures audio, WebM)  │
                          │                          │
                          │  Web Speech API (Chrome) │
                          │  (instant interim text)  │
                          │                          │
                          │  React + TS + Tailwind   │
                          │  → Vercel (free, CDN)    │
                          └────────────┬─────────────┘
                                       │
                          audio blob OR transcript
                                       │
                          ┌────────────▼─────────────┐
                          │    FastAPI Backend       │
                          │    Render (free, 512MB)  │
                          │                          │
                          │  1. STT                  │
                          │     Groq Whisper large-v3│
                          │     translations endpoint│
                          │     (any lang → English) │
                          │                          │
                          │  2. NLP                  │
                          │     spaCy (12ms, 85%)    │
                          │     + Groq LLM (15%)     │
                          │                          │
                          │  3. Catalog Validation   │
                          │     match → add (green)  │
                          │     no match → suggest   │
                          │     null → "didn't catch"│
                          │                          │
                          │  4. Recommendations      │
                          │     Apriori co-purchase  │
                          │     Item2Vec similarity  │
                          │     Seasonal + Reorder   │
                          │     (all pre-computed,   │
                          │      ~9MB in-memory)     │
                          │                          │
                          └────────────┬─────────────┘
                                       │
                               SQL (SQLAlchemy)
                                       │
                          ┌────────────▼─────────────┐
                          │  MySQL on Aiven (free)   │
                          │  5GB, persistent         │
                          └──────────────────────────┘
```

**Total cost: $0.** No credit card required on any service.

---

## The Pipeline — How a Voice Command Flows

This is the exact flow for every voice command, including the multilingual fix I added after Hindi input was failing:

```
Audio (any language)
  │
  ▼
Groq Whisper API — translations endpoint (NOT transcriptions)
  │  Translates Hindi, Spanish, Telugu, etc. → English transcript
  │  "thodi cheeni daal do" → "add some sugar"
  ▼
NLP Pipeline (spaCy + LLM fallback)
  │  Parses English transcript → intent + entities
  │  intent: add_item, item: sugar, qty: 1, category: grains_pasta
  ▼
Catalog Validation
  │
  ├── Match found?     → Add to list → Green toast: "Added sugar"
  │                       + co-purchase suggestions
  │
  ├── No match found?  → Blue toast: "Couldn't find X"
  │                       + amber text with similar items from catalog
  │
  └── Null item?       → Blue toast: "Couldn't understand that"
                          + amber text: "Try saying: add milk"
```

### Why translations instead of transcriptions

This was a mid-build fix. Here is what happened:

I originally used Groq's `transcriptions` endpoint. It transcribes audio in the original language. So Hindi audio came back as Hindi text: "thodi cheeni aur doodh daal do". Then my spaCy parser -- which only understands English -- could not extract any intent or entity. Confidence dropped to 0.2. The LLM fallback handled it sometimes, but inconsistently.

The fix was one word. Groq's Whisper API has two endpoints: `transcriptions` (same language out) and `translations` (always English out). Switching to `translations` means every language gets converted to English before NLP touches it. spaCy works perfectly on the translated English. No multilingual spaCy models needed. No separate language detection step. The pipeline becomes language-agnostic without any NLP changes.

```python
# Before (broke on Hindi):
result = client.audio.transcriptions.create(file=audio, model="whisper-large-v3")
# Returned: "thodi cheeni daal do" → spaCy confused

# After (works on everything):
result = client.audio.translations.create(file=audio, model="whisper-large-v3")
# Returned: "add some sugar" → spaCy handles it perfectly
```

---

## Where I Failed and What I Did About It

### 1. Memory budget blew past the limit

**What happened:** First architecture had Faster Whisper (150-300MB) + spaCy medium (200MB) + gensim Item2Vec model (50-200MB) + FastAPI, all in one process. Total: 600-900MB. Render free tier: 512MB. Would crash on first request.

**What I did:** Moved STT to Groq API (zero RAM). Defaulted to spaCy small model (30MB vs 200MB). Pre-computed all Item2Vec similarities to JSON (eliminated gensim from production). Final footprint: ~160MB. 350MB headroom.

### 2. Hindi voice commands produced gibberish

**What happened:** Used Groq `transcriptions` endpoint. Hindi audio transcribed as Hindi text. spaCy (English-only) returned confidence 0.2 on every Hindi command. LLM fallback worked sometimes but was slow and inconsistent.

**What I did:** Switched to `translations` endpoint. Whisper translates any language to English before returning the transcript. spaCy processes clean English every time. Zero NLP changes required. One-line fix, solved multilingual completely.

### 3. Apriori crashed on full dataset

**What happened:** 3.4M orders one-hot encoded into a product-feature matrix. Exceeded 8GB RAM. Training either crashed or ran for 40+ minutes.

**What I did:** Sampled 200K baskets randomly. Statistical patterns at 200K are nearly identical to full set for popular items. Training time: 3-5 minutes.

### 4. Item2Vec produced garbage similarities

**What happened:** First training run: "Banana" was most similar to "Trash Bags". Default CBOW mode with small window learned surface-level co-occurrence noise, not semantic similarity.

**What I did:** Switched to Skip-gram (sg=1). Increased epochs from 5 to 15. Shuffled items within baskets to remove cart-order artifacts. Category coherence went from ~30% to ~55%.

### 5. SQLite wiped on every deploy

**What happened:** Render uses ephemeral containers. SQLite stores data in a file. Deploy → file gone → all user data lost.

**What I did:** Switched to MySQL on Aiven (5GB free). SQLAlchemy makes this a one-line env var change. Added connection pooling with `pool_recycle=3600` for Aiven's idle timeout.

### 6. Cold starts killed the demo

**What happened:** Render free tier sleeps after 15 min inactivity. Recruiter visits → 30-60 second wait → terrible first impression.

**What I did:** UptimeRobot (free) pings `/api/health` every 5 minutes. Container never sleeps. Frontend on Vercel never sleeps either. App is always ready.

---

## ML Models and Where You See Them

### Training (one-time, on laptop)

| Model | Algorithm | Training Data | Output |
|-------|-----------|--------------|--------|
| Co-purchase rules | Apriori (mlxtend) | 200K order baskets from Instacart | `co_purchase_rules.json` (~2MB) |
| Product similarity | Item2Vec (Word2Vec via gensim) | 3.4M order sequences | `item_similarities.json` (~5MB) |
| Substitutes | Item2Vec, similarity > 0.7 | Same as above | `substitutes.json` (~500KB) |
| Seasonal patterns | Keyword matching + agricultural data | Instacart product catalog | `seasonal_items.json` (<100KB) |

### Serving (runtime, zero ML inference)

All models are pre-computed to JSON dictionaries. Loaded into memory at startup (~9MB total). Lookups are Python dict accesses: sub-millisecond, no ML libraries needed in production.

### Where each model appears on screen

| UI Element | What you see | ML Model | How it works |
|-----------|-------------|----------|-------------|
| Home: "Fresh This Season" | Horizontal scroll of seasonal product cards | Seasonal analysis | Current month filters seasonal_items.json |
| Home: "Running low on" | Cards with "last bought 7 days ago" | Purchase frequency | Queries purchase_history, compares avg_interval |
| Home: "Popular Items" | Top products by order count | Instacart frequency | Sorted by order_count from 3.4M orders |
| Voice overlay: suggestion chips | "Pasta Sauce [+]" after adding Pasta | Apriori co-purchase | co_purchase_rules["pasta"] → top 3 |
| Product sheet: "Bought together" | Horizontal scroll under product details | Apriori co-purchase | Same rules, per-product view |
| Product sheet: "Try instead" | Alternative products | Item2Vec similarity | item_similarities["pasta"] filtered by score > 0.7 |
| My List: "Complete Your List" | Suggestions based on full list | Apriori (cross-item) | Aggregated rules across all list items |
| Search results ranking | Most relevant first | Order frequency | Weighted by Instacart order counts |
| Category auto-assignment | Items grouped by aisle | Catalog lookup | 3000-item catalog with 15 categories |
| Intent parsing | Understanding "grab a dozen eggs" | spaCy + Groq LLM | Hybrid: fast local + accurate fallback |

---

## NLP Pipeline

### Hybrid approach: why not just use an LLM for everything?

| Approach | Latency | Cost | Reliability | Accuracy |
|----------|---------|------|------------|----------|
| spaCy only | 12ms | Free | Works offline | ~85% on common commands |
| LLM only | 300-500ms | Rate-limited | Depends on API | ~95% on everything |
| **Hybrid (what I built)** | **12ms (85%) / 500ms (15%)** | **Mostly free** | **Graceful degradation** | **~92% overall** |

spaCy handles the head of the distribution (common, clear commands) in 12ms. Groq Llama 3.1 8B handles the tail (ambiguous, complex, novel phrasing) in 300-500ms. If Groq is down, spaCy still works for most commands.

The confidence threshold (0.85) was tuned on 100 test commands. Above 0.85, spaCy alone achieves 94% accuracy. Below 0.85, the LLM fallback catches most of what spaCy misses.

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + TypeScript + Tailwind + Vite | Type safety, fast builds, utility CSS |
| Hosting (FE) | Vercel | Free, never sleeps, global CDN |
| Backend | FastAPI + Python 3.11 | Async, fast, Python ML ecosystem |
| Hosting (BE) | Render free tier | 512MB RAM, Docker support, no credit card |
| STT | Groq Whisper large-v3 (translations) | Best accuracy, all languages → English, zero RAM |
| NLP (primary) | spaCy en_core_web_sm | 12ms, 30MB RAM, handles 85% |
| NLP (fallback) | Groq Llama 3.1 8B | Complex/ambiguous commands |
| Recommendations | Pre-computed JSON (Apriori + Item2Vec) | ~9MB in-memory, <1ms lookups |
| Database (dev) | SQLite | Zero config |
| Database (prod) | MySQL on Aiven | 5GB free, persistent |
| Keepalive | UptimeRobot | Free, pings every 5 min |

---

## Running Locally

### Prerequisites

- Docker and Docker Compose
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/voice-shopping-assistant.git
cd voice-shopping-assistant

cp .env.example .env
# Add your GROQ_API_KEY to .env

docker-compose up
```

Frontend: http://localhost:5173  
Backend: http://localhost:8000  
Health check: http://localhost:8000/api/health

### Without Docker

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
voice-shopping-assistant/
├── backend/
│   ├── api/routes/          # HTTP endpoints (voice, lists, store, health)
│   ├── stt/                 # Groq Whisper STT service
│   ├── nlp/                 # spaCy parser + LLM fallback + pipeline router
│   ├── recommendations/     # Co-purchase, similarity, seasonal, personal
│   ├── services/            # List manager (CRUD + fuzzy match)
│   ├── models/              # SQLAlchemy ORM + Pydantic schemas
│   ├── data/                # Pre-computed ML artifacts (JSON, ~9MB)
│   └── tests/               # 100 NLP test commands + benchmarks
├── frontend/
│   ├── src/pages/           # HomePage, CategoryPage, MyListPage
│   ├── src/components/      # voice/, store/, list/, layout/, shared/
│   ├── src/hooks/           # useVoiceAssistant, useShoppingList, etc.
│   └── src/services/        # API client
├── notebooks/               # ML training (Apriori, Item2Vec, seasonal)
└── docs/                    # Approach, architecture, NLP accuracy
```

---

## What I Would Build Next

**User authentication.** Single default user right now. OAuth would enable personal purchase history across devices, making the reorder model significantly more useful.

**Fine-tuned intent classifier.** A DistilBERT model trained on 2000+ labeled shopping commands would replace the keyword-based spaCy intent classification. Higher accuracy, less manual pattern engineering.

**Real product images.** Open Food Facts API integration for product photos, nutrition data, and barcodes. The marketplace UI would go from functional to polished.

**Collaborative filtering.** With enough users: "people with similar shopping patterns also bought..." instead of just frequency-based reorder suggestions.

---

## Brief (200 words)

Built a voice-first shopping assistant with a marketplace UI. The system uses a dual-mode STT pipeline: Groq Whisper large-v3 translations endpoint (any language to English) for all browsers, plus Web Speech API for instant Chrome transcripts. NLP is a hybrid of spaCy (12ms, 85% of commands) and Groq Llama 3.1 8B (fallback for ambiguous inputs). Recommendations are powered by two ML models trained on Instacart's 3.4M real grocery orders: Apriori for co-purchase patterns and Item2Vec (Word2Vec on order sequences) for product similarity and substitutes. All models are pre-computed to JSON at training time and served from memory -- zero ML inference at runtime, under 5ms lookups. The UI is a marketplace, not a list app. Adding a product triggers co-purchase suggestions. Product sheets show ML-derived substitutes. A validation layer handles three outcomes: catalog match (green toast), no match (suggestions in amber), and null parse (retry prompt). The architecture survived five production failures -- memory overflow, multilingual breakdown, data loss, cold starts, and noisy embeddings -- each documented with the fix. Total deployment cost: zero.