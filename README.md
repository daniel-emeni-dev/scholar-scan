# SCHOLARSCAN
### AI Engineering Assistant

> Point your camera at any circuit diagram or schematic and get a structured, professor-grade breakdown in seconds. Built by an engineering student, for engineering students.



![Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=flat-square)

 

![Groq](https://img.shields.io/badge/AI-Groq%20Vision-orange?style=flat-square)

 

![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square)

 

![Tailwind](https://img.shields.io/badge/Styles-Tailwind%20v4-blue?style=flat-square)



**Live Demo:** [scholar-scan-iota.vercel.app](https://scholar-scan-iota.vercel.app)

## The Problem

Engineering labs hit different when you're staring at a circuit schematic that makes zero sense and your lecturer has moved three topics ahead. Textbooks don't always explain fast enough. Tutorial classes don't always come soon enough. That gap is where most students fall behind.

ScholarScan was built to close that gap.

## What It Does

Point your camera at any circuit diagram, whether printed in a textbook, handed out in a lab sheet, or sketched by hand, and ScholarScan returns a clean, step-by-step breakdown of exactly what is happening in that circuit. Component identification, circuit type, signal flow, operating conditions. The kind of analysis you would get from sitting with a professor one-on-one, available the moment you need it.

## How It Was Built

Security was the first priority. Every AI request is handled server-side so that API credentials never reach the client or get exposed in the browser. The frontend communicates with a secure internal endpoint, nothing more.

Performance came next. Mobile cameras produce large raw photos that would be painfully slow to transmit over cellular data. Before any image leaves the device, a canvas-based compression layer scales it down and reduces the file size by up to 90%, keeping the experience fast regardless of network conditions.

The interface was designed to feel like a precision tool. The loading state uses a mechanical scan animation that moves across the captured image while the AI processes it, communicating that something real is happening rather than just asking the user to wait.

Finally, resilience. If a network request fails mid-flight, the app does not make the user start over. The captured image stays in memory, and a single tap retries the request instantly.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| AI Model | Groq Vision |
| Deployment | Vercel |
| Language | TypeScript |

## Roadmap

- [ ] Cloud sync via Supabase for cross-device history
- [ ] PDF schematic support
- [ ] One-tap export as PDF or Markdown
- [ ] Component datasheet lookup

## Engineering Logbook

The full build process is documented in the engineering logbook inside this repo. Every bug, every architectural decision, and every fix is recorded with context. If you want to understand why something was built a certain way, the logbook has the answer.

**Read it:** [LOGBOOK.md](./LOGBOOK.md)

## License

MIT License. Use it, fork it, build on it.

*Built by Daniel Emeni Ogheneruno*
