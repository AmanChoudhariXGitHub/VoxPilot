# INTERVIEW.md — AI Voice Agents Challenge Project
## Comprehensive Interview Preparation Guide

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & System Design](#2-architecture--system-design)
3. [Technology Stack](#3-technology-stack)
4. [Backend Deep Dive](#4-backend-deep-dive)
5. [Frontend Deep Dive](#5-frontend-deep-dive)
6. [Real-Time Communication (LiveKit)](#6-real-time-communication-livekit)
7. [AI/ML Pipeline](#7-aiml-pipeline)
8. [DevOps & Deployment](#8-devops--deployment)
9. [Key Design Decisions & Trade-offs](#9-key-design-decisions--trade-offs)
10. [Interview Questions by Role](#10-interview-questions-by-role)
11. [Behavioral Questions](#11-behavioral-questions)
12. [Concepts to Know Cold](#12-concepts-to-know-cold)
13. [Glossary](#13-glossary)

---

## 1. Project Overview

### What is This Project?

This is a **monorepo** for an AI Voice Agent application built for the **Murf AI Voice Agents Challenge**. The system enables real-time, bidirectional voice conversations between a user and an AI agent in a browser.

### Core Value Proposition

- **Ultra-low latency** voice AI using **Murf Falcon TTS** (claimed fastest TTS API)
- End-to-end voice pipeline: Speech → Text → LLM → Text → Speech → Audio playback
- Production-ready architecture with Docker, testing, and metrics

### Monorepo Structure

```
falcon-tdova-nov25-livekit/
├── backend/          # Python: LiveKit Agent with AI pipeline
│   ├── src/agent.py  # Main agent entrypoint
│   └── tests/        # Pytest evaluation suite
└── frontend/         # Next.js/React: User interface
    ├── app/          # Next.js App Router pages & API routes
    ├── components/   # React components (LiveKit UI, controls)
    └── hooks/        # Custom React hooks
```

---

## 2. Architecture & System Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                      USER BROWSER                    │
│  ┌──────────────┐         ┌──────────────────────┐  │
│  │ React/Next.js│◄────────│ LiveKit JS Client SDK │  │
│  │   Frontend   │         │  (WebRTC)             │  │
│  └──────────────┘         └──────────┬───────────┘  │
└──────────────────────────────────────│───────────────┘
                                       │ WebRTC (Audio/Video)
┌──────────────────────────────────────▼───────────────┐
│                   LIVEKIT SERVER                       │
│         (Media routing / Signaling / SFU)              │
└──────────────────────────────────────┬───────────────┘
                                       │ WebRTC
┌──────────────────────────────────────▼───────────────┐
│               PYTHON BACKEND AGENT                     │
│  ┌─────────┐  ┌──────┐  ┌──────────┐  ┌──────────┐  │
│  │ Deepgram│→ │Gemini│→ │  Murf    │→ │ LiveKit  │  │
│  │  STT    │  │  LLM │  │Falcon TTS│  │  Agent   │  │
│  └─────────┘  └──────┘  └──────────┘  └──────────┘  │
│                 Voice AI Pipeline                      │
└───────────────────────────────────────────────────────┘

API Route (Next.js): /api/connection-details
  → Generates JWT token for LiveKit room access
```

### Voice AI Pipeline (Detailed)

```
User speaks into mic
       │
       ▼
[VAD: Silero]  ← Detects voice activity vs silence
       │
       ▼
[STT: Deepgram nova-3]  ← Converts speech to text
       │
       ▼
[Turn Detector: MultilingualModel]  ← Decides if user has finished speaking
       │
       ▼
[LLM: Gemini 2.5 Flash]  ← Generates text response
       │ (with preemptive_generation=True → starts before end-of-turn confirmed)
       ▼
[TTS: Murf Falcon]  ← Converts text to audio
       │ (SentenceTokenizer → streams sentence by sentence)
       ▼
[Noise Cancellation: BVC]  ← Background voice cancellation
       │
       ▼
Audio streamed back to user via LiveKit WebRTC
```

### Connection Flow

```
1. User clicks "Start Call" in browser
2. Frontend calls POST /api/connection-details (Next.js API route)
3. API route generates LiveKit JWT (AccessToken) with room permissions
4. Frontend receives: { serverUrl, roomName, participantToken }
5. LiveKit JS SDK connects to LiveKit Server via WebRTC
6. LiveKit Server dispatches job to Python backend Worker
7. Python Agent joins the room, initializes the AI pipeline
8. Bidirectional audio streaming begins
```

### Data Flow for Authentication

```
Next.js API Route (/api/connection-details)
  ├── Reads: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL (env vars)
  ├── Creates: AccessToken (JWT) with VideoGrant permissions
  │   ├── roomJoin: true
  │   ├── canPublish: true  (user can send audio)
  │   └── canSubscribe: true (user can receive agent audio)
  └── Returns: { serverUrl, roomName, participantToken, participantName }
```

---

## 3. Technology Stack

### Backend

| Component | Technology | Purpose |
|---|---|---|
| Language | Python 3.12 | Agent logic |
| Package Manager | `uv` (Astral) | Fast Python dependency management |
| Agent Framework | LiveKit Agents ~1.2 | Voice AI orchestration |
| STT | Deepgram `nova-3` | Speech-to-text |
| LLM | Google Gemini 2.5 Flash | Language model |
| TTS | Murf Falcon (`en-US-matthew`) | Text-to-speech |
| VAD | Silero VAD | Voice Activity Detection |
| Turn Detection | `MultilingualModel` | End-of-turn detection |
| Noise Cancellation | LiveKit BVC | Background Voice Cancellation |
| Testing | Pytest + pytest-asyncio | Agent evaluation |
| Linting/Formatting | Ruff | Code quality |
| Containerization | Docker | Deployment |

### Frontend

| Component | Technology | Purpose |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack React framework |
| Language | TypeScript | Type safety |
| Real-time | LiveKit JS SDK + Components | WebRTC management |
| Styling | Tailwind CSS v4 | Utility-first CSS |
| Animations | Motion (Framer Motion) | UI transitions |
| Icons | Phosphor Icons | Icon library |
| UI Primitives | Radix UI | Accessible headless components |
| Package Manager | pnpm | Fast Node.js package manager |
| Toasts | Sonner | Notification system |

---

## 4. Backend Deep Dive

### Agent Class Structure

```python
class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="...",  # System prompt for LLM
        )
    # @function_tool decorators add callable tools
```

**Key design**: The `Agent` class wraps all LLM interactions. Adding `@function_tool` decorated methods exposes capabilities to the LLM (e.g., weather lookup, database queries).

### AgentSession Configuration

```python
session = AgentSession(
    stt=deepgram.STT(model="nova-3"),
    llm=google.LLM(model="gemini-2.5-flash"),
    tts=murf.TTS(
        voice="en-US-matthew",
        style="Conversation",
        tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
        text_pacing=True
    ),
    turn_detection=MultilingualModel(),
    vad=ctx.proc.userdata["vad"],
    preemptive_generation=True,  # Critical for low latency
)
```

**Why SentenceTokenizer?** TTS starts generating audio per sentence rather than waiting for the full LLM response — dramatically reduces Time To First Audio (TTFA).

**Why preemptive_generation=True?** The agent starts generating LLM responses before it's fully certain the user has stopped talking, reducing latency.

### Prewarm Function

```python
def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()
```

The prewarm function runs once per worker process before any sessions begin, loading the VAD model into memory so it's immediately available when a call arrives — avoiding cold-start delays.

### Dummy HTTP Server Pattern

```python
PORT = int(os.environ.get("PORT", 10000))

def run_dummy_server():
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

threading.Thread(target=run_dummy_server, daemon=True).start()
```

**Why?** Platforms like Render.com require a bound HTTP port to detect that a service is "healthy." LiveKit agents don't expose HTTP by default, so this dummy server satisfies the health check while the real agent runs on a separate thread.

### Metrics & Observability

```python
usage_collector = metrics.UsageCollector()

@session.on("metrics_collected")
def _on_metrics_collected(ev: MetricsCollectedEvent):
    metrics.log_metrics(ev.metrics)
    usage_collector.collect(ev.metrics)
```

The event-driven metrics system collects STT latency, LLM latency, TTS latency, and token counts.

### Testing Architecture

Tests use LiveKit's evaluation framework with an AI judge:

```python
async def test_offers_assistance():
    async with AgentSession(llm=llm) as session:
        await session.start(Assistant())
        result = await session.run(user_input="Hello")
        await (
            result.expect.next_event()
            .is_message(role="assistant")
            .judge(llm, intent="Greets the user in a friendly manner.")
        )
        result.expect.no_more_events()
```

**Key insight**: Instead of exact string matching, an LLM judges whether the response meets an intent — this is **LLM-as-judge** evaluation, far more robust for conversational AI testing.

---

## 5. Frontend Deep Dive

### Next.js App Router Structure

```
app/
├── (app)/
│   ├── layout.tsx     # Header with logo
│   ├── page.tsx       # Main page → renders <App>
│   └── opengraph-image.tsx  # Dynamic OG image generation
├── api/
│   └── connection-details/
│       └── route.ts   # POST endpoint → returns LiveKit JWT
├── layout.tsx          # Root layout (fonts, themes, metadata)
└── ui/
    └── page.tsx        # Component showcase/storybook
```

**Note**: `(app)` uses route grouping (parentheses = no URL segment). It has its own layout without affecting the URL path.

### Component Hierarchy

```
App
└── SessionProvider  (context: room, isSessionActive, startSession, endSession)
    ├── RoomContext.Provider  (LiveKit room instance)
    └── ViewController
        ├── WelcomeView       (pre-call: "Start Call" button)
        └── SessionView       (active call UI)
            ├── ScrollArea + ChatTranscript  (message history)
            ├── TileLayout    (audio visualizer / camera / avatar)
            └── AgentControlBar
                ├── ChatInput (text chat)
                ├── TrackSelector (mic toggle + device select)
                ├── TrackToggle (camera, screen share)
                └── Button (END CALL)
```

### Session State Management

```typescript
// useRoom.ts — custom hook wrapping LiveKit Room
const room = useMemo(() => new Room(), []);
const [isSessionActive, setIsSessionActive] = useState(false);

// startSession: enables mic + fetches token + connects
const startSession = useCallback(() => {
    setIsSessionActive(true);
    Promise.all([
        room.localParticipant.setMicrophoneEnabled(true, undefined, {
            preConnectBuffer: isPreConnectBufferEnabled,  // buffers audio before connection
        }),
        tokenSource.fetch(...)
            .then(details => room.connect(details.serverUrl, details.participantToken))
    ]);
}, []);
```

**Pre-connect buffer**: Audio is buffered even before the WebRTC connection is fully established, so the first few words aren't lost.

### JWT Token Generation (API Route)

```typescript
// /api/connection-details/route.ts
const at = new AccessToken(API_KEY, API_SECRET, {
    identity: participantIdentity,
    ttl: "15m",
});
at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
});
return at.toJwt();
```

Each call gets a unique `roomName` (random number) and `participantIdentity` — fully isolated sessions.

### Chat Messages: Transcriptions + Chat Merged

```typescript
// useChatMessages.ts
const transcriptions = useTranscriptions();  // Live STT transcriptions
const chat = useChat();                       // Typed chat messages

const mergedTranscriptions = useMemo(() => {
    return [...transcriptions.map(toReceivedChatMessage), ...chat.chatMessages]
        .sort((a, b) => a.timestamp - b.timestamp);
}, [transcriptions, chat.chatMessages, room]);
```

**Why merge?** The transcript shows what the agent *said* (STT transcriptions from agent's TTS output) AND what the user *typed* (chat messages), unified in chronological order.

### Theme System

```typescript
// Applied via script tag to avoid FOUC (Flash of Unstyled Content)
const THEME_SCRIPT = `
  const theme = localStorage.getItem("theme-mode") ?? "system";
  if (theme === "system") {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.classList.add("dark");
    }
  } else {
    document.documentElement.classList.add(theme);
  }
`;
```

The theme script runs synchronously before React hydration — this is the standard pattern for preventing FOUC in SSR apps.

### Connection Timeout Handling

```typescript
// useConnectionTimeout.tsx
useEffect(() => {
    const timeout = setTimeout(() => {
        if (!isAgentAvailable(agentState)) {
            toastAlert({ title: "Session ended", ... });
            room.disconnect();
        }
    }, 200_000); // 200 seconds
    return () => clearTimeout(timeout);
}, [agentState, room, timout]);
```

---

## 6. Real-Time Communication (LiveKit)

### What is LiveKit?

LiveKit is an open-source WebRTC infrastructure platform. It provides:
- **SFU (Selective Forwarding Unit)**: Routes audio/video between participants without decoding
- **Signaling Server**: Handles WebRTC negotiation (SDP, ICE)
- **SDKs**: JavaScript (client), Python (agent/server)

### WebRTC Concepts to Know

| Term | Meaning |
|---|---|
| SDP | Session Description Protocol — describes media capabilities |
| ICE | Interactive Connectivity Establishment — finds best network path |
| STUN/TURN | Servers that help peers find each other across NATs/firewalls |
| SFU | Selective Forwarding Unit — routes media streams between participants |
| Track | A single audio or video stream |
| Room | A virtual space where participants communicate |

### LiveKit Room Lifecycle

```
1. Client generates JWT (via Next.js API route)
2. Client connects: room.connect(serverUrl, token)
3. Server authenticates JWT → participant joins room
4. Server dispatches job to Python Worker (agent joins)
5. Both participants share audio tracks via SFU
6. Agent processes audio → generates response audio → publishes back
7. Client disconnects → room closes
```

### Agent Worker Model

```python
cli.run_app(
    WorkerOptions(
        entrypoint_fnc=entrypoint,
        prewarm_fnc=prewarm
    )
)
```

The Worker listens for job dispatches from LiveKit Cloud. When a new room needs an agent, LiveKit sends a job → worker runs `entrypoint(ctx)` → agent joins room.

---

## 7. AI/ML Pipeline

### STT: Deepgram nova-3

- **Type**: Cloud-based ASR (Automatic Speech Recognition)
- **Model**: nova-3 — Deepgram's latest, highly accurate model
- **Why Deepgram**: Low latency streaming transcription, good accuracy

### LLM: Google Gemini 2.5 Flash

- **Why Flash**: Optimized for speed over raw capability — critical for real-time voice
- **Integration**: Via `livekit-plugins-google`
- **Input**: Transcribed text + conversation history + system instructions
- **Output**: Text response

### TTS: Murf Falcon

- **Claim**: Consistently fastest TTS API
- **Voice**: `en-US-matthew` with `Conversation` style
- **Streaming**: `SentenceTokenizer(min_sentence_len=2)` — starts speaking after each sentence
- **text_pacing=True**: Adjusts speech timing for natural pacing

### VAD: Silero VAD

- **Type**: Voice Activity Detection — runs locally (not cloud)
- **Purpose**: Distinguishes speech from background noise/silence
- **Loading**: Prewarmed (loaded once per worker process)

### Turn Detection: MultilingualModel

- **Purpose**: Contextually determines when a user has *truly* finished speaking
- **Why needed**: Simple silence detection fails — pauses mid-sentence shouldn't trigger agent response
- **Multilingual**: Works across languages without reconfiguration

### Noise Cancellation: BVC (Background Voice Cancellation)

```python
room_input_options=RoomInputOptions(
    noise_cancellation=noise_cancellation.BVC(),
)
```

LiveKit Cloud feature — removes background voices/noise from the user's audio track before it reaches the STT.

---

## 8. DevOps & Deployment

### Docker (Backend)

```dockerfile
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS base
# Non-root user for security
RUN adduser --uid 10001 appuser
# Install build deps (gcc for Python packages with C extensions)
RUN apt-get install -y gcc g++ python3-dev
# Install deps first (layer caching)
COPY pyproject.toml uv.lock ./
RUN uv sync --locked
# Copy app code
COPY . .
# Pre-download ML models (avoid runtime downloads)
RUN uv run src/agent.py download-files
CMD ["uv", "run", "src/agent.py", "start"]
```

**Layer caching strategy**: Dependencies are installed before copying source code — changes to code don't invalidate the dependency layer.

### Environment Variables

```
# Backend
LIVEKIT_URL=ws://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
GOOGLE_API_KEY=       # Gemini
MURF_API_KEY=         # Falcon TTS
DEEPGRAM_API_KEY=     # Nova-3 STT

# Frontend
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=...
```

**Security**: API keys never reach the browser. The Next.js API route uses server-side env vars (no `NEXT_PUBLIC_` prefix) to generate short-lived JWTs.

### Running Locally

```bash
# Option A: All-in-one
./start_app.sh   # starts livekit-server + backend + frontend

# Option B: Manual
livekit-server --dev                          # Terminal 1
uv run python src/agent.py dev               # Terminal 2
pnpm dev                                     # Terminal 3
```

### Package Management

- **Backend**: `uv` — Rust-based Python package manager, 10-100x faster than pip
- **Frontend**: `pnpm` — disk-efficient Node.js package manager using hard links

---

## 9. Key Design Decisions & Trade-offs

### 1. Monorepo vs. Polyrepo

**Choice**: Monorepo with shared `start_app.sh`

**Pros**: Easier local development, shared env config, atomic changes

**Cons**: Larger clone size, tightly coupled deployment

### 2. Streaming TTS vs. Full Response TTS

**Choice**: Sentence-by-sentence streaming (`SentenceTokenizer`)

**Pros**: First audio plays within ~500ms of LLM starting to generate

**Cons**: Can't go back and re-synthesize if sentence structure changes

### 3. Preemptive Generation

**Choice**: `preemptive_generation=True`

**Pros**: Shaves 200-500ms off perceived latency

**Cons**: If turn detection was wrong, agent interrupts user → slightly worse UX edge case

### 4. Next.js API Route for Token Generation

**Choice**: Token generated server-side in Next.js route

**Pros**: API secrets never exposed to browser, JWT is short-lived (15min)

**Cons**: Adds one HTTP round-trip before WebRTC connection

### 5. LLM-as-Judge Testing

**Choice**: AI evaluates AI responses instead of exact string matching

**Pros**: Tests *intent* not exact wording, resilient to model updates

**Cons**: Non-deterministic tests (evaluation itself can vary), slower, costs API calls

### 6. Dummy HTTP Server for Render.com

**Choice**: Spawn a SimpleHTTPRequestHandler on a separate thread

**Pros**: Satisfies PaaS health checks without changing agent architecture

**Cons**: Adds unnecessary network listener, slight resource waste

---

## 10. Interview Questions by Role

### Software Developer / Software Engineer

**Q: Walk me through how a voice conversation works end-to-end in this system.**

A: User clicks Start Call → Next.js API generates LiveKit JWT → browser connects to LiveKit Server via WebRTC → LiveKit dispatches job to Python Worker → agent joins room → user speaks → Silero VAD detects voice → Deepgram STT transcribes → MultilingualModel decides end-of-turn → Gemini 2.5 Flash generates response → Murf Falcon TTS synthesizes audio sentence-by-sentence → audio streams back to user via LiveKit.

**Q: What is VAD and why is it needed?**

A: Voice Activity Detection determines when audio contains speech vs. silence/noise. Without it, the STT would process every millisecond of audio (expensive). VAD gates the STT to only run when speech is present.

**Q: How does the project handle secrets/API keys securely?**

A: Backend keys are in `.env.local` (gitignored). Frontend keys are server-side Next.js env vars (no `NEXT_PUBLIC_` prefix) — they're never bundled to the browser. The API route generates a short-lived JWT from these keys and returns only the JWT to the client.

**Q: Why does the Docker image pre-download models?**

A: ML models (Silero VAD, turn detector) are downloaded during Docker build (`download-files` command). This avoids downloading them on first call, which would add startup latency and require internet access at runtime.

**Q: Explain the prewarm function.**

A: `prewarm(proc)` runs once when a new worker process starts, loading the Silero VAD model into `proc.userdata`. This way, VAD is in memory before any session starts — avoiding a cold-start delay per call.

---

### Backend Developer

**Q: How would you add a new capability to the agent, e.g., weather lookup?**

A:
```python
from livekit.agents import function_tool, RunContext

class Assistant(Agent):
    @function_tool
    async def lookup_weather(self, context: RunContext, location: str):
        """Look up current weather for a location."""
        # Call weather API
        return f"Sunny, 72°F in {location}"
```
The `@function_tool` decorator registers the method as an LLM-callable function. The docstring becomes the tool description shown to the LLM.

**Q: How would you switch from Gemini to OpenAI?**

A: Replace the LLM plugin:
```python
from livekit.plugins import openai
llm=openai.LLM(model="gpt-4o-mini")
```
Install `livekit-agents[openai]` and set `OPENAI_API_KEY`. The framework is model-agnostic.

**Q: What's the difference between `dev` and `start` commands for the agent?**

A: `dev` mode watches for file changes and reloads. `start` is production mode — stable, connects to LiveKit Cloud, no hot reload.

**Q: How would you implement multi-turn conversation memory?**

A: LiveKit Agents manages conversation history automatically through the LLM context. For persistent memory across sessions, you'd add a database lookup tool or pre-populate the system prompt with retrieved context.

**Q: How are agent tests structured and what makes them unique?**

A: Tests use `AgentSession` to simulate conversations in-process. Instead of asserting exact strings, they use `.judge(llm, intent="...")` — an LLM evaluates whether the response meets the described intent. This is the LLM-as-judge pattern, making tests robust to phrasing changes.

**Q: How do you handle the dummy HTTP server and why is it needed?**

A: Platforms like Render.com require a bound port to consider a service healthy. The agent doesn't expose HTTP, so a `SimpleHTTPRequestHandler` is spun in a daemon thread on `PORT`. It doesn't serve anything meaningful — it just keeps the port bound.

---

### Full Stack Developer

**Q: How does the frontend know the agent is connected?**

A: The `useVoiceAssistant()` hook from `@livekit/components-react` returns `{ state: agentState }`. State goes through: `disconnected → connecting → initializing → listening → thinking → speaking`. The frontend shows different UIs based on state.

**Q: How are typed chat messages and voice transcriptions unified?**

A: `useChatMessages.ts` merges two sources: `useTranscriptions()` (live STT output from agent) and `useChat().chatMessages` (typed messages). Both are converted to `ReceivedChatMessage` format and sorted by timestamp.

**Q: How does the app prevent FOUC (Flash of Unstyled Content) for the theme?**

A: An inline `<script>` tag in the root layout runs synchronously during HTML parsing, before React hydration. It reads `localStorage` for the theme preference and adds `dark` or `light` class to `<html>` — so the correct theme is applied before any components render.

**Q: Why does the API route use `export const revalidate = 0`?**

A: Next.js caches API routes by default. `revalidate = 0` opts out of caching — each call generates a fresh unique room name and JWT. Without this, multiple users could get the same token.

**Q: How does the pre-connect audio buffer work?**

A: When `setMicrophoneEnabled(true, undefined, { preConnectBuffer: true })` is called, the LiveKit client starts capturing microphone audio immediately. This audio is buffered locally. When the WebRTC connection establishes, the buffered audio is sent — so the first words aren't lost during connection setup.

**Q: How is dynamic OG image generation implemented?**

A: `opengraph-image.tsx` uses Next.js's `ImageResponse` (from `next/og`). It runs server-side, loads fonts and images from the filesystem, and returns a dynamically generated PNG for social media previews.

---

### Data Scientist

**Q: How would you evaluate agent quality at scale?**

A: Use the existing LLM-as-judge framework to run batch evaluations. Extend test cases to cover edge cases. Track metrics: TTFA (Time To First Audio), end-to-end latency, turn detection accuracy, LLM response quality scores. Use `metrics.UsageCollector` data for token efficiency analysis.

**Q: How does the MultilingualModel turn detector work conceptually?**

A: It's a machine learning model trained to predict end-of-turn from audio/text features: prosodic features (pitch, energy drop), semantic completeness of the sentence, and timing patterns. It's more accurate than simple silence-based detection.

**Q: What data would you collect to improve this agent?**

A: Conversation logs (with consent), turn detection errors (premature interruptions, missed turns), STT accuracy (word error rate), user satisfaction ratings, session abandonment rate, per-utterance latency breakdown.

**Q: How would you A/B test different LLM models?**

A: Parameterize the LLM in `AgentSession` via env var. Route % of sessions to model A vs B based on room name hash. Track quality metrics per condition using the metrics collector.

---

### Common Coding Questions You Might Face

**Q: Implement a simple function tool for the agent.**

```python
from livekit.agents import function_tool, RunContext
import aiohttp

class Assistant(Agent):
    @function_tool
    async def get_stock_price(self, context: RunContext, ticker: str) -> str:
        """Get the current stock price for a given ticker symbol.
        
        Args:
            ticker: Stock ticker symbol (e.g., AAPL, GOOGL)
        """
        async with aiohttp.ClientSession() as session:
            async with session.get(f"https://api.example.com/stock/{ticker}") as resp:
                data = await resp.json()
                return f"{ticker}: ${data['price']:.2f}"
```

**Q: How would you add rate limiting to the API route?**

```typescript
// Simple in-memory rate limiting
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: Request) {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const now = Date.now();
    const window = requestCounts.get(ip);
    
    if (window && now < window.resetAt && window.count >= 10) {
        return new NextResponse('Rate limit exceeded', { status: 429 });
    }
    // ... rest of handler
}
```

---

## 11. Behavioral Questions

**Q: Tell me about a technical challenge you solved in this project.**

Sample: "The biggest challenge was minimizing perceived latency. I configured `preemptive_generation=True` so the agent starts preparing a response before the turn detector fully confirms the user is done. Combined with sentence-level TTS streaming via `SentenceTokenizer`, the first audio chunk plays within milliseconds of the LLM starting to respond."

**Q: How did you approach testing a voice AI system?**

Sample: "Traditional unit tests don't work well for conversational AI because responses aren't deterministic. I used LiveKit's LLM-as-judge framework, where a separate LLM evaluates whether responses meet an *intent* rather than matching exact strings. This makes tests resilient to model updates while still catching regressions."

**Q: How would you scale this to 1000 concurrent users?**

Sample: "The Python backend agents scale horizontally — you'd run multiple worker processes, possibly on separate machines, all connected to LiveKit Cloud. LiveKit Cloud handles load balancing job dispatch. The Next.js frontend scales via Vercel's serverless functions. The bottleneck would likely be API rate limits from Deepgram, Gemini, and Murf."

---

## 12. Concepts to Know Cold

### WebRTC Fundamentals
- **Peer-to-peer** communication protocol for audio/video in browsers
- **SDP exchange**: peers describe their capabilities, agree on codec/format
- **ICE negotiation**: finds the best network path (direct P2P or via TURN relay)
- **SFU vs MCU**: SFU forwards streams without decoding (scalable); MCU mixes them server-side

### JWT (JSON Web Tokens)
- Header.Payload.Signature (Base64 encoded, dot-separated)
- Signed with HMAC-SHA256 using the secret key
- LiveKit uses JWTs to authenticate room participants and define their permissions
- Short TTL (15 min here) limits exposure if intercepted

### Next.js App Router
- **Server Components**: render on server, can't use hooks/events
- **Client Components**: `'use client'` directive, full React functionality
- **Route Groups**: `(groupName)` — groups routes without affecting URL
- **API Routes**: `route.ts` in `app/api/` directory
- **Dynamic Metadata**: OG images via `opengraph-image.tsx`

### Python Async (asyncio)
- `async def` / `await` for non-blocking I/O
- LiveKit agents are fully async — all entrypoint and tool functions are coroutines
- `threading.Thread` for the dummy HTTP server (blocking code on separate thread)

### Docker Best Practices (demonstrated in project)
- Non-root user (`appuser`) for security
- Layer caching: copy `pyproject.toml` before source code
- `--locked` flag for reproducible builds
- Pre-download models at build time, not runtime

### Python Package Management with uv
- `uv sync` — install deps from `uv.lock`
- `uv run` — run command in virtual environment
- `--break-system-packages` not needed (uv manages its own venv)
- Much faster than pip due to Rust implementation

---

## 13. Glossary

| Term | Definition |
|---|---|
| **ASR** | Automatic Speech Recognition — converts audio to text |
| **BVC** | Background Voice Cancellation — removes non-primary voices |
| **ICE** | Interactive Connectivity Establishment — WebRTC path discovery |
| **LLM** | Large Language Model — AI text generation (Gemini, GPT) |
| **Monorepo** | Single repository containing multiple projects |
| **SDP** | Session Description Protocol — WebRTC capability negotiation |
| **SFU** | Selective Forwarding Unit — routes media without decoding |
| **STT** | Speech-to-Text — converts audio to text (same as ASR) |
| **TTFA** | Time To First Audio — latency from user stopping to agent starting |
| **TTS** | Text-to-Speech — converts text to audio |
| **Turn Detection** | ML model predicting when a speaker has finished their utterance |
| **VAD** | Voice Activity Detection — detects speech vs. silence |
| **WebRTC** | Web Real-Time Communication — browser P2P audio/video protocol |
| **Worker** | LiveKit agent process that handles job dispatch and runs entrypoints |
| **JWT** | JSON Web Token — signed, stateless authentication token |
| **FOUC** | Flash of Unstyled Content — brief wrong-style flash on page load |
| **SSR** | Server-Side Rendering — HTML generated on server before client |
| **uv** | Ultra-fast Python package manager written in Rust (by Astral) |
| **pnpm** | Performant Node package manager using hard links to save disk |
| **Preemptive Generation** | Starting LLM inference before turn detection fully confirms end-of-turn |

---

*Last updated: April 2026 | Based on the Murf AI Voice Agents Challenge starter repository*
