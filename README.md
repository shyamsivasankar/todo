# ⚡ FocusFlow: The Ultimate Productivity Suite

FocusFlow is a modern, high-performance task management application built for speed, aesthetics, and seamless organization. Whether you're managing complex projects on your desktop or tracking daily tasks in your browser, FocusFlow provides a premium experience with robust persistence and fluid interactions.


## ✨ Features

- **🚀 Dynamic Kanban Boards**: Experience seamless drag-and-drop task management powered by `@dnd-kit`.
- **📅 Universal Calendar**: Visualize your deadlines and schedule tasks across a unified timeline.
- **💾 Hybrid Persistence**: Lightning-fast SQLite for desktop (Electron) and robust LocalStorage for web fallback.
- **✨ Premium Aesthetics**: Crafted with Tailwind CSS 4, featuring glassmorphism, smooth animations, and a curated dark theme.
- **🛠 Powerful Task Engine**: Deep filtering, sorting, and search capabilities to keep you organized.
- **🌓 Cross-Platform**: Optimized for both native desktop performance and browser-based accessibility.

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Desktop Wrapper**: [Electron](https://www.electronjs.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Database**: [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) (Desktop)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/todo.git
    cd todo
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run in Development Mode**:
    This will start both the Vite dev server and the Electron application.
    ```bash
    npm run dev
    ```

### Scripts

- `npm run dev`: Launch the full Electron + Web development environment.
- `npm run dev:renderer`: Start only the Vite development server (Browser mode).
- `npm run dev:electron`: Launch the Electron application only.
- `npm run build`: Build the project for production.
- `npm run lint`: Run ESLint to check for code quality issues.

## 📂 Project Structure

- `src/`: React source code (features, components, stores).
- `electron/`: Main and preload scripts for Electron.
- `public/`: Static assets.
- `scripts/`: Maintenance and build scripts (e.g., SQLite rebuild).

---

Built with ❤️ by FocusFlow Team
