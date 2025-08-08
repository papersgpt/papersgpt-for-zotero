<h1 align="center">
PapersGPT For Zotero
</h1>
It is a zotero AI plugin for improving your papers reading and research efficently with GPT 5, Gemini, Grok 4, ChatGPT, o1/o3/o4-mini, Claude, gpt-oss, Kimi K2, GLM 4.5, DeepSeek R1 0528, Qwen3, Gemma 3, Llama 3.2 and Mistral. It offers users the ability to ask questions, extract insights, and converse with PDFs directly, providing a powerful research assistant for scholars, researchers, and anyone who deals with large amounts of text in PDF format.  

## Key Features  
**Blazing-Fast. Even for 100+ Page Documents**  
Optimized for heavy documents, 5x faster PDF reading, allowing you to glide through hundred-page reports, academic papers, and e-books with zero lag.  

**Chat multiple PDFs**  
Select multiple files(Windows: ctrl+, MacOS: command+) or some collection in main window of Zotero, and then to chat with AI models:  
- There are some built-in prompts, such as generating literature review, theoretical frameworks, and future directions etc.  
- You can also directly input any words or prompts to chat.  


https://github.com/user-attachments/assets/a7c383cd-3986-44cb-bd0e-0d4832b07500


  
  
**Lots of SOTA Business LLMs For Choosing:**
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

- If use ollama, please set Customized API URL to http://localhost:11434/api/chat in the selection of Customized. The model name need to fill is consistent with the name in ollama. API KEY no need to fill.  

**Seamless Zotero Integration:**

- Syncs directly with your Zotero library, making it easy to manage and chat your documents without leaving the Zotero interface.
  
## How to Use  

**Installation:** 

- First download papersgpt.xpi plugin [here](https://github.com/papersgpt/papersgpt-for-zotero/releases/download/papersgpt-v0.2.5/papersgpt-v0.2.5.xpi). 
  Open Zotero in the top menu bar, click on `Tools > Add-ons`.  Click on the gear icon at the top right of the window.  
  Click on `Install Add-on From File` and open the downloaded plugin file papersgpt.xpi.

**Startup:**

- In Zotero, press the keys to start the plugin, MacOS(command + enter), Windows(ctrl + enter). 

**Select LLM models:**
 
- For Windows users, the OpenAI, Claude, and Gemini models can all be accessed and switched by one click.  
- For Mac users, besides the above excellent business models, Gemma 3, DeepSeek-R1-Distill-Llama, DeepSeek-R1-Distill-Qwen, QwQ-32B, Llama 3.2 and Mistral can all be choosed by just one click in plugin without manualy installing many boring additional tools or softwares.  

**Chat PDFs in Zotero:** 

- Open any PDF and start asking questions. PapersGPT will process the document and provide insightful responses.

**Manage Insights:** 

- Save, export, or share the extracted insights, answers, and annotations from your conversations.

**Quit:**  

- Press esc key to exit. 


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

