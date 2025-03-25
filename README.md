<h1 align="center">
PapersGPT For Zotero
</h1>
It is a zotero AI plugin for improving your papers reading and research efficently with ChatGPT, GPT-4.5, Gemini, Claude, DeepSeek, Gemma 3, DeepSeek-R1-Distill-Llama, DeepSeek-R1-Distill-Qwen, QwQ-32B, Llama 3.2 and Mistral. It offers users the ability to ask questions, extract insights, and converse with PDFs directly, providing a powerful research assistant for scholars, researchers, and anyone who deals with large amounts of text in PDF format.

## Key Features

**Lots of SOTA Business LLMs For Choosing:**

- Powered by the smartest cutting-edge LLMs, offering high accuracy to assist you effectively reading papers. Now support the following latest SOTA models:  
  *DeepSeek-R1*  :sparkles: :fire:  
  *DeepSeek-V3*  :sparkles: :fire:   
  *gemini-2.0-flash-thinking* **#2 on Chatbot Arena** :sparkles: :fire:  
  *gemini-2.0-pro-exp*  
  *gemini-2.0-flash-exp*     
  *gemini-2.0-flash*  :sparkles: :fire:   
  *gmini-2.0-flash-Lite*   
  *LearnLM-1.5*  
  *gemini-1.5-pro*  
  *gemini-1.5-flash*  
  *gpt-4.5* **30x more expensive than gpt-o series models** :fire:  
  *chatgpt-4o-latest* :fire:  
  *gpt-4o-2024-11-20*   
  *gpt-4o-mini*  
  *claude-3.7-sonnet* :sparkles: :fire:   
  *claude-3.5-sonnet*  
  *claude-3.5-haiku*  

**Lots of the Latest SOTA Open Source Freely Local LLMs For Mac Users:**

- There are many SOTA free and open source models built in, Now support the following models:  
  *Gemma 3* :sparkles: :fire::fire::fire:  
  *QwQ-32B* :sparkles: :fire::fire::fire:  
  *DeepSeek-R1-Distill-Llama* :sparkles: :fire::fire::fire:  
  *DeepSeek-R1-Distill-Qwen* :sparkles: :fire::fire::fire:  
  *Llama3.2*     
  *Marco-o1*    
  *Mistral*   
  These models can be automatically downloaded, installed and used with just one click on the plugin page, models are all locally stored, ensuring not sending your data to remote LLMs.  
  Of course, these models can be switched as your will, and smarter Open Source LLMs in the future would be accessed as soon as possible.
- 100% Privacy and Safe of Your Personal Data. Besides local LLMs, the RAG modules of embeddings, vector database and rerank are all built and runned locally, There will be no data leakage and it can be used normally even on the plane when the internet can't be connected.
- Notice: Gemma 3 is the 2nd best open model only below DeepSeek-R1 benchmarked by Chatbot Arena, while much smaller than DeepSeek R1, and it is not a reasoning model, your Mac's memory should be at least 12G.  
          QwQ-32B is as great as DeepSeek R1, while the model size is much smaller than DeepSeek. please ensure your Mac's memory at least 16G. DeepSeek-R1-Distill-Llama/Qwen is great! Highly recommended to try on your Mac, please ensure your Mac's memory at least 8G. If you want to use Gemma 3 or QwQ-32B on Windows, please use ollama or llama.cpp to deploy QwQ-32B locally first, and then connect to the local LLM server by customized LLM api.

**Seamless Zotero Integration:**

- Syncs directly with your Zotero library, making it easy to manage and chat your documents without leaving the Zotero interface.
  
## How to Use  

**Installation:** 

- First download papersgpt.xpi plugin [here](https://github.com/papersgpt/papersgpt-for-zotero/releases/download/papersgpt-v0.1.1/papersgpt-v0.1.1.xpi). 
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

