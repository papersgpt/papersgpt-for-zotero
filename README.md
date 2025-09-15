[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/papersgpt-papersgpt-for-zotero-badge.png)](https://mseep.ai/app/papersgpt-papersgpt-for-zotero)

# PapersGPT: The Ultimate Zotero AI Plugin
PapersGPT is a Zotero plugin that brings state-of-the-art Zotero AI capabilities directly into your research workflow, allowing you to chat PDFs in Zotero, quickly gain key detailed insight, generate summaries, and more. It supports GPT 5, Gemini, DeepSeek V3.1, Grok 4, ChatGPT, o1/o3/o4-mini, Claude, OpenRouter, SiliconFlow, gpt-oss, Kimi K2, GLM 4.5, DeepSeek R1 0528, Qwen3, Gemma 3, Llama 3.2 and Mistral. Now PapersGPT supports MCP :sparkles: :fire:, any chatbot client which supports MCP can connect to your personal Zotero library through PapersGPT.  

## Quickstart

***

### Step 1: Download and Install

1.  First, download the latest [PapersGPT](https://github.com/papersgpt/papersgpt-for-zotero/releases/download/papersgpt-v0.3.3/papersgpt-v0.3.3.xpi).
2.  Then, install the downloaded Zotero plugin file. For more details, please see [here](https://www.papersgpt.com/blogs/cookbook-papersgpt).

### Step 2: Start Chatting with a PDF or Multiple PDFs

#### 1. Launch PapersGPT

*   **Chat with a Single PDF**
    *   Open a PDF from your Zotero library.
    *   When you need AI assistance, click <img width="24" height="24" alt="papersgpt-logo" src="https://github.com/user-attachments/assets/5658ede0-131f-481c-93f0-b4072440524e" />
 on the top menu of the PDF viewer or use a keyboard shortcut:
        *   **macOS:** `Command + Enter`
        *   **Windows:** `Ctrl + Enter`

*   **Chat with Multiple PDFs**
    *   Select multiple files or a collection in the main Zotero window. Hold `Ctrl` while clicking files on Windows. Hold `Command` while clicking files on Mac. You can see the demo below.

#### 2. Select a LLM model and configure the API KEY of the model, more detailed information please see [here](https://www.papersgpt.com/blogs/cookbook-papersgpt)

#### 3. Ask Questions

*   Use the built-in prompts for common tasks like: Summary, Background, Generating a literature review, Theoretical frameworks, Future directions.  
*   You can also directly type any question or custom prompt to start the conversation.  

### Step 3: Manage Your Findings and close the chat

*   After chatting, you can easily save the key insights and answers you've gathered from the conversation.  

*   When you're finished, click the red cross (X) close button to exit the PapersGPT window.

## Key Features  
**The fastest responding MCP server connecting to Zotero**  
C++ MCP server, no need to install Python or Node, after installing the PapersGPT plugin, start Zotero, and it can be used on all Chatbot clients that support MCP Server on Mac and Windows. It supports BM25 full-text search of document title, author, tags, abstract, notes, annotation and collection.  

**Blazing-Fast. Even for 100+ Page Documents**  
Optimized for heavy documents, 5x faster PDF reading, allowing you to glide through hundred-page reports, academic papers, and e-books with zero lag.  

**Chat multiple PDFs**  

https://github.com/user-attachments/assets/a7c383cd-3986-44cb-bd0e-0d4832b07500

  
**Lots of SOTA Business LLMs For Choosing:**  
- The offical API of Qwen, Mistral, Kimi, Z.ai and SiliconFlow can all be accessed in PapersGPT now, they are all top models with very high cost performance.  
- Integrate OpenRouter in which there are almost all the SOTA business models, and just one key to access all the models on it.  
  GPT 5, Claude Opus 4.1, Grok 4, Gemini 2.5 Pro/Flash, Kimi K2, GLM 4.5, Qwen3(free), DeepSeek(free), Claude 4 are all here. :sparkles: :fire:   
- Powered by the smartest cutting-edge LLMs, offering high accuracy to assist you effectively reading papers. Now support the following latest SOTA models:  
  *gpt-5* **New king on ChatBot Arena Leaderboard;** :sparkles: :fire::fire::fire:  
  *gemini-2.5-pro* **#2 on ChatBot Arena Leaderboard;** :sparkles: :fire:  
  *qwen3-235b-a22b-instruct-2507* **#5 on ChatBot Arena Leaderboard, very chip** :sparkles: :fire:   
  *kimi-k2-0711-preview* **very chip** :sparkles: :fire:   
  *Claude-Opus-4.1* **New model of Claude**   
  *qwen3*  
  *o1/o3/o4-mini*   
  *gpt-4.1*   
  *DeepSeek-V3*     
  *DeepSeek-R1*   
  *claude-3.7-sonnet*   
  *grok3*   
  *gemini-2.0-flash-thinking*   
  *gemini-2.0-pro-exp*  
  *gemini-2.0-flash-exp*     
  *gemini-2.0-flash*    
  *gmini-2.0-flash-Lite*  
  *gemini-1.5-pro*  
  *gemini-1.5-flash*   
  *chatgpt-4o-latest*   
  *gpt-4o-2024-11-20*   
  *gpt-4o-mini*  
  *claude-3.5-sonnet*  
  *claude-3.5-haiku*  
  
**One click running local totaly free SOTA LLMs on Windows and Mac** :sparkles: :fire:  
- Now support the following models:  
  *gpt-oss-20b* OpenAI open source model :sparkles: :fire: :fire:   
  *DeepSeek 0528 Distill Qwen3 8B*  :sparkles: :fire: 
  *Gemma 3*  :fire:   
  *Qwen 3*  :fire:   
  *Phi-4*  
  *Phi-4-Mini-Reasoning*   
  *Mistral 3.1*  
  *DeepSeek-Distill-Llama*  
  *Llama 3.2*  
- Models of different sizes are built in based on the size of the local machine GPU.  
- Note: Please keep a good connection with huggingface and github network for models and environment downloading.
- These models can be automatically downloaded, installed and used with just one click on the plugin page, models are all locally stored, ensuring not sending your data to remote LLMs.  
  Of course, these models can be switched as your will, and smarter Open Source LLMs in the future would be accessed as soon as possible.  
- 100% Privacy and Safe of Your Personal Data. Besides local LLMs, the RAG modules of embeddings, vector database and rerank are all built and runned locally, There will be no data leakage and it can be used normally even on the plane when the internet can't be connected.  
- Don't worry about your memory overflow, all the Local models shown in PapersGPT can run on your PC. If there are GPUs on your computer, it will automatically choose GPU to run local LLM instead of CPU. Recommand Gemma3 1b, DeepSeek-Distill-Qwen-1.5B or Qwen3-1.7B, in almost all the computers, they all can run and respond quickly.    

https://github.com/user-attachments/assets/2630a332-1bcd-4132-a37e-d8b360ba1c09

 

**Compatible with ollama:**  

- If use ollama, just choose the Ollama in the Customized selection. The model name need to fill is consistent with the name in ollama.    

**Seamless Zotero Integration:**  

- Syncs directly with your Zotero library, making it easy to manage and chat your documents without leaving the Zotero interface.  

## Build the plugin

If you like to build the plugin by yourself, do as the below commands:

```bash
git clone https://github.com/papersgpt/papersgpt-for-zotero.git
cd papersgpt-for-zotero
npm install
npm run build
```
The plugin file(papersgpt.xpi) will be built and generated into the build directory
 
## Use Cases

**Research Assistance:**  

- Summarize research papers, identify key concepts, and quickly get answers to your questions.

**Academic Writing:** 

- Generate insights for literature reviews or dive deep into specific sections of papers.  

**Collaborative Projects:** 

- Share annotated PDFs and responses with colleagues and teams for smoother collaboration.
  
## Contributions

Contributions to PapersGPT are welcome! Please follow the standard GitHub process for submitting pull requests or reporting issues.

