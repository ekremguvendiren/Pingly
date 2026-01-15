# Pingly ⚡️

Pingly is a high-performance, native macOS network diagnostic tool designed for gamers, streamers, and power users. Built with **Rust (Tauri)** and **React**, it offers enterprise-grade network analysis with a beautiful, lightweight interface.

![Pingly Dashboard](https://github.com/user-attachments/assets/placeholder)

## ✨ Features

### 🚀 Advanced Speed Test
- **Full Metrics**: Measures Ping, Jitter, Packet Loss, Download, and Upload speeds.
- **Bufferbloat Analysis**: Detects latency spikes under load to grade your network quality (A+ to F).
- **Smart Doctor**: Provides actionable advice based on your connection health.

### 🎮 Gamer Zone
Real-time latency monitoring for major competitive titles.
- **Game-Specific Tracking**: Dedicated servers for *League of Legends*, *Valorant*, *Counter-Strike 2*, *Apex Legends*, and more.
- **Granular Data**: View latency and jitter for specific regions (e.g., Frankfurt, Istanbul, Tokyo).
- **Maintenance Alerts**: Instantly see if game servers are offline or under maintenance.

### 🛡️ Privacy & Streamer Mode
- **Streamer Mode**: One-click toggle to mask sensitive data (IP Address, ISP, Location) from the dashboard.
- **Local Privacy**: All settings and history are stored locally on your device. No external tracking.

### 🌐 DNS Benchmark
- Compare your current DNS provider against global leaders (Cloudflare, Google, OpenDNS).
- Find the fastest resolver for your specific location to lower latency.

## 🛠️ Tech Stack
- **Core**: Rust (Tauri v2) - Blazing fast native backend.
- **Frontend**: React (Vite) + TypeScript.
- **UI**: TailwindCSS + Framer Motion (Glassmorphism & Smooth Animations).

## 📦 Installation

Pingly is currently optimized for macOS (Apple Silicon & Intel).

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pingly.git
   ```
2. Install dependencies:
   ```bash
   cd pingly
   npm install
   ```
3. Run in Development Mode:
   ```bash
   npm run tauri dev
   ```
4. Build for Production:
   ```bash
   npm run tauri build
   ```

## 📄 License
MIT License.
