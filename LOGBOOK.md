# The ScholarScan Engineering Logbook 📓
**Developer:** Daniel Emeni Ogheneruno
**Project:** An AI-Native Engineering Assistant for Students

> *This isn't just a project log. It's a record of every wall I hit, every moment something finally made sense, and every decision I had to think through twice. If you're reading this because you cloned the repo, I hope the reasoning here saves you time. If you're reading this because you're curious, welcome to the build.*

## Entry 1: Setting up the Pipeline (And the API Security Scare)
**Date: May 2026** | **Status: Core engine works. Nearly made a costly mistake.**

### 📝 The Scene
I was moving fast, probably too fast. The initial setup felt almost too clean: point the camera, capture the image, convert it to base64, throw it at the AI endpoint. It worked on the first real test. The frontend was talking, the markdown was rendering equations properly, and for a moment I thought the hardest part was already behind me.

Then I slowed down and actually read what I had written.

### 🛑 The Reality Check (The Key Leak Problem)
The core AI query function was sitting right inside `page.tsx`, client-side, fully exposed. As a frontend developer it's easy to pull everything into the client when you're prototyping fast. But the implication of what I'd done hit me hard: my private API authorization strings were executing directly in the user's browser. Anyone could open the developer inspector, pull the key, and drain my credits without touching a single line of my code.

I caught it before pushing to GitHub. That was the only lucky part.

### 💡 The Fix
I needed a proper secure gateway between the frontend and the AI service. I restructured the architecture completely by introducing a Next.js App Router API Route Handler at `src/app/api/analyze/route.ts`.

The new flow is clean and intentional:
- The frontend camera script has one job: capture the image and pass it to our backend via a local fetch call.
- The server-side route catches the image, pulls the secret `GROQ_API_KEY` from a hidden `.env.local` file (which Git ignores entirely), handles the API handshake behind the server firewall, and returns the result to the UI.

The key never touches the client. That's the only acceptable outcome.

> *Moving fast is fine. Moving fast without thinking is just debt with a time bomb attached.*

## Entry 2: The Silent Battle with Browser Extensions
**Date: May 2026** | **Status: Beaten by Grammarly. Then I won.**

### 📝 The Scene
Secure routing was locked in. I booted the local dev environment to test the full flow end-to-end, and immediately got slammed with a massive red Next.js overlay screaming about a Hydration Mismatch. The specific culprit listed two weird attributes: `data-new-gr-c-s-check-loaded` and `data-gr-ext-installed`.

My first instinct was that I had broken something in the layout. I hadn't.

### 🔍 Tracing the Bug
Next.js pre-renders clean static HTML on the server to ensure fast load times. Once that HTML lands in the browser, React boots up and hooks everything together, that process is called Hydration. The problem wasn't in my application code at all.

Grammarly was jumping into the DOM the absolute millisecond the page landed, injecting its own tracking attributes into the HTML `<body>` before React could finish initializing. React compared what the server built against what it found in the browser, saw a mismatch, panicked, and threw the error overlay.

A browser extension broke my app. That's the kind of bug that wastes an afternoon if you don't know what you're looking for.

### 💡 The Solution
Rather than disabling layout frameworks or writing lifecycle hacks around a problem that wasn't mine to begin with, I used a native Next.js escape hatch: `suppressHydrationWarning`.

``````typescript
// src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
``` 

Placing this attribute on the global roots tells React: *"If browser extensions inject random attributes here, ignore them and carry on."* The console went completely quiet. App performance stayed optimal.

> *Not every bug is your fault. Knowing the difference between your code and your environment is half the debugging skill.*

## Entry 3: When Next.js Caches Too Aggressively
**Date: May 2026** | **Status: Invalid key. Except it wasn't invalid.**

### 📝 The Scene
Keys were in `.env.local`. Route handler was in place. I hit **ANALYZE SCAN** and got back: `AI Link Error: Invalid API Key`.

I knew the key was correct, it had worked when I hardcoded it. That made the error more frustrating, not less. When something that should work doesn't, and you can't immediately see why, that's when you have to slow down and trace the actual execution path instead of just staring at the error.

### 🔍 Tracing the Bug
Two things were happening simultaneously, and each one was making the other worse.

First: Next.js only reads environment variables from `.env.local` on a clean initial server boot. If you modify that file while the dev server is already running, the new values never load. The server is holding onto a cached version of its own startup state.

Second: `page.tsx` was still accidentally importing the server-side function directly at the top of the file. That meant the compilation bundle was trying to evaluate a private environment variable on the client, where it returned `undefined` instead of the actual key string. The client was confidently sending `undefined` as an authorization header.

### 💡 The Solution
Two fixes, executed in order.

First, I cleaned up the imports in `page.tsx` so that it only communicates with the backend through a standard network fetch to `/api/analyze`. No direct server function imports on the client side.

Second, I killed the running server and wiped the development cache entirely:

`````bash
# Wiping the aggressive Next.js development cache
rm -rf .next
npm run dev
```

Fresh boot. The server loaded the keys correctly from `.env.local` on startup, and the full AI analysis pipeline came back to life.

> *When the environment lies to you, don't debug the code, debug the environment first.*

## Entry 4: Current Blueprint & Upcoming Sprints
**Date: May 2026** | **Status: Foundation locked. Now we build on top of it.**

The end-to-end prototype is officially secured and backed up on GitHub. The architecture is clean, the security layer holds, and the core analysis flow works reliably. That took longer than expected, but cutting corners on the foundation isn't something I was willing to do.

The next phase shifts focus from architecture to product, making this thing fast, reliable, and actually pleasant to use on a real mobile device. Four sprints queued:

1. **The Payload Problem (Next Sprint):** Mobile cameras produce raw photos between 3MB and 8MB. That causes severe network lag on mobile data and crashes serverless API routes that enforce a 4.5MB inbound limit. I'm building an HTML5 Canvas compression script to downscale images client-side before they hit the API, targeting a 90% reduction in payload weight.

2. **Dynamic Feedback (UI Sprint):** The static "Analyzing..." button has to go. Replacing it with a mechanical scan animation rendered directly over the captured image preview. The app needs to feel like a precision tool, not a webpage.

3. **Resilience Engineering:** If a network request fails mid-flight, users currently see raw console error text. Building isolated error boundaries so failures surface as clean, actionable cards with a retry trigger, not terminal output.

4. **Local History Drawer:** Wiring browser `localStorage` so users can reference their last 5 breakdowns without re-scanning. The image was already analyzed, there's no reason they should have to do it again.

## Entry 5: Tackling the Payload Problem (Client-Side Image Compression)
**Date: May 2026** | **Status: 90% payload reduction achieved.**

### 📝 The Scene
Testing on an actual device changed the picture immediately. What looked smooth in a browser on a laptop revealed itself as genuinely broken on mobile data. Raw camera photos were sitting between 3MB and 8MB, and the app was trying to push all of that over a standard cellular connection before anything else could happen.

Two failures showed up fast. The user experience was painful: up to 30 seconds staring at a frozen **ANALYZING...** button. And beyond UX, Vercel was rejecting payloads above 4.5MB entirely, throwing `413 Payload Too Large` errors that crashed the API route before the AI even touched the image.

The AI engine doesn't need a 4K scan of a circuit diagram. It needs clear contrast and readable structure, nothing a 1200px-wide JPEG at 75% quality can't provide.

### 🔍 Tracing the Bug
The app was brute-forcing raw base64 strings across a live network handshake. No compression, no downscaling, no consideration for the actual data requirements of the endpoint on the other side. Classic case of optimizing for what works in development without thinking about what works in production.

### 💡 The Solution
I built an asynchronous client-side compression function at `src/lib/compressor.ts`. The moment the camera captures an image, this function intercepts the raw data *before* it touches the frontend state. It loads the file into an off-screen HTML5 `<canvas>` element, downscales the max width to 1200px while preserving the aspect ratio, and recompresses to 75% JPEG quality.

````typescript
// Core Canvas Downsampling Layer in src/lib/compressor.ts
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, width, height);
const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
` ``

The payload hitting the API route dropped by roughly 90%. Analysis felt instant by comparison. This is the kind of optimization that users never notice, which means it's working exactly as intended.

> *Build for the device your users actually have, not the one you're testing on.*

## Entry 6: Implementing the Mechanical Signal Scanner UI
**Date: May 2026** | **Status: The app finally looks like what it is.**

### 📝 The Scene
Compression was running clean, the API pipeline was stable, and the happy path worked reliably. But there was still a UX problem that bothered me every time I tested it: when a user hit **ANALYZE SCAN**, the screen went completely static. No feedback, no movement, nothing, just a button that appeared to have stopped responding while Groq's servers parsed the image in the background.

Generic spinners were off the table. ScholarScan is an engineering utility. It should feel like one.

### 🔍 Tracing the UX Friction
The loading state needed to communicate precision, not just "please wait." I wanted something mechanical, a raw signal scan aesthetic that overlaid the captured image directly, making it visually obvious that the tool was actively processing what the user submitted. The implementation needed to be performant and built with Tailwind v4 utility hooks rather than external animation libraries.

One obstacle during implementation: the editor threw an `Unknown at rule @theme` warning because CSS linters are still catching up to Tailwind v4's newer directive style.

### 💡 The Solution
Rather than working around the linter warning with suppression flags, I restructured the configuration by flattening the theme utilities directly into the CSS `:root`. Tailwind v4 automatically maps root-level custom properties into executable utility classes, cleaner and more aligned with how the framework is designed to work.

```css
:root {
  --animate-scan: hardwareScan 3s ease-in-out infinite;
}

@keyframes hardwareScan {
  0%, 100% { top: 0%; }
  50% { top: 100%; }
}
```

The scan line now moves across the captured image in a continuous mechanical loop while the AI processes. It's a small detail, but it's the difference between an app that feels unfinished and one that feels intentional.

> *The loading state is part of the product. If it feels broken, the app feels broken.*

## Entry 7: Bulletproofing Networks via Error Boundaries and Signal Retries
**Date: May 2026** | **Status: The app handles failure gracefully now.**

### 📝 The Scene
Every part of the happy path was solid. But shipping a mobile tool means planning for the real conditions people use phones in, dropped signals, spotty towers, requests that time out halfway through. Up to this point, any network failure dropped straight into a catch block and dumped raw error strings onto the user's dashboard. That's not a product experience. That's a debug console that somehow shipped.

### 🔍 Tracing the UX Deficit
The deeper issue wasn't just the ugly error display, it was what happened *after* the failure. A user experiencing a timeout would have to manually clear the state, re-open the camera, retake the photo of their circuit diagram, wait through the compression step again, and re-fire the request. The image was still perfectly intact in memory. Only the network request failed. Forcing the user through the entire flow again because of a single dropped packet is bad engineering, full stop.

### 💡 The Solution
I implemented a dedicated error tracking state inside `page.tsx` that runs parallel to the main loading flow. When the API catch block intercepts an exception, the scanner loader fades out and a high-contrast error pane mounts in its place:

```
bg-red-950/20 border-2 border-red-500/30
```

The card displays a clean, sanitized monospaced breakdown of the specific server exception code, readable, not raw. Below it, a **Retry Signal Transmission** button fires the async API call again immediately, using the image data already held in memory. No re-scan required. No re-compression required. Just a clean retry of the one thing that actually failed.

> *A resilient product isn't one that never fails. It's one that fails without making the user pay for it.*

*Logbook ongoing. More entries as the build progresses.*
````

Note: the spaces I added inside the triple backticks at the end of each code block (`` ` `` ) are just to prevent formatting issues here in chat. Remove them when you paste so they read as normal closing ```` ``` ```` fences.