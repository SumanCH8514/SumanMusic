<div align="center">

<img src="https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEiQcq9JW-7OCvpIQ9XvoF52Fe1G4EUkPlGGRLL0rxShLbT_1taBp0XuT2hmJDU6S2NWZh_WmwFwEpnosKk1mWXaLNqpCRGSleFgbtQLPdMo518w2Vedsnh2dZUMYyZv8YdJrghW4v3SGp8dMdCthac7Zkvi4hizggT0ueTpExsy6OEUAuIs4-2x2uGP17Po/s0/SumanMusic-logo.png" width="180" alt="SumanMusic Logo">

# 🎵 SumanMusic
### The Ultimate Personal Music Streaming Ecosystem.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

[Explore the App](https://songs.sumanonline.com/) · [Report Bug](https://github.com/suman/SumanMusic/issues) · [Request Feature](https://github.com/suman/SumanMusic/issues)

</div>

---

## ✨ Overview

SumanMusic is a high-performance, aesthetically-driven music application that bridges your Google Drive storage with a world-class streaming interface. Built with **React 19** and **Vite 8**, it offers a "Spotify-like" experience for your own private audio collection, complete with real-time lyrics, cloud-synced playlists, and deep OS integration.

---

## 🚀 Key Features & Capabilities

### 📂 Hybrid Cloud Library
- **Dual-Source Streaming**: Seamlessly switch between a pre-configured "Inbuilt" music collection and your "Personal" Google Drive.
- **Recursive Directory Scan**: Automatically discovers audio files deep within your Drive folders.
- **Dynamic Metadata Enrichment**: Automatically fetches high-quality album art and artist biographies for your local files via external APIs.

### 🎧 Pro Player Experience
- **Media Session API**: Full integration with Windows/macOS/Linux media controls. See artwork and control playback from your lock screen or media keys.
- **Synchronized Lyrics**: Support for `.lrc` files with real-time scrolling and manual playback seeking.
- **Smart Queue & Shuffle**: Advanced queue management with persistent shuffle states and repeat modes.
- **Audio Visualizers**: Native-like micro-animations and visual feedback during playback.

### 🌍 Universal Connectivity
- **Platform-Independent Share Links**: Generate short links for any track, album, or playlist that work across any environment (localhost or production).
- **Responsive Architecture**: A custom-built mobile mini-player and a glassmorphic desktop sidebar ensure a premium feel on any device.

### 🔐 Security & Persistence
- **Firebase Core**: Real-time Firestore sync for your liked songs, playlists, and user preferences.
- **Encrypted Environment**: All API keys and secrets are strictly managed via environment variables, ensuring zero exposure in the repository.
- **Guest Access**: Fully functional "Guest Mode" for users who prefer localized persistence without signing into Google.

---

## 🛠️ Technical Architecture

### Core Technologies
- **Frontend**: `React 19` (Latest stability and performance)
- **Styling**: `Tailwind CSS 4` (High-efficiency utility-first styling)
- **State Management**: Context API with specialized hooks (`usePlayer`, `useAuth`, `useGDrive`).
- **Animations**: `Framer Motion` for smooth transitions and layout animations.
- **Database**: `Cloud Firestore` for real-time data persistence.
- **Streaming**: Direct integration with `Google Drive API` for low-latency audio delivery.

### Internal Project Structure
```text
SumanMusic/
├── src/
│   ├── components/      # Reusable UI (MusicPlayer, Sidebar, List/Grid views)
│   ├── context/         # Centralized state (Player, Auth, GDrive, Theme)
│   ├── hooks/           # Business logic (useAudio, usePlayer hooks)
│   ├── services/        # API integrations (Google Drive, Lyrics, Metadata)
│   ├── views/           # Page transitions (Home, Library, Search, Administrative)
│   └── lib/             # Third-party config (Firebase, Utils)
├── public/              # Static assets and PWA manifests
└── .env_example         # Security template for contributors
```

---

## 🏁 Getting Started

### 1. Prerequisites
- **Node.js**: v18+ 
- **Firebase Project**: A free Firebase project for Auth and Firestore.
- **Google Cloud Console**: Enabled Drive API and API credentials.

### 2. Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/suman/SumanMusic.git
   cd SumanMusic
   npm install
   ```

2. **Environment Configuration**
   Copy the example template to create your secure `.env` file:
   ```bash
   cp .env_example .env
   ```
   *Fill in your Firebase credentials and Google API keys in the `.env` file.*

3. **Launch**
   ```bash
   npm run dev
   ```

---

## 📸 Screenshots

<div align="center">
  <img src="public/screenshots/landing.png" width="800" alt="SumanMusic Landing Page">
  <p><i>The Landing Page: A premium entry point into your music ecosystem.</i></p>

  <br>

  <table style="width:100%">
    <tr>
      <td width="50%"><img src="public/screenshots/home_dark.png" alt="SumanMusic Home Dark"></td>
      <td width="50%"><img src="public/screenshots/home_light.png" alt="SumanMusic Home Light"></td>
    </tr>
    <tr>
      <td align="center"><b>Elegant Dark Mode</b></td>
      <td align="center"><b>Clean Light Mode</b></td>
    </tr>
  </table>

  <br>

  <table style="width:100%">
    <tr>
      <td width="50%"><img src="public/screenshots/player_expanded.png" alt="SumanMusic Expanded Player"></td>
      <td width="50%"><img src="public/screenshots/search.png" alt="SumanMusic Search"></td>
    </tr>
    <tr>
      <td align="center"><b>Immersive Player & Lyrics</b></td>
      <td align="center"><b>Smart Search & Categories</b></td>
    </tr>
  </table>
</div>

---

## 🤝 Contributing & Support

We welcome all contributors! Whether it's a bug fix, feature request, or styling improvement, feel free to open a PR.

1. Fork the repo.
2. Create your branch (`git checkout -b feature/NewFeature`).
3. Commit (`git commit -m 'Add NewFeature'`).
4. Push (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📄 License
Distributed under the **MIT License**. See `LICENSE` for details.

<div align="center">

Built with ❤️ by [SumanCH8514](https://github.com/SumanCH8514/)

</div>
