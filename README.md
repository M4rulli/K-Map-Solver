# 🧩 K-Map Solver

<p align="center">
  <b>Modern Karnaugh Map Solver with a fully client-side Quine–McCluskey engine</b><br/>
  Built with React + Vite + TailwindCSS
</p>

<p align="center">
  <img alt="License: GPL-3.0" src="https://img.shields.io/badge/License-GPLv3-blue.svg" />
  <img alt="React" src="https://img.shields.io/badge/React-18+-61dafb?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5+-3178c6?logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7+-646cff?logo=vite&logoColor=white" />
  <img alt="TailwindCSS" src="https://img.shields.io/badge/TailwindCSS-3+-38bdf8?logo=tailwindcss&logoColor=white" />
</p>

---

## ✨ Overview

**K-Map Solver** is a modern, interactive Karnaugh Map minimization tool built entirely in the browser.

It implements a full **Quine–McCluskey Boolean minimization engine**, without relying on external logic libraries or backend services.

> 🧠 All computations are performed client-side.  
> 🚫 No API calls. No server dependencies.

---

## 🚀 Features

- 🔢 Support for **2 to 5 variables**
- 🔄 Toggle between:
  - **SOP (Sum of Products)**
  - **POS (Product of Sums)**
- 📊 Interactive Karnaugh Map UI
- 🧾 Truth Table modal for fast input
- 🧮 Mathematical rendering via **MathJax**
- 🌍 English / Italian localization
- 🧠 Custom Quine–McCluskey implementation

---

## 📦 Getting Started

Clone the repository:

```bash
git clone https://github.com/M4rulli/K-Map-Solver.git
cd K-Map-Solver
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

---

## 🗺 Roadmap

Planned improvements:

- [ ] Logic gate circuit visualization (auto-generated)
- [ ] Variable style customization (x₀, a, b, c…)
- [ ] Export to Verilog / VHDL / JSON / Latex
- [ ] Unit tests

---

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See the [`LICENSE`](LICENSE) file for details.
