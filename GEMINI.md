# GEMINI.md

## Project Overview

This project is a high-performance task management application called **FocusFlow**. It is built using **React 19** and **Vite** for the frontend, with **Electron** as a wrapper for the desktop application. The application is styled with **Tailwind CSS 4** and uses **Zustand** for state management. For data persistence, it uses **Better-SQLite3** in the Electron environment and falls back to **LocalStorage** in the browser.

The application features dynamic Kanban boards with drag-and-drop functionality, a universal calendar, and powerful task filtering and sorting capabilities. It is designed to be cross-platform, with optimizations for both native desktop performance and browser-based accessibility.

## Building and Running

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   npm or yarn

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

### Development

*   To run the full Electron + Web development environment:
    ```bash
    npm run dev
    ```

*   To start only the Vite development server (Browser mode):
    ```bash
    npm run dev:renderer
    ```

*   To launch the Electron application only:
    ```bash
    npm run dev:electron
    ```

### Building

*   To build the project for production:
    ```bash
    npm run build
    ```

### Linting

*   To run ESLint to check for code quality issues:
    ```bash
    npm run lint
    ```

## Development Conventions

*   **State Management:** The project uses **Zustand** for global state management. The store is defined in `src/store/useStore.js`.
*   **Component-Based Architecture:** The UI is built with **React** components, which are organized into features under the `src/features` directory.
*   **Styling:** **Tailwind CSS 4** is used for styling. Configuration is in `tailwind.config.js`.
*   **Persistence:** Data is persisted using the `electronAPI` for the desktop app (SQLite) and `localStorage` for the web. The persistence logic is handled in `src/App.jsx` and `src/store/useStore.js`.
*   **Native Integration:** The Electron main process is in `electron/main.js`, and the preload script in `electron/preload.js` exposes the `electronAPI` to the renderer process.
*   **Code Quality:** The project uses **ESLint** for code quality, with the configuration in `eslint.config.js`.
