# PapersGPT

## AI Research Agent for Zotero — Whole-Library Search, Literature Radar, Multi-PDF Chat & AutoPilot

**PapersGPT** is a professional AI research tool for Zotero, built for deep research across your entire library. More than chatting with a single PDF — go one step beyond: ask questions across your **entire library**, **discover and track new research** with Literature Radar, **compare multiple papers side-by-side**, and let **AutoPilot** batch-read collections overnight, with structured results saved directly into Zotero Notes.

It supports 30+ cloud LLMs (GPT-6, Claude 5.5, Gemini 4, DeepSeek v4.1, Grok…), built-in local models that run fully offline, or your own API key. **Quick to start:** a built-in trial of cloud AI chats — no API key needed.

<p align="center">
  <a href="https://github.com/papersgpt/papersgpt-for-zotero/releases/download/papersgpt-v2.1.0/papersgpt-v2.1.0.xpi"><b>⬇️ Download PapersGPT</b></a> ·
  <a href="https://www.papersgpt.com">Website</a> ·
  <a href="https://www.papersgpt.com/quickstart">Quickstart</a>
</p>

## 🧭 PapersGPT at a Glance

| | |
| :--- | :--- |
| **What it is** | Professional AI research agent and plugin for Zotero — deep-research your library: chat with PDFs, whole-library search, discover and track new papers |
| **LLM support** | 30+ cloud models (GPT-6, Claude 5.5, Gemini 4, DeepSeek v4.1, Grok, GLM 5.3, Kimi k3…) · built-in local models · Ollama · custom OpenAI-compatible APIs |
| **Privacy** | 100% local parsing, indexing and search; local LLMs run fully offline — your data never leaves your machine |
| **Scale (tested)** | 10,000 PDFs (42 GB, 170k pages) indexed in ~7 minutes; 19.5 ms average query time — [benchmark details](./benchmark.md) |
| **Integrations** | Zotero MCP Server (Claude Desktop, Claude Code, Cursor, ChatGPT desktop…) · Ollama · Agent SKILL |
| **Compatibility** | Zotero 7, 8, 9, 10 · macOS, Windows, Linux |
| **License** | AGPL-3.0 open source |

---

## ✨ Core Features

### 1. Whole-Library Search — ask across every paper in your Zotero library
PapersGPT indexes your entire Zotero library (thousands of PDFs). Just ask in natural language and get answers based on **all** your papers — not just the one you have open. Works at 10,000+ paper scale, and pairs well with multi-PDF chat for cross-paper analysis.

### 2. Literature Radar — discover & track new research
Subscribe to your research topics and Literature Radar monitors **arXiv, PubMed, Semantic Scholar, Europe PMC, Crossref, bioRxiv, medRxiv** for you. New papers arrive as a daily digest inside Zotero, visualized against your existing collections — new research finds you, instead of you chasing databases. Queries go straight from your machine to the source APIs, with no relay server.

### 3. Multi-PDF Chat & Comparison
Beyond chatting with a single PDF, you can chat with multiple PDFs at once: select several papers or an entire collection and compare **methods, results and controversies side-by-side**. Synthesize the cross-paper results into structured drafts or Zotero notes.

*“Compare the sample sizes and p-values of all 50 clinical trials in my 'Cardiology' folder.”*

### 4. AutoPilot — batch-read 100+ papers overnight
Set your research question once and AutoPilot autonomously reads the whole collection, extracting hypotheses, methods and findings into **structured Zotero Notes** while you sleep. Works with cloud models or fully local LLMs, protecting your privacy.

### 5. Verifiable Evidence — click-to-jump citations
Every AI response includes precise citations; clicking one takes you straight to the exact paper being cited. Accuracy you can verify, not just trust.

### 6. Zotero MCP Server & Agent Skills
Turn your local Zotero knowledge base into a primary "skill" for agentic platforms — **Claude Desktop, Claude Code, Cursor, Windsurf, ChatGPT desktop** and any MCP-compatible client. Setup takes just a few clicks from the PapersGPT settings panel; with [mcp-zotero](https://github.com/docsagent/docsagent) you can even index and search your whole library **without launching Zotero**. See [MCP & SKILL Support](#-mcp--skill-support) below.

---

## 🔍 How It Works

PapersGPT parses and indexes every PDF in your Zotero library **locally** — structure-aware, so headings, sections and tables stay meaningful. When you ask a question, it retrieves the relevant passages across your library, synthesizes an answer with your chosen LLM (cloud or local), and attaches **click-to-jump citations** back to the exact source papers. Parsing, indexing and searching all happen on your machine — nothing is uploaded.

---

## ⚡ Performance at Scale

PapersGPT's engine parses document structure directly, so a library of 100 or 10,000+ PDFs stays fast to query — with 100% of parsing, indexing and searching happening **locally**, even in Airplane Mode.

| Library Size | Raw Data Size | Indexing Time | Avg. Query Time | Memory (RSS) | Index Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1,000 PDFs | 4.2 GB | 51.5s | 13.1 ms | 353 MB | 100 MB |
| **10,000 PDFs** | **42 GB** | **421s (7m 01s)** | **19.5 ms** | **2.21 GB** | **901 MB** |

👉 **[View Detailed Scalability Report & System Specs](./benchmark.md)**

---

## 🤖 Models: 30+ Cloud LLMs or Fully Local & Offline

- **Cloud LLMs (30+):** GPT-6, Claude 5.5, Gemini 4, DeepSeek v4.1, Grok, GLM 5.3, Kimi k3 and more — switch seamlessly, or plug in your own API key / any custom OpenAI-compatible endpoint.
- **Built-in local models:** Gemma 4, Qwen 3.5, DeepSeek Distill, Mistral 7B, Llama 3.1 — one-click download from Hugging Face, no complex installation. Run **100% on your machine, completely offline, no API keys needed.**

Three ways to connect local LLMs:

1. **Integrated SOTA open-source LLMs** — select a model from the "Local LLM" option and it is downloaded from Hugging Face and launched automatically.
2. **Custom OpenAI-compatible endpoint** — connect to any privately deployed OpenAI-compatible LLM API.
3. **Ollama integration** — use any LLM running in your local Ollama instance.

🔒 **Privacy by design:** parsing, indexing and searching all happen locally; local LLMs + local document processing ensure **"zero-byte" data leakage** from your device — critical for confidential research, unpublished work and institutional compliance.

---

## 📖 Quickstart

### Step 1: Download and Install

1. Download the latest [PapersGPT](https://github.com/papersgpt/papersgpt-for-zotero/releases/download/papersgpt-v2.1.0/papersgpt-v2.1.0.xpi) (.xpi).
2. Install it into Zotero. For more details, see the [PapersGPT Quickstart guide](https://www.papersgpt.com/quickstart).

### Step 2: Launch and Choose What to Chat With

- **Chat with a Single PDF** — open a PDF from your library, then click <img width="24" height="24" alt="PapersGPT button in the Zotero PDF viewer toolbar" src="https://github.com/user-attachments/assets/5658ede0-131f-481c-93f0-b4072440524e" /> on the PDF viewer's top menu, or use the shortcut:
  - **macOS:** `Command + Enter` · **Windows:** `Ctrl + Enter`
- **Chat with Multiple PDFs** — select multiple files or a collection in the main Zotero window (`Ctrl`+click on Windows, `Command`+click on Mac).
- **Chat with the Entire Library** — check **"Search entire library"** in PapersGPT and it will retrieve relevant documents across the whole library and synthesize an answer.
- **Literature Radar & AutoPilot** — subscribe to topics in Literature Radar, or set a research goal in AutoPilot and let it process a collection overnight.

Then pick a model: any of the 30+ cloud LLMs (a built-in trial is included, no API key needed to start) or a built-in local model. See the [Models guide](https://www.papersgpt.com/models) for details.

### Step 3: Ask, Save and Close

- Use the built-in prompts for common tasks: Summary, Background, Literature review, Theoretical frameworks, Future directions — or type any question directly.
- Save the key insights from your conversation into your Zotero notes.
- When you're finished, click the red cross (X) button to exit the PapersGPT window.

---

## 🔌 MCP & SKILL Support

**MCP** lets you access your Zotero papers, Obsidian, and Apple Notes from Claude, the ChatGPT desktop app and other MCP clients — see [docsagent](https://github.com/docsagent/docsagent) for details.

**Professional [SKILL](papersgpt-for-zotero/SKILL.md)** provides various agents for connecting to your local Zotero library:

- OpenClaw users: get the skill from [ClawHub](https://clawhub.ai/papersgpt/papersgpt-for-zotero) — issues are welcome in this GitHub repo or on ClawHub.
- Users of OpenAI, Claude, Cursor, Claude Code, CodeX or Gemini CLI apps can directly copy and load the [SKILL](papersgpt-for-zotero/SKILL.md).

---

## ❓ FAQ

### What is PapersGPT?
A professional AI research tool that runs inside Zotero: it indexes your library locally, so you can chat with a single PDF, multiple papers, or the whole library — track new research with Literature Radar and batch-read collections with AutoPilot.

### Can I chat with multiple PDFs in Zotero?
Yes. Select several papers or a whole collection and ask questions across all of them — methods, results and controversies are compared side-by-side, and answers can be saved into Zotero notes.

### Can I use AI with my Zotero library completely locally and offline?
Yes. Built-in local LLMs (Gemma 4, Qwen 3.5, Mistral 7B, Llama 3.1 and more) run entirely on your machine — PDFs, questions and responses never leave it, and parsing, indexing and searching work offline too.

### How do I do a literature review with AI and Zotero?
Select a collection, set your research questions, and AutoPilot reads the papers overnight, extracting findings into structured Zotero Notes. You can also chat with multiple papers simultaneously and export synthesized insights.

### Can AI automatically track new papers in my research field?
Yes — subscribe to your topics in Literature Radar and get daily digests from arXiv, PubMed, Semantic Scholar, bioRxiv and more, delivered inside Zotero.

### How do I connect Zotero to Claude Desktop, ChatGPT or Cursor?
PapersGPT's built-in MCP (Model Context Protocol) Server connects your library to any MCP-compatible client — setup takes a few clicks in the settings panel. See [MCP & SKILL Support](#-mcp--skill-support).

### How large a library can PapersGPT handle?
In our benchmark, 10,000 PDFs (42 GB, 170k pages) were indexed in about 7 minutes, with an average query time of 19.5 ms. See the [scalability report](./benchmark.md).

More questions: [the PapersGPT FAQ](https://www.papersgpt.com/#faq) on papersgpt.com.

---

## 🏢 Professional Compliance

PapersGPT is designed for professionals in **Research, Legal and Finance** who handle high-stakes, sensitive data:

- **Research**: Cross-reference thousands of papers while maintaining 100% data sovereignty.
- **Finance**: Synthesize decade-long 10-K filings without cloud risk.
- **Legal**: Perform high-precision discovery across thousands of case files.

---

## 👥 Join 50,000+ Satisfied Researchers

> *"PapersGPT is one of those apps you don't realize you need until you try it. It helps me filter my Zotero library and focus on reading relevant papers at amazing speed."*
> — Pratik Narain Srivastava, Postdoctoral Researcher, University of Calgary

**Unlock Professional Capabilities** at [papersgpt.com](https://www.papersgpt.com) →

> Don't just search your library. Understand it.
