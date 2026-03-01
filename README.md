# LinkedIn Profile LinkerPro 🚀

**High-performance AI networking intelligence with a professional Dark Theme interface.**

LinkedIn Profile LinkerPro is a sophisticated web application designed to transform raw attendee lists into enriched professional profiles. Leveraging the power of Google's Gemini AI, it automatically identifies missing job titles, companies, and regions, providing deep insights into your network.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css)
![Gemini](https://img.shields.io/badge/AI-Gemini-orange?logo=google-gemini)

---

## ✨ Key Features

-   **📁 Smart CSV Processing**: Upload raw attendee lists (CSV) with an advanced parser that handles quoted multiline fields and complex formatting.
-   **🤖 AI-Powered Enrichment**: Automatically fill in missing job titles, companies, and geographic regions using Gemini 3 Flash.
-   **🔍 Deep Profile Analysis**: Extract years of experience, professional background, key responsibilities, achievements, and skills for every contact.
-   **💡 Intelligent Recommendations**: Use the built-in AI Agent to find the best matches for your networking goals using natural language queries.
-   **📊 Multi-Format Export**: Save your enriched data as **CSV**, **JSON**, or **XLSX (Excel)** for use in CRM or outreach tools.
-   **💾 Session Restore**: Easily resume your work by importing previously enriched `.json` or `.csv` files.
-   **🌙 Professional Dark UI**: A "mission control" style interface built with Tailwind CSS, featuring smooth animations and high-fidelity data grids.

---

## 🛠️ Tech Stack

-   **Frontend**: [React 19](https://reactjs.org/) with [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **AI Engine**: [Google Gemini API (@google/genai)](https://ai.google.dev/)
-   **Data Handling**: [XLSX](https://sheetjs.com/) for Excel exports, Custom CSV Parser
-   **Build Tool**: [Vite](https://vitejs.dev/)

---

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   An API Key for Google Gemini (available at [Google AI Studio](https://aistudio.google.com/))

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/linkedin-profile-linkerpro.git
    cd linkedin-profile-linkerpro
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Set up environment variables**:
    Create a `.env` file in the root directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Start the development server**:
    ```bash
    npm run dev
    ```

5.  **Build for production**:
    ```bash
    npm run build
    ```

---

## 📖 Usage Guide

1.  **Upload**: Start by dragging and dropping your raw CSV attendee list into the "New Extraction" zone.
2.  **Map**: Use the column mapper to tell the app which columns contain names, LinkedIn URLs, or emails.
3.  **Enrich**: Click "Finalize" to let the AI identify missing roles. Then, use the "Enrich All" feature for deep professional analysis.
4.  **Recommend**: Use the "AI Agent" tab to ask questions like *"Who here has more than 10 years of experience in AI?"* or *"Find me potential investors in the fintech space."*
5.  **Export**: Download your high-fidelity networking list in your preferred format.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

*Built with ❤️ for the networking community.*
