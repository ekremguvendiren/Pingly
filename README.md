# Pingly ⚡️

Pingly is a next-generation network diagnostic tool for macOS, built for gamers, streamers, and developers who demand precision and aesthetics. 

Crafted with **Rust (Tauri v2)** and **React**, Pingly delivers native performance with a stunning, glassmorphism-inspired interface.

![Pingly Dashboard](https://github.com/user-attachments/assets/placeholder)

## ✨ Unique Features

### 🖥️ Modern Glassmorphism UI
- **Visuals**: A "True Black" layout optimized for OLED screens with vivid gradients and blur effects.
- **Fluid Animations**: Smooth transitions powered by Framer Motion.
- **Responsive Layout**: A persistent sidebar navigation with a responsive main content area.

### 🚀 Pro-Grade Speed Test
- **Comprehensive Metrics**: Accurate measurement of Ping, Jitter, Packet Loss, Download, and Upload speeds.
- **Bufferbloat Detection**: Intelligent analysis of latency under load to identify network congestion.
- **Service Quality Ratings**: Automatic grading (A+ to F) for:
    - 🎮 **Online Gaming** (Low latency focus)
    - 📺 **4K Streaming** (Bandwidth focus)
    - 📹 **Video Calls** (Stability focus)

### 🎮 Gamer Zone
Real-time, region-specific latency monitoring for competitive titles without launching the game.
- **Supported Games**: *League of Legends*, *Valorant*, *Counter-Strike 2*, *Apex Legends*, *Rocket League*, and more.
- **Deep Analysis**: Uses **TCP Handshakes** to measure connection quality to game servers, bypassing ICMP blocks.
- **Live Status**: Instantly detects server maintenance or outages.
- **Jitter Tracking**: Visualizes stability per region to help you pick the best server.

### 🛡️ Privacy First
- **Streamer Mode**: One-click obscure mode to hide IP, ISP, and Location during livestreams.
- **Zero Telemetry**: All history and settings are stored locally on your machine.
- **Open Source**: Transparent code with no hidden trackers.

### 📜 Historical Tracking
- **Auto-Save**: Automatically logs every test result locally.
- **Trend Analysis**: Compare past performance to identify ISP degradation.
- **Detailed Logs**: Exportable data with timestamps and network conditions.

## 🛠️ Technology Stack

- **Backend**: Rust (via Tauri v2) for system-level networking and stability.
- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: TailwindCSS v4, Framer Motion, customized CSS Variables.
- **Design System**: Custom "Glass" utility classes and refined typography (Inter font).

## 📦 Installation & Development

### Prerequisites
- macOS (Apple Silicon or Intel)
- Node.js (v18+)
- Rust (latest stable)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/ekremguvendiren/Pingly.git
   cd Pingly
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Run in Development Mode**
   ```bash
   npm run tauri dev
   ```

4. **Build Release Version**
   ```bash
   npm run tauri build
   ```
   The `.dmg` file will be located in `src-tauri/target/release/bundle/dmg`.

## 🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
