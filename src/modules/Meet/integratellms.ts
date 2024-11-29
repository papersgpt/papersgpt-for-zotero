import { config } from "../../../package.json";
import { MD5 } from "crypto-js"
import { Document } from "langchain/document";
import LocalStorage from "../localStorage";
import Views from "../views";
import Meet from "./api";
const similarity = require('compute-cosine-similarity');

/**
 * Given text and documents, return a list of documents, returning the most similar ones
 * @param queryText 
 * @param docs 
 * @param obj 
 * @returns 
 */
export async function similaritySearch(queryText: string, docs: Document[], obj: { key: string }) {
  const storage = Meet.Global.storage = Meet.Global.storage || new LocalStorage(config.addonRef)
  await storage.lock.promise;
  const embeddings = new Embeddings() as any
  // Search local, to save space, only store vectors
  // The MD5 value is extracted here as verification. 
  // Here local JSON files may become larger and larger 
  var embeddingSource = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`)
  if (embeddingSource == "Claude-3") {
      const views = Zotero.PapersGPT.views as Views
      const openaiApiKey = views.publisher2models.get("OpenAI").apiKey
      const geminiApiKey = views.publisher2models.get("Gemini").apiKey
      if (openaiApiKey != null && openaiApiKey.length > 0) {
          embeddingSource = "OpenAI" 
      } else if (geminiApiKey != null && geminiApiKey.length > 0) {
          embeddingSource = "Gemini" 
      } else if (Zotero.isMac) {
          embeddingSource = "Localhost" 
      }
  }
  const id = embeddingSource + ":" + MD5(docs.map((i: any) => i.pageContent).join("\n\n")).toString()
  await storage.lock
  const _vv = storage.get(obj, id)
  ztoolkit.log(_vv)
  let vv: any
  if (_vv) {
    Meet.Global.popupWin.createLine({ text: "Reading embeddings...", type: "default" })
    vv = _vv
  } else {
    Meet.Global.popupWin.createLine({ text: "Generating embeddings...", type: "default" })
    vv = await embeddings.embedDocuments(docs.map((i: any) => i.pageContent))
    window.setTimeout(async () => {
      await storage.set(obj, id, vv)
    })
  }

  const v0 = await embeddings.embedQuery(queryText)
  // Find the longest text among the 20 to prevent short but highly similar paragraphs from affecting the accuracy of the answer
  const relatedNumber = Zotero.Prefs.get(`${config.addonRef}.relatedNumber`) as number
  Meet.Global.popupWin.createLine({ text: `Searching ${relatedNumber} related content...`, type: "default" })
  const k = relatedNumber * 5
  const pp = vv.map((v: any) => similarity(v0, v));
  docs = [...pp].sort((a, b) => b - a).slice(0, k).map((p: number) => {
    return docs[pp.indexOf(p)]
  })
  return docs.sort((a, b) => b.pageContent.length - a.pageContent.length).slice(0, relatedNumber)
}


class Embeddings {
  private openaiAPIURL: string = "https://api.openai.com/v1/embeddings"
  private geminiAPIURL: string = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=" 
  private embeddingAPIURL: string = "" 
  constructor() {
  }
  private async request(input: string[]) {
    const views = Zotero.PapersGPT.views as Views
    let api = Zotero.Prefs.get(`${config.addonRef}.usingAPIURL`) as string
    var apiKey = Zotero.Prefs.get(`${config.addonRef}.usingAPIKEY`)
    const split_len: number = Zotero.Prefs.get(`${config.addonRef}.embeddingBatchNum`) as number
    const curPublisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`)
    if (curPublisher == "OpenAI") {
      this.embeddingAPIURL = this.openaiAPIURL
    } else if (curPublisher == "Gemini") {
      this.embeddingAPIURL = this.geminiAPIURL
      this.embeddingAPIURL += apiKey 
    } else if (curPublisher == "Claude-3" || curPublisher == "Customized") {
      const openaiApiKey = views.publisher2models.get("OpenAI").apiKey
      const geminiApiKey = views.publisher2models.get("Gemini").apiKey
      if (openaiApiKey.length > 0) {
        this.embeddingAPIURL = this.openaiAPIURL
	apiKey = openaiApiKey 
      } else if (geminiApiKey.length > 0) {
        this.embeddingAPIURL = this.geminiAPIURL	
        this.embeddingAPIURL += geminiApiKey 
	apiKey = geminiApiKey 
      }	else if (Zotero.isMac) {
        this.embeddingAPIURL = "http://localhost:9080/getTextEmbeddings"
      }
    } 
   
    let res
    
    if (!apiKey && curPublisher != "Claude-3") {
      new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
        .createLine({ text: "Your apiKey is not configured.", type: "default" })
        .show()
      return
    } else if (curPublisher == "Claude-3" && this.embeddingAPIURL.length == 0) {
      new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
        .createLine({ text: "Embedding api is not configured.", type: "default" })
        .show()
      return
    }


    var final_embeddings: number[] = []
    for (let i = 0; i < input.length; i += split_len) {

      const chunk = input.slice(i, i + split_len)
      
      try {
	if (curPublisher == "OpenAI" || ((curPublisher == "Claude-3" || curPublisher == "Customized") && this.embeddingAPIURL.includes("openai"))) {
          res = await Zotero.HTTP.request(
            "POST",
            this.embeddingAPIURL,
            {
              responseType: "json",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "text-embedding-ada-002",
                input: chunk
              }),
            }
          )
	} else if (curPublisher == "Gemini" || ((curPublisher == "Claude-3" || curPublisher == "Customized") && this.embeddingAPIURL.includes("googleapis"))) {
	  var batchRequests = []
	  for (let j = 0; j < split_len; j++) {
            if (i + j >= input.length) break
	    batchRequests.push({
	        model: "models/text-embedding-004",
	        content: {
		    parts: [{
		        text: input[i + j]
		    }]
		}
	    })
	  }
	  res = await Zotero.HTTP.request(
            "POST",
            this.embeddingAPIURL,
            {
              responseType: "json",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                requests: batchRequests 
              }),
            }
          )
	} else if ((curPublisher == "Claude-3" || curPublisher == "Customized") && this.embeddingAPIURL.includes("localhost")) {
	  res = await Zotero.HTTP.request(
            "POST",
            this.embeddingAPIURL,
            {
              responseType: "json",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                texts: chunk
              }),
            }
          )
	}
      } catch (error: any) {
        try {
          error = error.xmlhttp.response?.error
          views.setText(`# ${error.code}\n> ${url}\n\n**${error.type}**\n${error.message}`, true)
          new ztoolkit.ProgressWindow(error.code, { closeOtherProgressWindows: true })
            .createLine({ text: error.message, type: "default" })
            .show()
        } catch {
          new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
            .createLine({ text: error.message, type: "default" })
            .show()
        }
      }

      if ((curPublisher == "OpenAI" || ((curPublisher == "Claude-3" || curPublisher == "Customized") && this.embeddingAPIURL.includes("openai"))) && res?.response?.data) {
	final_embeddings = final_embeddings.concat(res.response.data.map((i: any) => i.embedding))
      } else if ((curPublisher == "Gemini" || ((curPublisher == "Claude-3" || curPublisher == "Customized") && this.embeddingAPIURL.includes("googleapis"))) && res?.response?.embeddings) {
	final_embeddings = final_embeddings.concat(res.response.embeddings.map((i: any) => i.values))
      } else if ((curPublisher == "Claude-3" || curPublisher == "Customized") && this.embeddingAPIURL.includes("localhost")) {
	final_embeddings = final_embeddings.concat(res.response.Embeddings.map((i: any) => i.values))
      }
    }
    return final_embeddings
  }

  public async embedDocuments(texts: string[]) {
    return await this.request(texts)
  }

  public async embedQuery(text: string) {
    return (await this.request([text]))?.[0]
  }
}


export async function getGPTResponse(requestText: string) {
  const usingPublisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`)
 
  if (usingPublisher == "Local LLM") {
      return await getResponseByLocalLLM(requestText) 
  }
      
  return await getResponseByOnlineModel(requestText) 
}

export async function getResponseByOnlineModel(requestText: string) {
  const views = Zotero.PapersGPT.views as Views
  const apiKey = Zotero.Prefs.get(`${config.addonRef}.usingAPIKEY`)
  const temperature = Zotero.Prefs.get(`${config.addonRef}.temperature`)
  let apiURL = Zotero.Prefs.get(`${config.addonRef}.usingAPIURL`) as string
  const model = Zotero.Prefs.get(`${config.addonRef}.usingModel`)
  views.messages.push({
    role: "user",
    content: requestText
  })
  const deltaTime = Zotero.Prefs.get(`${config.addonRef}.deltaTime`) as number
  // Store the last results
  let _textArr: string[] = []
  // Changes in real time as requests return
  let textArr: string[] = []
  // Activate output
  views.stopAlloutput()
  views.setText("")
  let responseText: string | undefined
  const id: number = window.setInterval(async () => {
    if (!responseText && _textArr.length == textArr.length) { return}
    _textArr = textArr.slice(0, _textArr.length + 1)
    let text = _textArr.join("")
    text.length > 0 && views.setText(text)
    if (responseText && responseText == text) {
      views.setText(text, true)
      window.clearInterval(id)
    }
  }, deltaTime)
  views._ids.push({
    type: "output",
    id: id
  })
  const chatNumber = Zotero.Prefs.get(`${config.addonRef}.chatNumber`) as number
  
  const curPublisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`)

  if (curPublisher == "OpenAI" || curPublisher == "Customized") {
    try {
      await Zotero.HTTP.request(
	"POST",
        apiURL,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: views.messages.slice(-chatNumber),
            stream: true,
            temperature: Number(temperature)
          }),
          responseType: "text",
          requestObserver: (xmlhttp: XMLHttpRequest) => {
            xmlhttp.onprogress = (e: any) => {
              try {
                textArr = e.target.response.match(/data: (.+)/g).filter((s: string) => s.indexOf("content") >= 0).map((s: string) => {
                  try {
                    return JSON.parse(s.replace("data: ", "")).choices[0].delta.content.replace(/\n+/g, "\n")
                  } catch {
                    return false
                  }
                }).filter(Boolean)
              } catch {
		// Changes in real time as requests return
                ztoolkit.log(e.target.response)
              }
              if (e.target.timeout) {
                e.target.timeout = 0;
              }
            };
          },
        }
      );
    } catch (error: any) {
      try {
        error = JSON.parse(error?.xmlhttp?.response).error
        textArr = [`# ${error.code}\n> ${apiURL}\n\n**${error.type}**\n${error.message}`]
        new ztoolkit.ProgressWindow(error.code, { closeOtherProgressWindows: true })
          .createLine({ text: error.message, type: "default" })
          .show()
      } catch {
        new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
          .createLine({ text: error.message, type: "default" })
          .show()
      }
    }
  } else if (curPublisher == "Gemini") {

    var deployedModel = model
    if (model.includes(":")) {
        let index = model.indexOf(":")
        deployedModel = model.substr(index + 1, model.length)  		   
    }

    const index = apiURL.lastIndexOf("/")
    apiURL = apiURL.substr(0, index)
    apiURL = apiURL + "/" + deployedModel + ":streamGenerateContent?alt=sse&key=" + apiKey
    var text = ""
    if (views.messages.slice(-1)[0].role == "user") {
      text = views.messages.slice(-1)[0].content 
    } else if (views.messages.slice(-2, -1)[0].role == "user") {
      text = views.messages.slice(-2, -1)[0].content 
    }
    var requestParameters = [{
      parts: [{
        text: text 
      }]
    }] 
    
    try {
      await Zotero.HTTP.request(
	"POST",
        apiURL,
        {
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: requestParameters,
          }),
          responseType: "text",
          requestObserver: (xmlhttp: XMLHttpRequest) => {
            xmlhttp.onprogress = (e: any) => {
              try {
                textArr = e.target.response.match(/data: (.+)/g).filter((s: string) => s.indexOf("content") >= 0).map((s: string) => {
                  try {
                    return JSON.parse(s.replace("data: ", "")).candidates[0].content.parts[0].text.replace(/\n+/g, "\n")
                  } catch {
                    return false
                  }
                }).filter(Boolean)
              } catch {
                // The error usually occurs when the token exceeds the limit
                ztoolkit.log(e.target.response)
              }
              if (e.target.timeout) {
                e.target.timeout = 0;
              }
            };
          },
        }
      );
    } catch (error: any) {
      try {
        error = JSON.parse(error?.xmlhttp?.response).error
        textArr = [`# ${error.code}\n> ${apiURL}\n\n**${error.type}**\n${error.message}`]
        new ztoolkit.ProgressWindow(error.code, { closeOtherProgressWindows: true })
          .createLine({ text: error.message, type: "default" })
          .show()
      } catch {
        new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
          .createLine({ text: error.message, type: "default" })
          .show()
      }
    }
  } else if (curPublisher == "Claude-3") {
    try {
      var deployedModel = model
      if (model.includes(":")) {
          let index = model.indexOf(":")
          deployedModel = model.substr(index + 1, model.length)
      }
      var re
      await Zotero.HTTP.request(
	"POST",
        apiURL,
        {
          headers: {
	    "x-api-key": `${apiKey}`,
	    "anthropic-version": "2023-06-01",
            "content-type": "application/json",
	    "anthropic-beta": "messages-2023-12-15"
          },
          body: JSON.stringify({
            model: deployedModel,
	    max_tokens: 2048,
	    messages: views.messages.slice(-chatNumber),
            stream: true,
          }),
          responseType: "text",
          requestObserver: (xmlhttp: XMLHttpRequest) => {
            xmlhttp.onprogress = (e: any) => {
              try {
                textArr = e.target.response.match(/data: (.+)/g).filter((s: string) => s.indexOf("content_block_delta") >= 0).map((s: string) => {
                  try {
                    return JSON.parse(s.replace("data: ", "")).delta.text.replace(/\n+/g, "\n")
                  } catch {
                    return false
                  }
                }).filter(Boolean)
              } catch {
                // The error usually occurs when the token exceeds the limit
                ztoolkit.log(e.target.response)
              }
              if (e.target.timeout) {
                e.target.timeout = 0;
              }
            };
          },
        }
      );
    } catch (error: any) {
      try {
        error = JSON.parse(error?.xmlhttp?.response).error
        textArr = [`# ${error.code}\n> ${apiURL}\n\n**${error.type}**\n${error.message}`]
        new ztoolkit.ProgressWindow(error.code, { closeOtherProgressWindows: true })
          .createLine({ text: error.message, type: "default" })
          .show()
      } catch {
        new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
          .createLine({ text: error.message, type: "default" })
          .show()
      }
    }
  } 
  
  responseText = textArr.join("")
  ztoolkit.log("responseText", responseText)
  views.messages.push({
    role: "assistant",
    content: responseText
  })
  return responseText
}

export async function getResponseByLocalLLM(requestText: string) {
  const publisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`) as string
  if (publisher != "Local LLM") {
      return
  } 
  const views = Zotero.PapersGPT.views as Views
  const temperature = Zotero.Prefs.get(`${config.addonRef}.temperature`)
  const apiURL = Zotero.Prefs.get(`${config.addonRef}.usingAPIURL`) as string
  const model = Zotero.Prefs.get(`${config.addonRef}.usingModel`) as string
  views.messages.push({
    role: "user",
    content: requestText
  })
  const deltaTime = Zotero.Prefs.get(`${config.addonRef}.deltaTime`) as number
  // Store the last results 
  let _textArr: string[] = []
  // Changes in real time as requests return
  let textArr: string[] = []
  // Activate output 
  views.stopAlloutput()
  views.setText("")
  let responseText: string | undefined
  const id: number = window.setInterval(async () => {
    if (!responseText && _textArr.length == textArr.length) { return}
    _textArr = textArr.slice(0, _textArr.length + 1)
    let text = _textArr.join("")
    text.length > 0 && views.setText(text)
    if (responseText && responseText == text) {
      views.setText(text, true)
      window.clearInterval(id)
    }
  }, deltaTime)
  views._ids.push({
    type: "output",
    id: id
  })
  const chatNumber = Zotero.Prefs.get(`${config.addonRef}.chatNumber`) as number
  var responseTimeout = 2000
  if (model == "QwQ-32B-Preview-IQ2" || model == "marco-o1") {
    responseTimeout = 10 * 60000
  }

  try {
    await Zotero.HTTP.request(
      "POST",
      apiURL,
      {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: views.messages.slice(-chatNumber),
          stream: true,
          temperature: Number(temperature)
        }),
        responseType: "text",
        requestObserver: (xmlhttp: XMLHttpRequest) => {
          xmlhttp.onprogress = (e: any) => {
            try {
              textArr = e.target.response.match(/data: (.+)/g).filter((s: string) => s.indexOf("content") >= 0).map((s: string) => {
                try {
                  return JSON.parse(s.replace("data: ", "")).choices[0].delta.content.replace(/\n+/g, "\n")
                } catch {
                  return false
                }
              }).filter(Boolean)
            } catch {
              // The error usually occurs when the token exceeds the limit
              ztoolkit.log(e.target.response)
	      Zotero.log(e.target.response)
            }
            if (e.target.timeout) {
              e.target.timeout = 0;
            }
          };
        },
	timeout: responseTimeout
      }
    );
  } catch (error: any) {
    try {
      error = JSON.parse(error?.xmlhttp?.response).error
      textArr = [`# ${error.code}\n> ${apiURL}\n\n**${error.type}**\n${error.message}`]
      new ztoolkit.ProgressWindow(error.code, { closeOtherProgressWindows: true })
        .createLine({ text: error.message, type: "default" })
        .show()
    } catch {
      new ztoolkit.ProgressWindow("Error", { closeOtherProgressWindows: true })
        .createLine({ text: error.message, type: "default" })
        .show()
    }
  }
  responseText = textArr.join("")
  views.messages.push({
    role: "assistant",
    content: responseText
  })
  return responseText
}


