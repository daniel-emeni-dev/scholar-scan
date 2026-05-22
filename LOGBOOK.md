The ScholarScan Engineering Logbook 📓
Developer: Daniel Emeni Ogheneruno

Project: An AI-Native Engineering Assistant for Students

The Mission: Build a mobile-first app that takes circuit scans and returns professor-grade breakdowns, without melting my phone setup or leaking my keys.

Entry 1: Setting up the Pipeline (And the API Security Scare)
Date: May 2026 Status: The Core Engine Works

📝 The Scene
I started building the core engine for ScholarScan. The initial setup was simple: point the device camera, capture the picture, convert it to a base64 string, and throw it directly at the AI endpoint. During early testing, it worked beautifully. The frontend was talking, and the markdown rendering was cleanly handling equations.

But then I looked closer at the security layer.

🛑 The Reality Check (The Key Leak Problem)
I had written the core AI query function right inside my client-side page file (page.tsx). As a frontend developer, it’s easy to pull everything into the client for a fast prototype. However, I realized a massive security vulnerability: because the code was executing directly in the user's browser, my private API authorization strings were completely exposed. Anyone using the app could just open the browser's developer inspector, grab my keys, and use up my credits.

💡 The Fix
I needed a secure gateway. I shifted the architecture completely by introducing a Next.js App Router API Route Handler at src/app/api/analyze/route.ts.

Now, the frontend camera script has a single job: capture the image and pass it locally to our backend. The server-side route catches the image, pulls the secret GROQ_API_KEY from a hidden .env.local file (which Git completely ignores), handles the handshake safely behind our firewall, and returns the result back to the UI.

Entry 2: The Silent Battle with Browser Extensions
Date: May 2026 Status: Fighting Hydration Overlays

📝 The Scene
With the secure server routing finalized, I booted up my local dev environment to test the flow. The app loaded, but immediately slammed me with a massive, red Next.js development overlay screaming about a Hydration Mismatch: “A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.” The specific culprit? Two weird lines: data-new-gr-c-s-check-loaded and data-gr-ext-installed.

🔍 Tracing the Bug
Next.js pre-renders a clean static HTML file on the server side to ensure lightning-fast load times. Once it hits the phone browser, React boots up and hooks everything together (Hydration).

The problem wasn't my application code at all. My browser's Grammarly extension was jumping into the DOM the absolute millisecond the webpage landed, injecting its own tracking attributes into the HTML <body> before React could finish initializing. React saw that the client HTML didn't match what the server built, panicked, and threw an error overlay.

💡 The Solution
Instead of overcomplicating things by disabling the entire layout framework or running heavy lifecycle hacks, I utilized a native Next.js escape hatch: suppressHydrationWarning.

TypeScript
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
By placing this attribute explicitly on the global roots, I told React: "Hey, if browser extensions inject random attributes here, ignore them and carry on." The console immediately went completely quiet, keeping the app performance optimal.

Entry 3: When Next.js Caches Too Aggressively
Date: May 2026 Status: The 'Invalid API Key' Mystery

📝 The Scene
Right after moving my Groq keys into .env.local and setting up the API route, I hit ANALYZE SCAN and got hit with: AI Link Error: Invalid API Key.

I knew for a fact the key string was correct because it worked when hardcoded.

🔍 Tracing the Bug
This roadblock happened because of how Next.js optimizes development builds under the hood.

Next.js only reads environment variables from .env.local on a fresh, initial server boot. If you edit that file while the terminal is running, it won't notice the new values.

Because my page.tsx was still accidentally importing the server function directly at the top of the file, the compilation bundle got confused, trying to evaluate the private variable on the client side where it returned undefined.

💡 The Solution
First, I cleaned up the imports in page.tsx to ensure it only communicated with the backend via a network fetch("/api/analyze"). Then, I opened my terminal, killed the running instance, and executed a manual cache purge to wipe out the old engine charts:

Bash
# Wiping the aggressive Next.js development cache
rm -rf .next
npm run dev
The server rebooted completely fresh, successfully loaded the secure keys from the root environment file, and the entire AI professor analysis pipeline came back to life beautifully.

Entry 4: Current Blueprint & Upcoming Sprints
Date: May 2026 Status: Blueprint Locked In

The end-to-end prototype is officially locked down, secure, and backed up on GitHub. Looking ahead, I’m shifting my focus from foundational architecture to product optimization.

My immediate execution queue is broken down into four distinct upgrades:

The Payload Problem (Next Sprint): Mobile cameras take massive photos (3MB+), which cause severe network lag on mobile data. I am going to implement an HTML5 Canvas compression script to scale down image dimensions on the client side before hitting the API, dropping data usage by up to 90%.

Dynamic Feedback (UI Sprint): Replacing the static "Analyzing..." text button with an interactive visual scan animation laid directly over the user's captured image preview box.

Resilience Engineering: Constructing isolated error boundaries so that if a user experiences a network drop, they get a custom error card with a clean retry trigger instead of raw console text.

Local History Drawer: Wiring up browser localStorage arrays so users can reference their last 5 engineering breakdowns without having to re-scan the physical material.



## Entry 5: Tackling the Payload Problem (Client-Side Image Compression)
**Date: May 2026** **Status: Performance Optimization Complete**

### 📝 The Scene
Now that the data flow was completely secure, I hit a massive performance roadblock testing on a real device. Mobile cameras capture incredible detail, but that means raw captured photos easily range from **3MB to over 8MB**. 

Shifting a data payload that massive over standard mobile networks caused two major issues:
1. **Severe Latency:** The user would sit there staring at a frozen "ANALYZING..." button for up to 30 seconds just waiting for the file upload to complete.
2. **Server Crashing:** Serverless hosting platforms (like Vercel) enforce strict inbound payload limits of **4.5MB**. High-res photos of circuit diagrams were instantly crashing our API route handler with a `413 Payload Too Large` error.

### 🔍 Tracing the Bug
The app was trying to brute-force a multi-megabyte raw base64 string over an active network handshake. The AI engine doesn't need a massive ultra-high-resolution canvas to read a schematic diagram; it just needs clear, sharp contrast and structural definition. Sending uncompressed image weights was a waste of bandwidth and server computing power.

### 💡 The Solution
I built an asynchronous, client-side compression script at `src/lib/compressor.ts`. The second the camera captures an image, the app intercepts the data string *before* it updates the frontend state. It loads the file into an off-screen, invisible HTML5 `<canvas>` element, downscales its max width boundary to 1200px while maintaining the aspect ratio, and recompresses the file quality to 75%.



```typescript
// Core Canvas Downsampling Layer in src/lib/compressor.ts
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
ctx.drawImage(img, 0, 0, width, height);
const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);

---

## Entry 6: Implementing the Mechanical Signal Scanner UI
**Date: May 2026** **Status: Interface Optimization Complete**

### 📝 The Scene
With client-side payload compression humming at lightning speeds, the core application was fully stable. However, when a user clicked "ANALYZE SCAN", the screen went completely static while waiting for the Groq cloud servers to finish parsing layout tokens. 

### 🔍 Tracing the UX Friction
Generic spinning loaders feel disconnected from a serious engineering utility. I wanted a raw, mechanical feel that communicated precision. The solution needed to be performant, responsive, and implemented via Tailwind v4 utility hooks instead of heavy external animation runtimes.

During implementation, the editor threw an `Unknown at rule @theme` warning because local CSS linters are still catching up to Tailwind v4's new directive style. 

### 💡 The Solution
Instead of forcing the compiler to ignore standard lint warnings, I refactored the configuration by flattening the theme utilities directly into the CSS `:root`. Tailwind v4 automatically maps root-level custom properties (like `--animate-scan`) into executable utility classes.

```css
:root {
  --animate-scan: hardwareScan 3s ease-in-out infinite;
}

@keyframes hardwareScan {
  0%, 100% { top: 0%; }
  50% { top: 100%; }
}