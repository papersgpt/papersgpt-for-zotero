import { config } from "../../package.json";
import Meet from "./Meet/api"
import Utils from "./utils";
import { Document } from "langchain/document";
import { help, fontFamily, defaultTags, parseTag } from "./base"
import { getLocalModelDownloadProgress, setApiKey, getSupportedLLMs, ModelConfig, selectModel } from "./Meet/papersgpt";
import { checkFileExist, startLocalLLMEngine, shutdownLocalLLMEngine } from "../hooks";


const markdown = require("markdown-it")({
  breaks: true, // Convert line terminators \n to <br> tags
  xhtmlOut: true, // Use /> to close the tag, not >
  typographer: true,
  html: true,
});
const mathjax3 = require('markdown-it-mathjax3');
markdown.use(mathjax3);

export function sleep(time) {
    return new Promise((resolve) => window.setTimeout(resolve, time));
}

export default class Views {
  private id = "papersgpt-for-zotero";
  /**
   * OpenAI interface historical message records need to be exposed to the GPT response function
   */
  public messages: { role: "user" | "assistant"; content: string }[] = [];
  /**
   * Used to store historical execution input, and use the up and down arrow keys to quickly recall
   */
  private _history: { input: string; output: string }[] = []
  /**
   * Used to store the last executed tag and use Ctrl + Enter to quickly execute it again
   */
  private _tag: Tag | undefined;
  /**
   * Record the id of the current GPT output stream setInterval to prevent there is still output after termination, which needs to be exposed to the GPT response function
   */
  public _ids: {type: "follow"| "output", id: number}[] = []

  public publisher2models: Map<string, ModelConfig> = new Map() 
  public publishers: string[] = []

  public supportedLanguages: string[] = []

  /**
   * Whether in note-taking environment
   */
  public isInNote: boolean = true
  public container!: HTMLDivElement;
  private toolbarContainer!: HTMLDivElement; 
  private inputContainer!: HTMLDivElement;
  private outputContainer!: HTMLDivElement;
  private dotsContainer!: HTMLDivElement;
  private tagsContainer!: HTMLDivElement;
  private utils: Utils;
  constructor() {
    this.utils = new Utils()
    this.registerKey()
    this.addStyle()

    // @ts-ignore
    window.Meet = Meet
    Meet.Global.views = this
  }

  private addStyle() {
    ztoolkit.UI.appendElement({
      tag: "style",
      id: `${config.addonRef}-style`,
      namespace: "html",
      properties: {
        innerHTML: `
          @keyframes loading {
            0%, 100%
            {
              opacity: 0.25;
            }
            50%
            {
              opacity: 0.8;
            }
          }
          #${this.id} .three-dots:hover {
            opacity: 0.8 !important;
          }
          #${this.id} .three-dots.loading .dot:nth-child(1) {
            animation-delay: 0s;
          }
          #${this.id} .three-dots.loading .dot:nth-child(2) {
            animation-delay: 0.5s;
          }
          #${this.id} .three-dots.loading .dot:nth-child(3) {
            animation-delay: 1s;
          }
          #${this.id} .three-dots.loading .dot {
            animation: loading 1.5s ease-in-out infinite;
          }
          #${this.id} ::-moz-selection {
            background: rgba(89, 192, 188, .8); 
            color: #fff;
          }
          #output-container * {
            font-family: ${fontFamily} !important;
          }
          #output-container div p, #output-container div span {
            marigin: 0;
            padding: 0;
            text-align: justify;
          }
          .gpt-menu-box .menu-item:hover, .gpt-menu-box .menu-item.selected{
            background-color: rgba(89, 192, 188, .23) !important;
	  }
	  .popover.show {
	    display: block;
	  }
          #${this.id} .tag {
            position: relative;
            overflow: hidden;
          }
          #${this.id} .ripple {
            left: 0;
            top: 50%;
            position: absolute;
            background: #fff;
            transform: translate(-50%, -50%);
            pointer-events: none;
            border-radius: 50%;
            animation: ripple 1.5s linear;
          }
          @keyframes ripple {
            from {
              width: 0px;
              height: 0px;
              opacity: 0.5;
            }
            to {
              width: 500px;
              height: 500px;
              opacity: 0;
            }
          }
        `
      },
    }, document.documentElement);

    ztoolkit.UI.appendElement({
      tag: "link",
      id: `${config.addonRef}-link`,
      properties: {
        type: "text/css",
        rel: "stylesheet",
        href: `chrome://${config.addonRef}/content/md.css`
      }
    }, document.documentElement)
  }

  /**
   * Set answer area text
   * @param text 
   * @param isDone 
   */
  public setText(text: string, isDone: boolean = false, scrollToNewLine: boolean = true, isRecord: boolean = true,) {
    this.outputContainer.style.display = ""
    const outputDiv = this.outputContainer.querySelector(".markdown-body")! as HTMLDivElement
    outputDiv.setAttribute("pureText", text);
    outputDiv.classList.add("streaming");
    let ready = () => {
      if (outputDiv.innerHTML.trim() == "") {
        outputDiv.innerHTML = `<p></p>`
      }
    }
    ready()
    /**
     * Render based on differences, just to preserve cursor blinking
     */
    let md2html = () => {
      let result = markdown.render(text)
        // .replace(/<mjx-assistive-mml[^>]*>.*?<\/mjx-assistive-mml>/g, "")
      /**
       * Monitor differences and replace nodes or text
       * @param oldNode 
       * @param newNode 
       * @returns 
       */
      let diffRender = (oldNode: any, newNode: any) => {
        if (newNode.nodeName == "svg") {
          oldNode.parentNode.replaceChild(newNode, oldNode)
          return
        }
        if (oldNode.nodeName == "#text" && newNode.nodeName == "#text") { 
          oldNode.data = newNode.data
          return
        } else {
          if (
            oldNode.outerHTML == newNode.outerHTML &&
            oldNode.innerHTML == newNode.innerHTML
          ) {
            return
          }
        }
        // There are more old ones than new ones and need to be removed
        [...oldNode.childNodes].slice(newNode.childNodes.length).forEach((e: any)=>e.remove())
        for (let i = 0; i < newNode.childNodes.length; i++) {
          if (i < oldNode.childNodes.length) {
            if (oldNode.childNodes[i].tagName != newNode.childNodes[i].tagName) {
              if (oldNode.childNodes[i].tagName == "#text") {
                oldNode.childNodes[i].remove()
                oldNode.appendChild(newNode.childNodes[i])
              } else {
                oldNode.replaceChild(newNode.childNodes[i], oldNode.childNodes[i])
              }
              continue
            } else {
              diffRender(oldNode.childNodes[i], newNode.childNodes[i])
            }
          } else {
            oldNode.appendChild(newNode.childNodes[i])
          }
        }
      }
      // Plain text itself does not require MD rendering to prevent deformation due to inconsistent styles
      let _outputDiv = outputDiv.cloneNode(true) as HTMLDivElement
      try {
        _outputDiv.innerHTML = result
        if (outputDiv.childNodes.length == 0) {
          outputDiv.innerHTML = result
        } else {
          diffRender(outputDiv, _outputDiv)
        }
      } catch {
        outputDiv.innerText = result
      }
    }
    md2html()
    ready()
    // @ts-ignore
    scrollToNewLine && this.outputContainer.scrollBy(0, this.outputContainer.scrollTopMax)
    if (isDone) {
      // Any live preview errors at the end should disappear because of the following sentence
      outputDiv.innerHTML = markdown.render(text)
      if (isRecord) {
        this._history.push({ input: Meet.Global.input, output: text })
      }
      outputDiv.classList.remove("streaming")
      if (this.isInNote) {
        this.hide()
        // The following is written after completing the answer Better Notes. Two options for master notes
        Meet.BetterNotes.insertEditorText(outputDiv.innerHTML)
      }
    }
  }

  private addDragEvent(node: HTMLDivElement) {
    let posX: number, posY: number
    let currentX: number, currentY: number
    let isDragging: boolean = false

    function handleMouseDown(event: MouseEvent) {
      // If it is an input or textarea element, skip the drag logic
      if (
        event.target instanceof window.HTMLInputElement ||
        event.target instanceof window.HTMLTextAreaElement ||
        (event.target as HTMLDivElement).classList.contains("tag")
      ) {
        return
      }
      posX = node.offsetLeft - event.clientX
      posY = node.offsetTop - event.clientY
      isDragging = true
    }

    function handleMouseUp(event: MouseEvent) {
      isDragging = false
    }

    function handleMouseMove(event: MouseEvent) {
      if (isDragging) {
        currentX = event.clientX + posX
        currentY = event.clientY + posY
        node.style.left = currentX + "px"
        node.style.top = currentY + "px"
      }
    }

    // Add event listeners
    node.addEventListener("mousedown", handleMouseDown)
    node.addEventListener("mouseup", handleMouseUp)
    node.addEventListener("mousemove", handleMouseMove)
  }


  private bindUpDownKeys(inputNode: HTMLInputElement) {
    inputNode.addEventListener("keydown", (e) => {
      this._history = this._history.filter(i=>i.input)
      let currentIdx = this._history.map(i=>i.input).indexOf(this.inputContainer!.querySelector("input")!.value)
      currentIdx = currentIdx == -1 ? this._history.length : currentIdx
      if (e.key === "ArrowUp") {
        currentIdx--;
        if (currentIdx < 0) {
          currentIdx = 0;
        }
        inputNode.value = this._history[currentIdx].input || "";
        this.setText(this._history[currentIdx].output, true, false, false)
      } else if (e.key === "ArrowDown") {
        currentIdx++;
        if (currentIdx >= this._history.length) {
          currentIdx = this._history.length;
          inputNode.value = "";
          this.outputContainer.style.display = "none"
        } else {
          inputNode.value = this._history[currentIdx].input || "";
          this.setText(this._history[currentIdx].output, true, false, false)
        }
      }
      if (["ArrowDown", "ArrowUp"].indexOf(e.key) >= 0) {
        e.stopPropagation();
        e.preventDefault();
        inputNode.setSelectionRange(inputNode.value.length, inputNode.value.length);
      }
    });
  }

  /**
   * Bind ctrl+scroll wheel to zoom in and out
   * @param div 
   */
  private bindCtrlScrollZoom(div: HTMLDivElement) {
      // Bind the wheel event to the specified div
    div.addEventListener('DOMMouseScroll', (event: any) => {
      // Check if the ctrl key is pressed
      if (event.ctrlKey || event.metaKey) {
        let _scale = div.style.transform.match(/scale\((.+)\)/)
        let scale = _scale ? parseFloat(_scale[1]) : 1
        let minScale = 0.5, maxScale = 2, step = 0.05
        if (div.style.bottom == "0px") {
          div.style.transformOrigin = "center bottom"
        } else {
          div.style.transformOrigin = "center center"
        }
        if (event.detail > 0) {
          // zoom out 
          scale = scale - step
          div.style.transform = `scale(${scale < minScale ? minScale : scale})`;
        } else {
          // zoom in
          scale = scale + step
          div.style.transform = `scale(${scale > maxScale ? maxScale : scale})`;
        }
      }
    })
  }

  /**
   * Bind the ctrl wheel to zoom in and out of all elements within the control
   * @param div
   */
  private bindCtrlScrollZoomOutput(div: HTMLDivElement) {
    const styleAttributes = {
      fontSize: 'font-size',
      lineHeight: 'line-height',
      marginBottom: 'margin-bottom',
      marginTop: 'margin-top',
      paddingBottom: 'padding-bottom',
      paddingTop: 'padding-top',
    } as const;
    type StyleAttributeKeys = keyof typeof styleAttributes;
    type StyleAttributes = {
      [K in StyleAttributeKeys]: string;
    };
    // Get the initial style of the child element
    const getChildStyles = (child: Element): StyleAttributes => {
      const style = window.getComputedStyle(child);
      const result: Partial<StyleAttributes> = {};
      for (const key in styleAttributes) {
        const typedKey = key as StyleAttributeKeys;
        result[typedKey] = style.getPropertyValue(styleAttributes[typedKey]);
      }
      return result as StyleAttributes;
    };
  
    // Update and apply styles to child elements
    const applyNewStyles = (child: HTMLElement, style: StyleAttributes, scale: number) => {
      const newStyle = (value: string) => parseFloat(value) * scale + 'px';
  
      for (const key in styleAttributes) {
        child.style && (child.style[key as StyleAttributeKeys] = newStyle(style[key as StyleAttributeKeys]))
      }
    };
    // Bind the wheel event to the specified div
    div.addEventListener('DOMMouseScroll', (event: any) => {
      const children = div.children[0].children;
      if (event.ctrlKey || event.metaKey) {
        const step = 0.05;
        event.preventDefault();
        event.stopPropagation();
        const scale = event.detail > 0 ? 1 - step : 1 + step;
        Array.from(children).forEach((child) => {
          const childElement = child as HTMLElement;
          const currentStyle = getChildStyles(child);
          applyNewStyles(childElement, currentStyle, scale);
        });
      }
    });
  }

  public createOrUpdateModelsContainer() {
      var curPublisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`) as string
      const toolbarContainer = this.toolbarContainer
      if (toolbarContainer == null) {
          Zotero.Prefs.set(`${config.addonRef}.startLocalServer`, false)
	  return 
      }
      const publishConfigContainer = toolbarContainer.querySelector(".publisher")!
      var publishSelectContainer = toolbarContainer.querySelector(".publisherSelect")!
      if (publishSelectContainer) {
	  publishSelectContainer.remove() 
      }

      const publishId = "publishid"
      publishSelectContainer = ztoolkit.UI.appendElement({
	  tag: "select",
	  id: publishId,
	  classList: ["publisherSelect"],
	  properties: {
	      value: "",
	  }
      }, publishConfigContainer) as HTMLSelectElement//HTMLDivElement

      var publisherSelectIdx = 0 
      for (var i = 0; i < this.publishers.length; i++) {
	  if (this.publishers[i] == curPublisher) {
	      publisherSelectIdx = i 
	  }	
	  var optionId = "option" + i 
	  const optionContainer = ztoolkit.UI.appendElement({
   	      tag: "option",
	      id: optionId,
	      properties: {
		  innerHTML: this.publishers[i],
		  value: this.publishers[i]
	      }
	  }, publishSelectContainer) as HTMLDivElement
      }
      publishSelectContainer.selectedIndex = publisherSelectIdx 

      publishSelectContainer.addEventListener("change", async event => {
	  event.stopPropagation();

	  curPublisher = publishSelectContainer.value
	  Zotero.Prefs.set(`${config.addonRef}.usingPublisher`, curPublisher)
	  var curPublisherElement = this.publisher2models.get(curPublisher)
	  if (curPublisherElement == null) return 
	  var curAPIKey: string = curPublisherElement.apiKey
	  var curAPIUrl: string = curPublisherElement.apiUrl
	  Zotero.Prefs.set(`${config.addonRef}.usingAPIKEY`, curAPIKey)
	  Zotero.Prefs.set(`${config.addonRef}.usingAPIURL`, curAPIUrl)

	  for (var i = 0; i < this.publishers.length; i++) {
	      if (this.publishers[i] == curPublisher) {
		  publishSelectContainer.selectedIndex = i
		  break 
	      }	  
	  }

	  curShowModels = curPublisherElement.models

          const modelConfigContainer = toolbarContainer.querySelector(".model")! as HTMLDivElement
	  
	  var modelNode = document.getElementById("modelSelect") as HTMLSelectElement 
	  if (modelNode != null) {
	      modelNode.innerHTML = ""
	  } else if (curPublisher != "Customized") {
		  var modelSelectDivContainer = toolbarContainer.querySelector(".modelSelectDivCSS")

		  if (modelSelectDivContainer != null) {
			  modelSelectDivContainer.remove() 
		  } 

		  var modelSelectDivId  = "modelSelectDiv"
		  modelSelectDivContainer = ztoolkit.UI.appendElement({
			  tag: "div",
			  id: modelSelectDivId,
			  classList: ["modelSelectDivCSS"],
			  styles: {
				  margin: "6px"
			  }
		  }, modelConfigContainer) as HTMLDivElement	


		  modelNode = toolbarContainer.querySelector(".modelSelect")!
		  if (modelNode) {
			  modelNode.remove()
		  }

		  var modelSelectId = "modelSelect"
		  modelNode = ztoolkit.UI.appendElement({
			  tag: "select",
			  id: modelSelectId,
			  classList: ["modelSelect"],
		  }, modelSelectDivContainer) as HTMLSelectElement // DivElement
	  } 

	  for (var i = 0; i < curShowModels.length; i++) {
	      var optionId = "optionModel" + i
	      var modelName = curShowModels[i]
	      if (modelName.includes(":")) {
	          let index = modelName.indexOf(":")
                  modelName = modelName.substr(0, index)  		   
	      }
	      const optionContainer = ztoolkit.UI.appendElement({
		  tag: "option",
		  id: optionId,
		  properties: {
	              innerHTML: modelName,
		      value: modelName 
		  }
	      }, modelNode) as HTMLDivElement
	  }
	  modelNode.selectedIndex = curPublisherElement.defaultModelIdx
	  var curModel = curShowModels[modelNode.selectedIndex]
	  Zotero.Prefs.set(`${config.addonRef}.usingModel`, curModel)

	  var apiUrlContainer = toolbarContainer.querySelector(".apiUrlDiv")
	  if (apiUrlContainer) {
	      apiUrlContainer.remove()  
	  }

	  var customModelDivContainer = toolbarContainer.querySelector(".customModelDiv")
          if (customModelDivContainer) {
	      customModelDivContainer.remove()  
	  }
	  
	  if (curPublisher == "Customized") {
	      var modelSelectDivContainer = toolbarContainer.querySelector(".modelSelectDivCSS")

	      if (modelSelectDivContainer != null) {
		  modelSelectDivContainer.remove() 
	      }

	      var apiUrlId  = "apiUrlDiv"
	      apiUrlContainer = ztoolkit.UI.appendElement({
	          tag: "div",
		  id: apiUrlId,
		  classList: [apiUrlId],
		  styles: {
		      margin: "6px",
		      fontSize: "12px",
                      borderRadius: "5px"
		  }
	      }, modelConfigContainer) as HTMLDivElement	

	      var apiId = "apiUrl"
	      var apitext = curPublisher + " API URL"
	      var apiUrlContainer: HTMLDivElement
	      if (curPublisherElement.apiUrl.length > 0) {
 	          apitext = curPublisherElement.apiUrl

		  apiUrlContainer = ztoolkit.UI.appendElement({
  		      tag: "input",
		      id: apiId,
		      styles: {
		          width: "150px"
		      },
		      properties: {
		          type: "text",
		          value: apitext
		      }
		  }, apiUrlContainer) as HTMLDivElement
	      } else {
		  apiUrlContainer = ztoolkit.UI.appendElement({
		      tag: "input",
		      id: apiId,
		      styles: {
			  width: "150px"
		      },
		      properties: {
			  type: "text",
			  placeholder: apitext
		      }
		  }, apiUrlContainer) as HTMLDivElement
	      }

	      apiUrlContainer.addEventListener("change", async event => {
		  if ((<HTMLInputElement>apiUrlContainer).value == null) return
	          const curPublisherElement = this.publisher2models.get(curPublisher)
		  if (curPublisherElement != null) {
		      curPublisherElement.apiUrl = (<HTMLInputElement>apiUrlContainer).value
		      Zotero.Prefs.set(`${config.addonRef}.customModelApiUrl`, (<HTMLInputElement>apiUrlContainer).value)
		      Zotero.Prefs.set(`${config.addonRef}.usingAPIURL`, (<HTMLInputElement>apiUrlContainer).value)
		  } 
	      })


              var customModelDivId  = "customModelDiv"
	      customModelDivContainer = ztoolkit.UI.appendElement({
	          tag: "div",
		  id: customModelDivId,
		  classList: [customModelDivId],
		  styles: {
		      margin: "6px",
		      fontSize: "12px",
                      borderRadius: "5px"
		  }
	      }, modelConfigContainer) as HTMLDivElement	

	      var customModelId = "customModelId"
	      var customModelText = curPublisher + " Model Name"
	      var customModelContainer: HTMLDivElement
	      if (curPublisherElement.models.length > 0) {
 	          customModelText = curPublisherElement.models[0]

		  customModelContainer = ztoolkit.UI.appendElement({
  		      tag: "input",
		      id: customModelId,
		      styles: {
		          width: "150px"
		      },
		      properties: {
		          type: "text",
		          value: customModelText
		      }
		  }, customModelDivContainer) as HTMLDivElement
	      } else {
		  customModelContainer = ztoolkit.UI.appendElement({
		      tag: "input",
		      id: customModelId,
		      styles: {
			  width: "150px"
		      },
		      properties: {
			  type: "text",
			  placeholder: customModelText
		      }
		  }, customModelDivContainer) as HTMLDivElement
	      }

	      customModelContainer.addEventListener("change", async event => {
		  if ((<HTMLInputElement>customModelContainer).value == null) return
		  const curPublisherElement = this.publisher2models.get(curPublisher)
          	  if (curPublisherElement != null) {
		      if (curPublisherElement.models.length > 0) {
		          curPublisherElement.models[0] = (<HTMLInputElement>customModelContainer).value
		      } else {
		          curPublisherElement.models.push((<HTMLInputElement>customModelContainer).value)
		      }
		      Zotero.Prefs.set(`${config.addonRef}.customModelApiModel`, (<HTMLInputElement>customModelContainer).value)
		      Zotero.Prefs.set(`${config.addonRef}.usingModel`, (<HTMLInputElement>customModelContainer).value)
		  }
	      })
	  } 

	  var apiDivNode = document.getElementById("apidiv") 
	  if (curPublisher == "Local LLM") {
	      if (apiDivNode != null) {
		  apiDivNode.remove()
	      }

	      const progressContainer = toolbarContainer.querySelector(".progress")! as HTMLProgressElement
	      if (progressContainer != null) {
		  progressContainer.remove()  
	      }

	      var isModelReady = curPublisherElement.areModelsReady.get(curModel)
	     if (isModelReady)  {
	         var retValue = await selectModel(curPublisher, curModel)
	         if (!retValue) {
   	             Zotero.log("invoke selectModel error!")
	         }
	     } else {
		  var ret = await getLocalModelDownloadProgress(curModel)

		  var trycount = 0
		  while (ret < 0 || ret > 210) {
		      if (trycount >= 5) break
		      await sleep(1000) 
		      ret = await getLocalModelDownloadProgress(curModel)
		      trycount = trycount + 1
		  }

		  if (ret == 200) {
		      curPublisherElement.areModelsReady.set(curModel, true)
		  } else if (/*ret == -1 ||*/ (ret >= 0 && ret <= 100)) {
		      //if (ret == -1) ret = 0

		      const modelConfigContainer = toolbarContainer.querySelector(".model")! as HTMLDivElement

		      if (modelConfigContainer != null) {
			  const progressContainer = ztoolkit.UI.appendElement({
		       	      tag: "progress",
			      id: "progress",
			      classList: ["progress"],
			      properties: {
				  max: "100",
				  value: ret 
			      }
		          }, modelConfigContainer) as HTMLProgressElement


			  var timer: undefined | number;
			  const interval = async () =>{
		              var ret = await getLocalModelDownloadProgress(curModel)

			      var usingModel = Zotero.Prefs.get(`${config.addonRef}.usingModel`)
			      if (usingModel != curModel) {
                                  window.clearTimeout(timer)
			          return 
			      }

			      if (ret >= 0 && ret < 100) {
				  progressContainer.value = ret
				  timer = window.setTimeout(interval, 2000)
			      } else {
				  if (ret == 100 || ret == 200) {
			   	      var curPublisherElement = this.publisher2models.get(curPublisher)
				      if (curPublisherElement != null)  { 
					  curPublisherElement.areModelsReady.set(curModel, true)
				      }
				  }
				  progressContainer.remove() 
				  window.clearTimeout(timer)
			      }
			  }

			  window.setTimeout(interval, 2000)
		      }
		  }
	      }
	  } else {
	     if (apiDivNode != null) {
	         apiDivNode.remove() 
	     }

	     const progressContainer = toolbarContainer.querySelector(".progress")! as HTMLProgressElement
	     if (progressContainer != null) {
		 progressContainer.remove()  
	     }

             const modelConfigContainer = toolbarContainer.querySelector(".model")! as HTMLDivElement
	     var apiDivId  = "apidiv"
	     const apiDivContainer = ztoolkit.UI.appendElement({
	         tag: "div",
		 id: apiDivId,
		 classList: [apiDivId],
		 styles: {
		     margin: "6px",
	             fontSize: "12px",
                     borderRadius: "5px"
		 }
	     }, modelConfigContainer) as HTMLDivElement	

	     var apiId = "api"
	     var apitext = curPublisher + " API KEY"
	     var apiContainer: HTMLDivElement
	     if (curPublisherElement.apiKey.length > 0) {
 	         apitext = curPublisherElement.apiKey

		 apiContainer = ztoolkit.UI.appendElement({
  		     tag: "input",
		     id: apiId,
		     styles: {
		         width: "150px"
		     },
		     properties: {
		         type: "text",
		         value: apitext
		     }
		 }, apiDivContainer) as HTMLDivElement
	     } else {
		  apiContainer = ztoolkit.UI.appendElement({
		      tag: "input",
		      id: apiId,
		      styles: {
			  width: "150px"
		      },
		      properties: {
			  type: "text",
			  placeholder: apitext
		      }
		  }, apiDivContainer) as HTMLDivElement
	     }

	     apiContainer.addEventListener("change", async event => {
		 if ((<HTMLInputElement>apiContainer).value == null) return
		 const curPublisherElement = this.publisher2models.get(curPublisher)
		     if (curPublisherElement != null) { 
		         curPublisherElement.apiKey = (<HTMLInputElement>apiContainer).value
			 Zotero.Prefs.set(`${config.addonRef}.usingAPIKEY`, (<HTMLInputElement>apiContainer).value)
			 if (curPublisher == "OpenAI") {
			     Zotero.Prefs.set(`${config.addonRef}.openaiApiKey`, (<HTMLInputElement>apiContainer).value)
			 } else if (curPublisher == "Claude-3") {
			     Zotero.Prefs.set(`${config.addonRef}.claudeApiKey`, (<HTMLInputElement>apiContainer).value)
			 } else if (curPublisher == "Gemini") {
			     Zotero.Prefs.set(`${config.addonRef}.geminiApiKey`, (<HTMLInputElement>apiContainer).value)
			 } else if (curPublisher == "Customized") {
			     Zotero.Prefs.set(`${config.addonRef}.customModelApiKey`, (<HTMLInputElement>apiContainer).value)
			 }
			 //if (Zotero.isMac && curPublisher != "Customized") {
			 if (Zotero.isMac) {
			     const response = await setApiKey(curPublisher, (<HTMLInputElement>apiContainer).value)
			 }
		     }
	     })
	  }
	});


	const modelConfigContainer = toolbarContainer.querySelector(".model")! as HTMLDivElement

	var modelSelectDivContainer = toolbarContainer.querySelector(".modelSelectDivCSS")
  
	if (modelSelectDivContainer != null) {
	    modelSelectDivContainer.remove() 
	} 

	var modelSelectDivId  = "modelSelectDiv"
	modelSelectDivContainer = ztoolkit.UI.appendElement({
		  tag: "div",
		  id: modelSelectDivId,
		  classList: ["modelSelectDivCSS"],
		  styles: {
			  margin: "6px"
		  }
	}, modelConfigContainer) as HTMLDivElement	


	var modelSelectContainer = toolbarContainer.querySelector(".modelSelect")!
        if (modelSelectContainer) {
	    modelSelectContainer.remove()
        }

	var modelSelectId = "modelSelect"
	modelSelectContainer = ztoolkit.UI.appendElement({
		  tag: "select",
		  id: modelSelectId,
		  classList: ["modelSelect"],
	}, modelSelectDivContainer) as HTMLSelectElement // DivElement

	var curShowPublisher = this.publisher2models.get(curPublisher)
	if (curShowPublisher == null)   { return}
	var curShowModels = curShowPublisher.models

	for (var i = 0; i < curShowModels.length; i++) {
	    var optionId = "optionModel" + i

	    var modelName = curShowModels[i]
	    if (modelName.includes(":")) {
	        let index = modelName.indexOf(":")
                modelName = modelName.substr(0, index)  		   
	    }
	    const optionContainer = ztoolkit.UI.appendElement({
	        tag: "option",
	        id: optionId,
		properties: {
	    	    innerHTML: modelName,
		    value: modelName 
		}
	    }, modelSelectContainer) as HTMLDivElement
	}

        modelSelectContainer.selectedIndex = curShowPublisher.defaultModelIdx

	modelSelectContainer.addEventListener("change", async event => {
            var curModel = modelSelectContainer.value

	    for (var i = 0; i < curShowModels.length; i++) {
	       if (curModel == curShowModels[i] || (curPublisher == "Claude-3" && curShowModels[i].includes(curModel))) {
	           Zotero.Prefs.set(`${config.addonRef}.usingModel`, curShowModels[i])
		   modelSelectContainer.selectedIndex = i
		   var curPublisherElement = this.publisher2models.get(curPublisher)
		   if (curPublisherElement != null) {
		       curPublisherElement.defaultModelIdx = i
		   }
		   break	    
	       }	
	    }

	      if (curPublisher == "Local LLM") {
		      
		  const progressContainer = modelConfigContainer.querySelector(".progress")! as HTMLProgressElement
		  if (progressContainer != null) {
		      progressContainer.remove()  
		  }
		  var curPublisherElement = this.publisher2models.get(curPublisher)
		  var isModelReady = curPublisherElement.areModelsReady.get(curModel)
		  if (isModelReady)  {
		      var retValue = await selectModel(curPublisher, curModel)
		      if (!retValue) {
   		          Zotero.log("invoke selectModel error!")
		      }
		  } else if  (curPublisherElement != null 
		      && !isModelReady) {
		      var ret = await getLocalModelDownloadProgress(curModel)

		      var trycount = 0
		      while (ret < 0 || ret > 210) {
			 if (trycount >= 5) break
		         await sleep(1000) 
		         ret = await getLocalModelDownloadProgress(curModel)
			 trycount = trycount + 1
		      }
		       
		      if (ret == 200) {
		          curPublisherElement.areModelsReady.set(curModel, true)
		      } else if (ret >= 0 && ret <= 100) {

			  const progressContainer = ztoolkit.UI.appendElement({
			      tag: "progress",
			      id: "progress",
			      classList: ["progress"],
			      properties: {
			          max: "100",
				  value: ret 
			      }
			  }, modelConfigContainer) as HTMLProgressElement
			  var timer: undefined | number;
			  const interval = async () =>{
			      var ret = await getLocalModelDownloadProgress(curModel)

	                      var usingModel = Zotero.Prefs.get(`${config.addonRef}.usingModel`)
			      if (usingModel != curModel) {
                                  window.clearTimeout(timer)
			          return 
			      }
			      if (ret >= 0 && ret < 100) {
			          progressContainer.value = ret
				  timer = window.setTimeout(interval, 2000)
			      } else if (ret == 100 || ret == 200) {
			          var curPublisherElement = this.publisher2models.get(curPublisher)
				  if (curPublisherElement != null) { 
				      curPublisherElement.areModelsReady.set(curModel, true)
				  }
				  progressContainer.remove() 
				  window.clearTimeout(timer)
			      }
			  }

  		          window.setTimeout(interval, 2000)
		      }
	          }
	      }
	  });

	  var curPublisherConfig = this.publisher2models.get(curPublisher)
	  if (curPublisherConfig != null) { 
	      if (curPublisherConfig != null && curPublisherConfig.hasApiKey) {
		  var apiDivId  = "apidiv"

                  var apiDivContainer = toolbarContainer.querySelector(".apidiv")!
                  if (apiDivContainer) {
	              apiDivContainer.remove()
                  }

		  apiDivContainer = ztoolkit.UI.appendElement({
		      tag: "div",
		      id: apiDivId,
		      classList: [apiDivId], 
		      styles: {
			  margin: "6px",
			  fontSize: "12px",
                          borderRadius: "5px"
		      }
		  }, modelConfigContainer) as HTMLDivElement	

		  var apiId = "api"
		  var apitext = curPublisher + " API KEY"
		  if (curPublisherConfig.apiKey.length > 0) {
		      apitext = curPublisherConfig.apiKey
		  }

		  var apiContainer: HTMLDivElement
		  if (curPublisherConfig.apiKey.length > 0) {
		      apitext = curPublisherConfig.apiKey

		      apiContainer = ztoolkit.UI.appendElement({
			  tag: "input",
			  id: apiId,
			  styles: {
			      width: "150px",
			  },
			  properties: {
			      type: "text",
			      value: apitext
			  }
		      }, apiDivContainer) as HTMLDivElement

		  } else {
		      apiContainer = ztoolkit.UI.appendElement({
			  tag: "input",
			  id: apiId,
			  styles: {
			      width: "150px"
			  },
			  properties: {
			      type: "text",
			      placeholder: apitext
			  }
		      }, apiDivContainer) as HTMLDivElement
		  }

		  apiContainer.addEventListener("change", async event => {
		      var curPublisherElement =  this.publisher2models.get(curPublisher)
		      if (curPublisherElement != null) {
			  curPublisherElement.apiKey = (<HTMLInputElement>apiContainer).value
			  Zotero.Prefs.set(`${config.addonRef}.usingAPIKEY`, curPublisherElement.apiKey)

                          if (curPublisher == "OpenAI") {
			      Zotero.Prefs.set(`${config.addonRef}.openaiApiKey`, (<HTMLInputElement>apiContainer).value)
			  } else if (curPublisher == "Claude-3") {
			      Zotero.Prefs.set(`${config.addonRef}.claudeApiKey`, (<HTMLInputElement>apiContainer).value)
			  } else if (curPublisher == "Gemini") {
			      Zotero.Prefs.set(`${config.addonRef}.geminiApiKey`, (<HTMLInputElement>apiContainer).value)
			  } else if (curPublisher == "Customized") {
			     Zotero.Prefs.set(`${config.addonRef}.customModelApiKey`, (<HTMLInputElement>apiContainer).value)
			  }

			  if (Zotero.isMac) {
		  	    const response = await setApiKey(curPublisher, curPublisherElement.apiKey)
			  }
		      }
		  })
	      }
	  }
      }



  private buildContainer() {
    const container = ztoolkit.UI.createElement(document, "div", {
      id: this.id,
      styles: {
        display: "none",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        position: "fixed",
        width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
        // height: "4em",
        fontSize: "18px",
        borderRadius: "10px",
        backgroundColor: "#fff",
        boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
                    0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
                    0px 30px 90px rgba(0, 0, 0, 0.2)`,
        fontFamily: fontFamily,
	zIndex:1
      }
    })
    this.addDragEvent(container)
    this.bindCtrlScrollZoom(container)

    var curPublisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`) as string
    var curModel =  Zotero.Prefs.get(`${config.addonRef}.usingModel`) as string

    // toolbar
    const toolbarContainer = this.toolbarContainer = ztoolkit.UI.appendElement({
      tag: "div",
      id: "toolbar-container",
      styles: {
        borderBottom: "1px solid #f6f6f6",
        width: "100%",
        display: "flex",
        alignItems: "center",
      },

      children: [
        {
          tag: "div",
	  id: "publishers",
          classList: ["publisher"],
          styles: {
            margin: "6px",
	    float: "left"
          }
        },
        {
	  tag: "div",
	  id: "models",
          classList: ["model"],
          styles: {
            margin: "6px",
	    float: "left"
          }
        },

	{
	  tag: "div",
	  id: "registers",
          classList: ["register"],
          styles: {
            marginLeft: "30%",
	    float: "right",
	    color: "blue",
	    fontSize: "20px"
          },
		 
	  children: [
            {
              tag: "img",
	      id: "registerImg",
              classList: ["registerImg"],
              styles: {
		width: "20px",
		height: "20px",
		backgroundColor: "#fff",
	      },
	      properties: {
	          src: `chrome://${config.addonRef}/content/icons/subscribe.png`
	      }
           }
	  ]
	  
	}

      ]
    }, container) as HTMLDivElement

    //create
    this.createOrUpdateModelsContainer()
    
    const registerContainer = toolbarContainer.querySelector(".register")! as HTMLDivElement
    
    registerContainer.addEventListener("mouseup", async event => {
        window.alert = function(msg, container) {

	    const backgroundContainer = ztoolkit.UI.createElement(document, "div", {
	      id: "languagesBg",
	      styles: {
                display: "block",
		flexDirection: "column",
		justifyContent: "flex-start",
		alignItems: "center",
		position: "fixed",
	        width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		fontSize: "18px",
		borderRadius: "10px",
		backgroundColor: "#000",
		boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		0px 30px 90px rgba(0, 0, 0, 0.2)`,
		fontFamily: fontFamily,
		opacity: 0.6,
		zIndex:2, 
              },
            })

            const subscriberShowContainer = ztoolkit.UI.createElement(document, "div", {
	      id: "subscriber",
	      styles: {
                display: "none",
	        //flexDirection: "column",
	        //justifyContent: "center",
		//alignItems: "center",
		position: "fixed",
		width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		fontSize: "18px",
		borderRadius: "10px",
		backgroundColor: "#fff",
		boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		0px 30px 90px rgba(0, 0, 0, 0.2)`,
		fontFamily: fontFamily,
		zIndex:3, 
	      },
            })

            const subscriberCloseContainer = ztoolkit.UI.appendElement({
		tag: "div",
		id: "subscriberClose",
		styles: {
		  display: "flex",
		  flexDirection: "column",
		  justifyContent: "flex-start",
		  //justifyContent: "center",
		  alignItems: "start",
		  position: "fixed",
		  //width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		  fontSize: "15px",
		  borderRadius: "10px",
		  backgroundColor: "#fff",
		  boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		  0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		  0px 30px 90px rgba(0, 0, 0, 0.2)`,
		  fontFamily: fontFamily,
		  color: "#1e90ff",
		  cursor: "pointer",
		  zIndex:3, 
		  margin: "10px" 
		},
		properties: {
		  value: "",
		  innerHTML: "X" 
		}
	    }, subscriberShowContainer) as HTMLDivElement

            subscriberCloseContainer.addEventListener("click", async event => {
	         event.stopPropagation();
                 backgroundContainer.style.display = "none"
		 subscriberShowContainer.style.display = "none" 
            })


            const subscriberNoteContainer = ztoolkit.UI.appendElement({
		tag: "div",
		id: "subscriberNote",
		styles: {
		  display: "flex",
		  //flexDirection: "column",
	          justifyContent: "center",
		  position: "fixed",
		  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		  fontSize: "25px",
		  //borderRadius: "10px",
		  //backgroundColor: "#fff",
		  //boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		  //0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		  //0px 30px 90px rgba(0, 0, 0, 0.2)`,
		  fontFamily: fontFamily,
		  //color: "#1e90ff",
		  //cursor: "pointer",
		  zIndex:3, 
		  //margin: "10px" 
		},
		
		properties: {
		  value: "",
		  innerHTML: "Thank you for using PapersGPT!" 
		}
	    }, subscriberCloseContainer) as HTMLDivElement
	   
	    const grade = Zotero.Prefs.get(`${config.addonRef}.grade`) as string
	    const imgLink =  `chrome://${config.addonRef}/content/icons/` + grade + ".png"
            const subscriberGradeContainer = ztoolkit.UI.appendElement({
		tag: "img",
		id: "subscriberGrade",
		styles: {
		  display: "flex",
		  justifyContent: "center",
		  position: "fixed",
		  width: "64px",
		  height: "64px",
		  backgroundColor: "#fff",
		  margin: "50px"
		},
		
		properties: {
	          src: imgLink
		}
	    }, subscriberNoteContainer) as HTMLDivElement

            

	    const registerWrapContainer = ztoolkit.UI.createElement(document, "div", {
	      id: "registerWrap",
		  styles: {
                      display: "flex",
		      flexDirection: "column",
		      //justifyContent: "flex-start",
		      justifyContent: "center",
		      alignItems: "center",
		      position: "fixed",
		      width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		      fontSize: "18px",
		      borderRadius: "10px",
		      backgroundColor: "#fff",
		      boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		      0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		      0px 30px 90px rgba(0, 0, 0, 0.2)`,
		      fontFamily: fontFamily,
		      //cursor: "pointer",
		      //spacing: "20px", 
		      zIndex:3, 

	          },
            })

        
            const subscribeContainer = ztoolkit.UI.appendElement({
	        tag: "input", 
		id: "subscribeInput",
	        styles: {
			display: "flex",
			flexDirection: "column",
			//justifyContent: "flex-start",
			justifyContent: "center",
			alignItems: "center",
			position: "fixed",
			width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
			fontSize: "15px",
			borderRadius: "10px",
			backgroundColor: "#fff",
			boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
			0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
			0px 30px 90px rgba(0, 0, 0, 0.2)`,
			fontFamily: fontFamily,
			zIndex:3, 

		},
		properties: {
		    type: "text",
	            placeholder: "Email" 
		}
            }, registerWrapContainer) as HTMLDivElement

            const subscribeWarnNoteContainer = ztoolkit.UI.appendElement({
	        tag: "div", 
		id: "subscribeWarnNote",
	        styles: {
			display: "none",
			flexDirection: "column",
			//justifyContent: "flex-start",
			justifyContent: "center",
			alignItems: "center",
			position: "fixed",
			width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
			fontSize: "12px",
			color: "red",
			//borderRadius: "10px",
			//backgroundColor: "#fff",
			//boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
			//0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
			//0px 30px 90px rgba(0, 0, 0, 0.2)`,
			fontFamily: fontFamily,
			//cursor: "pointer",
			zIndex:3, 

		},
		properties: {
	            innerHTML: "" 
		}
            }, registerWrapContainer) as HTMLDivElement


	    const verifyWarnNoteContainer = ztoolkit.UI.appendElement({
	        tag: "div", 
		id: "verifyWarnNote",
	        styles: {
			display: "none",
			flexDirection: "column",
			//justifyContent: "flex-start",
			justifyContent: "center",
			alignItems: "center",
			position: "fixed",
			width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
			fontSize: "12px",
			color: "red",
			//borderRadius: "10px",
			//backgroundColor: "#fff",
			//boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
			//0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
			//0px 30px 90px rgba(0, 0, 0, 0.2)`,
			fontFamily: fontFamily,
			//cursor: "pointer",
			zIndex:3, 

		},
		properties: {
	            innerHTML: "" 
		}
            }, registerWrapContainer) as HTMLDivElement

            
	    const registerNoteContainer = ztoolkit.UI.appendElement({
		tag: "div",
		id: "registerNote",
		styles: {
		  display: "flex",
		  flexDirection: "column",
		  //justifyContent: "flex-start",
		  //justifyContent: "center",
		  //alignItems: "center",
		  position: "fixed",
		  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		  fontSize: "15px",
		  //borderRadius: "10px",
		  //backgroundColor: "#fff",
		  //boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		  //0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		  //0px 30px 90px rgba(0, 0, 0, 0.2)`,
		  fontFamily: fontFamily,
		  //color: "#1e90ff",
		  //cursor: "pointer",
		  zIndex:3, 
		  //margin: "20px" 
		},
		
		properties: {
		  value: "",
		  innerHTML: "Now subscribe for free to get the enhanced features:<br/> 1. For Mac users, chat with local SOTA LLMs(llama) without pay.<br/> 2. Access GPT-4o, Gemini and Claude in one client.<br/> 3. Secure for your data, All stored locally, not upload to the Cloud." 
		}
	     }, registerWrapContainer) as HTMLDivElement

	    const closeContainer = ztoolkit.UI.appendElement({
		tag: "div",
		id: "close",
		styles: {
		  display: "flex",
		  flexDirection: "column",
		  position: "fixed",
		  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
		  fontSize: "15px",
		  borderRadius: "10px",
		  backgroundColor: "#fff",
		  boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		  0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		  0px 30px 90px rgba(0, 0, 0, 0.2)`,
		  fontFamily: fontFamily,
		  color: "#1e90ff",
		  cursor: "pointer",
		  zIndex:3, 
		  margin: "20px" 
		},
		properties: {
		  value: "",
		  innerHTML: "X" 
		}
	     }, registerWrapContainer) as HTMLDivElement

             closeContainer.addEventListener("click", async event => {
	         event.stopPropagation();
                 backgroundContainer.style.display = "none"
		 registerWrapContainer.style.display = "none" 
             })

             const subscribeSubmitContainer = ztoolkit.UI.appendElement({
	       tag: "div",
	       id: "subscribeSubmit",
	       styles: {
	          display: "flex",
		  flexDirection: "column",
                  justifyContent: "center",
			alignItems: "center",
			position: "fixed",

		   backgroundColor: "#fff",
		   fontSize: "15px", 
		   boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
		   0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
		   0px 30px 90px rgba(0, 0, 0, 0.2)`,
		   borderRadius: "8px",
                   border: "1px solid #fff",
		   cursor: "pointer",
		   whiteSpace: "nowrap",
		   zIndex: 3
	       }, 
	       properties: {
	           innerHTML: "Subscribe" 
	       },
	       listeners: [
		 { 
	           type: "mousedown",
                   listener: (event: any) => {
		     subscribeSubmitContainer.style.backgroundColor = "#C0C0C0"; 
		   }
		 },
		 {
	           type: "mouseup",
		   listener: async (event: any) => {
		     event.stopPropagation();
		     var emailRegExp=/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
                     var ok = emailRegExp.test(subscribeContainer.value)
		 
		     var message = ""
		     let res
		     if (ok) {
		       subscribeContainer.style.border = ""
                       const url = `https://www.papersgpt.com/api/zoterosubscribe` 
		       try {
			 res = await Zotero.HTTP.request(
		             "POST",
			     url,
			     {
			         responseType: "json",
				 headers: {
				     "Content-Type": "application/json",
				 },
				 body: JSON.stringify({
				     email: subscribeContainer.value
				 }),
			     })
		       } catch (error: any) {
			     message = "Network error! Please check your network and try it again!"
		              
			     subscribeWarnNoteContainer.style.display = "flex"
			     subscribeWarnNoteContainer.innerHTML = message
		             subscribeContainer.style.border = "1px solid red"
		       }

		       if (res?.response) {
			 var code = res.response.status
			 if (code == 200) {
			     message = "Success! Please check license in email and activate!"
			     subscribeWarnNoteContainer.style.display = "flex"
			     subscribeWarnNoteContainer.innerHTML = message
			     subscribeWarnNoteContainer.style.color = "green" 
			     subscribeWarnNoteContainer.style.justifyContent = "flex-start" 
			 } else {
			     message = res.response.message 
			     subscribeWarnNoteContainer.style.display = "flex"
			     subscribeWarnNoteContainer.innerHTML = message
			     subscribeContainer.style.border = "1px solid red"
			 }
		       }
		     } else {
		       message = "Email not valid!"
		       subscribeContainer.style.border = "1px solid red"
		       subscribeWarnNoteContainer.style.display = "flex"
		       subscribeWarnNoteContainer.innerHTML = message 
		     }

		     subscribeSubmitContainer.style.backgroundColor = "#fff"; 
		   }
		 }
	       ]
	     }, registerWrapContainer) as HTMLSelectElement


		     const licenseContainer = ztoolkit.UI.appendElement({
			tag: "input", 
			id: "lcenseInput",
			styles: {
				display: "flex",
				flexDirection: "column",
				//justifyContent: "flex-start",
				justifyContent: "center",
				alignItems: "center",
				position: "fixed",
				width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
				fontSize: "15px",
				borderRadius: "10px",
				backgroundColor: "#fff",
				boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
				0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
				0px 30px 90px rgba(0, 0, 0, 0.2)`,
				fontFamily: fontFamily,
				//color: "#1e90ff",
				//cursor: "pointer",
				//spacing: "20px", 
				zIndex:3, 

			},
			properties: {
			    type: "text",
			    placeholder: "License" 
			}
		    }, registerWrapContainer) as HTMLDivElement

		    const verifyLicenseContainer = ztoolkit.UI.appendElement({
			tag: "div",
			id: "verifyLicense",
			styles: {
			  display: "flex",
			  flexDirection: "column",
			  justifyContent: "center",
			  alignItems: "center",
			  position: "fixed",
			  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
			  fontSize: "15px",
			  borderRadius: "8px",
			  backgroundColor: "#fff",
			  boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
			  0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
			  0px 30px 90px rgba(0, 0, 0, 0.2)`,
			  fontFamily: fontFamily,
			  cursor: "pointer",
			  zIndex:3, 
		        },
		        properties: {
		          value: "",
		          innerHTML: "Activate" 
		        },
                        listeners: [
		          { 
	                    type: "mousedown",
                            listener: (event: any) => {
		              verifyLicenseContainer.style.backgroundColor = "#C0C0C0"; 
		            }
		          },
		          {
	                    type: "mouseup",
		            listener: async (event: any) => {
		              event.stopPropagation();
		
			      let res
			      const url = `https://www.papersgpt.com/api/zoteroactivate`
			      try {
				      res = await Zotero.HTTP.request(
					      "POST",
					      url,
					      {
						      responseType: "json",
						      headers: {
							      "Content-Type": "application/json",
						      },
						      body: JSON.stringify({
							      email: subscribeContainer.value,
							      license: licenseContainer.value, 
						      }),
					      })
			      } catch (error: any) {
				      licenseContainer.style.border = "1px solid red"
				      verifyWarnNoteContainer.style.display = "flex"
				      verifyWarnNoteContainer.innerHTML = "Network error! Please check your network and try it again!"
			      }

			      if (res?.response) {
				      if (res.response.status && res.response.status == 200) {
					      const email =  subscribeContainer.value
					      const token = licenseContainer.value
					      Zotero.Prefs.set(`${config.addonRef}.email`, email) 	
					      Zotero.Prefs.set(`${config.addonRef}.token`, token) 	
					      Zotero.Prefs.set(`${config.addonRef}.isLicenseActivated`, true) 
					      Zotero.Prefs.set(`${config.addonRef}.grade`, res.response.grader) 	

                                
					      await Zotero[config.addonInstance].views.updatePublisherModels(email, token)
					      Zotero[config.addonInstance].views.createOrUpdateModelsContainer()


					      backgroundContainer.style.display = "none" 

					      registerWrapContainer.style.display = "none" 

					      return	    
				      } else {
					      licenseContainer.style.border = "1px solid red"
					      verifyWarnNoteContainer.style.display = "flex"
					      verifyWarnNoteContainer.innerHTML = res.response.message
					      return 
				      }
			      } 

			      verifyLicenseContainer.style.backgroundColor = "#fff"; 
			    }
			  }]
		    }, registerWrapContainer) as HTMLDivElement


	     var curShowContainer = registerWrapContainer
             var isActivated = Zotero.Prefs.get(`${config.addonRef}.isLicenseActivated`)
             if (isActivated) {
	       registerWrapContainer.style.display = "none"
	       subscriberShowContainer.style.display = "flex"
	       curShowContainer = subscriberShowContainer 
	     } 

	     document.documentElement.append(backgroundContainer)
             document.documentElement.append(subscriberShowContainer)
             document.documentElement.append(registerWrapContainer)

             backgroundContainer.style.display = "flex"
		      
	     backgroundContainer.style.height = "50%" 
	     backgroundContainer.style.width = container.style.width 

	     backgroundContainer.style.left = container.style.left 
	     backgroundContainer.style.top = container.style.top 


	     var x = -1
	     var y = -1
	     if (x + y < 0) {
	       const rect = document.documentElement.getBoundingClientRect()
	       //x = rect.width / 2 - registerWrapContainer.offsetWidth / 2;
	       x = rect.width / 2 - curShowContainer.offsetWidth / 2;
	       //y = rect.height / 2 - registerWrapContainer.offsetHeight / 2;
	       y = rect.height / 2 - curShowContainer.offsetHeight / 2;
	     }

	     // ensure container doesn't go off the right side of the screen
	     //if (x + registerWrapContainer.offsetWidth > window.innerWidth) {
	     if (x + curShowContainer.offsetWidth > window.innerWidth) {
	       //x = window.innerWidth - registerWrapContainer.offsetWidth
	       x = window.innerWidth - curShowContainer.offsetWidth
	     }

	     // ensure container doesn't go off the bottom of the screen
	     //if (y + registerWrapContainer.offsetHeight > window.innerHeight) {
	     if (y + curShowContainer.offsetHeight > window.innerHeight) {
	       //y = window.innerHeight - registerWrapContainer.offsetHeight
	       y = window.innerHeight - curShowContainer.offsetHeight
	     }

             // ensure container doesn't go off the left side of the screen
             if (x < 0) {
 	       x = 0
             }

		      // ensure container doesn't go off the top of the screen
		      if (y < 0) {
			      y = 0
		      }
		      // this.container.style.display = "flex"
		  

		      registerWrapContainer.style.left = `${x}px`
		      registerWrapContainer.style.top = `${y}px`
		      registerWrapContainer.style.height = "300px" 

	              subscriberShowContainer.style.left = `${x}px` 
	              subscriberShowContainer.style.top = `${y}px` 
	              subscriberShowContainer.style.height = "150px" 


		      closeContainer.style.left = `${x}px` 
		      closeContainer.style.top = `${y}px`
		      closeContainer.style.width = "6px" 
		      closeContainer.style.height = "6px"

		      subscriberCloseContainer.style.width = "6px" 
		      subscriberCloseContainer.style.height = "6px"

		       
		      registerNoteContainer.style.left = `${x + container.clientWidth * 0.1}px`
		      registerNoteContainer.style.top = `${y + 20}px`
		      registerNoteContainer.style.width = `${container.clientWidth * 0.85}px`
		      registerNoteContainer.style.height = "100px"
                       
		      subscribeContainer.style.left = `${x + container.clientWidth * 0.2}px`
		      subscribeContainer.style.top = `${y + 135}px`
		      subscribeContainer.style.width = `${container.clientWidth * 0.6}px` 
		      subscribeContainer.style.height = "32px"
	           
		      subscribeWarnNoteContainer.style.left = `${x + container.clientWidth * 0.2}px`
		      subscribeWarnNoteContainer.style.top = `${y + 172}px` 
		      subscribeWarnNoteContainer.style.width = `${container.clientWidth * 0.6}px` 
		      subscribeWarnNoteContainer.style.height = "28px" 


	              subscribeSubmitContainer.style.left = `${x + container.clientWidth * 0.8 + 15}px`
		      subscribeSubmitContainer.style.top = `${y + 134}px`
		      subscribeSubmitContainer.style.width = "68px" 
		      subscribeSubmitContainer.style.height = "39px"
	            
                      verifyLicenseContainer.style.left = `${x + container.clientWidth * 0.8 + 15}px` 
                      verifyLicenseContainer.style.top = `${y + 210}px` 
                      verifyLicenseContainer.style.width = "68px" 
                      verifyLicenseContainer.style.height = "39px" 



		      
		      
		      licenseContainer.style.left = `${x + container.clientWidth * 0.2}px`      
	              licenseContainer.style.top = 	`${y + 210}px`
	              licenseContainer.style.width = 	`${container.clientWidth * 0.6}px`      
	              licenseContainer.style.height = 	 "32px"     
	
		      verifyWarnNoteContainer.style.left = `${x + container.clientWidth * 0.2}px`
		      verifyWarnNoteContainer.style.top = `${y + 240}px` 
		      verifyWarnNoteContainer.style.width = `${container.clientWidth * 0.6}px` 
		      verifyWarnNoteContainer.style.height = "28px" 
	
	}
        window.alert('Subscribe', this.container!);
      })
           
    // input 
    const inputContainer = this.inputContainer = ztoolkit.UI.appendElement({
      tag: "div",
      id: "input-container",
      styles: {
        borderBottom: "1px solid #f6f6f6",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        flexDirection: "column",
        alignItems: "center",
      },
      children: [
        {
          tag: "input",
          styles: {
            width: "calc(100% - 1.5em)",
            height: "2.5em",
            borderRadius: "10px",
            border: "none",
            outline: "none",
            fontFamily: "Consolas",
            fontSize: ".8em",
          }
        },
        {
          tag: "textarea",
          styles: {
            display: "none",
            width: "calc(100% - 1.5em)",
            maxHeight: "20em",
            minHeight: "2em",
            borderRadius: "10px",
            border: "none",
            outline: "none",
            resize: "vertical",
            marginTop: "0.55em",
            fontFamily: "Consolas",
            fontSize: ".8em"

          }
        }
      ]
    }, container) as HTMLDivElement
    const inputNode = inputContainer.querySelector("input")!
    this.bindUpDownKeys(inputNode)
    const textareaNode = inputContainer.querySelector("textarea")!
    const that = this;
    let lastInputText = ""
    let inputListener = function (event: KeyboardEvent) {
      // @ts-ignore
      if(this.style.display == "none") { return }
      // @ts-ignore
      let text = Meet.Global.input = this.value
      if ((event.ctrlKey || event.metaKey) && ["s", "r"].indexOf(event.key) >= 0 && textareaNode.style.display != "none") {
        // must save，but not necessary to execute
        const tag = parseTag(text)
        if (tag) {
          // @ts-ignore
          this.value = tag.text
          let tags = that.getTags()
	  // If tags exist, maybe to update, removed from tags
          tags = tags.filter((_tag: Tag) => {
            return _tag.tag != tag.tag
          })
          tags.push(tag)
          that.setTags(tags)
          that.renderTags();
          if (event.key == "s") {
            new ztoolkit.ProgressWindow("Save Tag")
              .createLine({ text: tag.tag, type: "success" })
              .show()
            return
          }
          // Execute codes, and then save the tags
          if (event.key == "r") {
            return that.execTag(tag)
          }
        }
        // normal text
        else {
          if (event.key == "r") {
            // Long text is executed as an unsaved command label, You can write js in long text
            return that.execTag({tag: "Untitled", position: -1, color: "", trigger: "", text})
          }
        }
      }
      if (event.key == "Enter") { 
        ztoolkit.log(event)
        
        outputContainer.querySelector(".auxiliary")?.remove()

        if (event.ctrlKey || event.metaKey) {
          ztoolkit.log("Ctrl + Enter")
          let tag = that._tag || that.getTags()[0]
          return that.execTag(tag)
        }
        if (event.shiftKey) {
          if (inputNode.style.display != "none") {
            inputNode.style.display = "none"
            textareaNode.style.display = ""
            textareaNode.focus()
            textareaNode.value = text + "\n"
          }
          return
        }
        if (text.length != lastInputText.length) {
          lastInputText = text
          return
        }
        if (text.startsWith("#")) {
          if (inputNode.style.display != "none") {
            inputNode.style.display = "none"
            textareaNode.style.display = ""
            textareaNode.focus()
            const tags = that.getTags();
            const tag = tags.find((tag: any) => tag.text.startsWith(text.split("\n")[0]))
            if (tag) {
              textareaNode.value = tag.text
            } else {
              textareaNode.value = text + "\n"
            }
          }
        } else if (text.startsWith("/")) {
          that._history.push(text)
          that.stopAlloutput()
          text = text.slice(1)
          let [key, value] = text.split(" ")
          if (key == "clear") {
            that.messages = []
            // @ts-ignore
            this.value = ""
            that.setText("success", true, false)
          } else if (key == "help"){ 
            that.setText(help, true, false)
          } else if (key == "report") { 
            const secretKey = Zotero.Prefs.get(`${config.addonRef}.secretKey`) as string
            return that.setText(`\`api\` ${Zotero.Prefs.get(`${config.addonRef}.api`)}\n\`secretKey\` ${secretKey.slice(0, 3) + "..." + secretKey.slice(-4)}\n\`model\` ${Zotero.Prefs.get(`${config.addonRef}.model`)}\n\`temperature\` ${Zotero.Prefs.get(`${config.addonRef}.temperature`)}`, true, false)
          } else if (["secretKey", "model", "api", "temperature", "deltaTime", "width", "tagsMore", "chatNumber", "relatedNumber"].indexOf(key) >= 0) {  
            if (value?.length > 0) {
              if (value == "default") {
                Zotero.Prefs.clear(`${config.addonRef}.${key}`)
                value = Zotero.Prefs.get(`${config.addonRef}.${key}`)
                that.setText(`${key} = ${value}`, true, false)
                return 
              }
              switch (key) {
                case "deltaTime":
                case "relatedNumber":
                case "chatNumber":
                  Zotero.Prefs.set(`${config.addonRef}.${key}`, Number(value))
                  break;
                case "width":
                  ztoolkit.log("width", value.match(/^[\d\.]+%$/))
                  if (value.match(/^[\d\.]+%$/)) {
                    that.container.style.width = value
                    Zotero.Prefs.set(`${config.addonRef}.${key}`, value)
                    break;
                  } else {
                    ztoolkit.log("width Error")
                    return that.setText(`Invalid value, ${value}, please enter a percentage, for example \`32 %\`.`, true, false)
                  }
                case "tagsMore":
                  if (["scroll", "expand"].indexOf(value) >= 0) {
                    Zotero.Prefs.set(`${config.addonRef}.${key}`, value)
                    break;
                  } else {
                    ztoolkit.log("tagsMore Error")
                    return that.setText(`Invalid value, ${value}, please enter \`expand\` or \`scroll\`.`, true, false)
                  }
                default: 
                  Zotero.Prefs.set(`${config.addonRef}.${key}`, value)
                  break
              }
            } else {
              value = Zotero.Prefs.get(`${config.addonRef}.${key}`)
            }
            that.setText(`${key} = ${value}`, true, false)
            // @ts-ignore
            this.value = ""
          } else {
            that.setText(help, true, false)
            const mdbody = that.outputContainer.querySelector(".markdown-body") as HTMLDivElement
            mdbody.innerHTML = `<center><span style="color: #D14D72;font-weight:bold;font-size:20px;">Invalid Command, Please Read this.</span></center>` + mdbody.innerHTML
          }
        } else {
          that.execText(text)
          that._history.push(text)
        }
      } else if (event.key == "Escape") {
        outputContainer.style.display = "none"
        // Exit long article editing mode
        if (textareaNode.style.display != "none") {
          textareaNode.style.display = "none"
          inputNode.value = ""
          inputNode.style.display = ""
          inputNode.focus()
          return
        }
        if (inputNode.value.length) {
          inputNode.value = ""
          return
        }
        // 退出container
        that.hide()
        that.container!.remove()
        that.isInNote && Meet.BetterNotes.reFocus()
	if (Zotero.isMac) {
            var filename = "ChatPDFLocal"
            if (!(IOUtils.exists(filename))) {
                const temp = Zotero.getTempDirectory();
                filename = PathUtils.join(temp.path.replace(temp.leafName, ""), `${filename}.dmg`);
            } 
            shutdownLocalLLMEngine()
	    Zotero.Prefs.set(`${config.addonRef}.startLocalServer`, false)
	}	
      } else if (event.key == "/" && text == "/" && that.container.querySelector("input")?.style.display != "none") {
        const rect = that.container.querySelector("input")!.getBoundingClientRect()
        const commands = ["clear", "help", "report", "secretKey", "model", "api", "temperature", "chatNumber", "relatedNumber" , "deltaTime", "tagsMore", "width"]
        that.createMenuNode(
          { x: rect.left, y: rect.top + rect.height, width: 200, height: 350 / 12 * commands.length  },
          commands.map(name => {
            return {
              name,
              listener: () => {
                // @ts-ignore
                this.value = `/${name}`
              }
            }
          }), [2, 6, 8]
        )
      }
      lastInputText = text
    }
    inputNode.addEventListener("keyup", inputListener)
    textareaNode.addEventListener("keyup", inputListener)
    const outputContainer = this.outputContainer = ztoolkit.UI.appendElement({
      tag: "div",
      id: "output-container",
      styles: {
        width: "calc(100% - 1em)",
        backgroundColor: "rgba(89, 192, 188, .08)",
        color: "#374151",
        maxHeight: document.documentElement.getBoundingClientRect().height * .5 + "px",
        overflowY: "auto",
        overflowX: "hidden",
        padding: "0.25em 0.5em",
        display: "none",
        // resize: "vertical"
      },
      children: [
        {
          tag: "div", // Change this to 'div'
          classList: ["markdown-body"],
          styles: {
            fontSize: "0.8em",
            lineHeight: "2em",
            // margin: ".5em 0"
          },
          properties: {
            // Used to copy 
            pureText: ""
          }
        }
      ],
      listeners: [
        {
          /**
           * 双击是插件的输出，可能是插入笔记
           */
          type: "dblclick",
          listener: () => {
            // 无论后面发生什么错误，都确保先复制下来
            // 目前可能用户的Better Notes版本低，不支持API
            const text = outputContainer.querySelector("[pureText]")!.getAttribute("pureText") || ""
            new ztoolkit.Clipboard()
              .addText(text, "text/unicode")
              .copy()
            const div = outputContainer.cloneNode(true) as HTMLDivElement
            div.querySelector(".auxiliary")?.remove()
            const htmlString = div.innerHTML
            if (Zotero_Tabs.selectedIndex == 1 && Zotero.BetterNotes) {
              Meet.BetterNotes.insertEditorText(htmlString)
              this.hide()
              new ztoolkit.ProgressWindow(config.addonName)
                .createLine({ text: "Insert To Main Note", type: "success" })
                .show()
              return
            }
            if (Zotero_Tabs.selectedIndex > 0) {
              const parentID = Zotero.Items.get(
                Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)!.itemID as number
              ).parentID
              
              const editor = Zotero.Notes._editorInstances.find(
                (e) =>
                  e._item.parentID === parentID && !Components.utils.isDeadWrapper(e._iframeWindow)
              );
              ztoolkit.log(editor)
              // 笔记被打开，且打开笔记视图，才触发向当前条目笔记插入
              if (editor && document.querySelector("#zotero-tb-toggle-notes-pane.toggled")) {
                Meet.BetterNotes.insertEditorText(htmlString, editor)
                new ztoolkit.ProgressWindow(config.addonName)
                  .createLine({ text: "Insert To Note", type: "success" })
                  .show()
                return
              }
            }
            new ztoolkit.ProgressWindow(config.addonName)
              .createLine({ text: "Copy Plain Text", type: "success" })
              .show()
          }
        }
      ]
    }, container) as HTMLDivElement
    this.bindCtrlScrollZoomOutput(outputContainer)
    // command tag 
    const tagsMore = Zotero.Prefs.get(`${config.addonRef}.tagsMore`) as string
    const tagsContainer = this.tagsContainer = ztoolkit.UI.appendElement({
      tag: "div",
      classList: ["tags-container"],
      styles: {
        width: "calc(100% - .5em)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-start",
        alignItems: "center",
        margin: ".25em 0",
        flexWrap: tagsMore == "expand" ? "wrap" : "nowrap",
        overflow: "hidden",
        height: "1.7em"
      },
      listeners: [
        {
          type: "DOMMouseScroll",
          listener: (event: any) => {
            if (tagsMore == "expand") { return }
            const scrollSpeed = 80
            // @ts-ignore
            if (event.detail > 0) {
              tagsContainer.scrollLeft += scrollSpeed
            } else {
              tagsContainer.scrollLeft -= scrollSpeed
            }
            event.preventDefault()
            event.stopPropagation()
          }
        }
      ]
    }, container) as HTMLDivElement
    this.dotsContainer = ztoolkit.UI.appendElement({
      tag: "div",
      classList: ["three-dots"],
      styles: {
        // width: "100%",
        display: "flex",
        height: "1em",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "0.25em",
        cursor: "pointer",
        opacity: ".5",
        transition: "opacity .25s linear"
      },
      children: (() => {
          let arr = []
          for (let i = 0; i < 3; i++) {
            arr.push({
              tag: "div",
              classList: ["dot"],
              styles: {
                width: "6px",
                height: "6px",
                margin: "0 .25em",
                backgroundColor: "#ff7675",
                borderRadius: "6px",
              },
            })
          }
          return arr
        })() as any,
      listeners: [
        {
          type: "click",
          listener: () => {
            if (tagsMore == "scroll") { return }
            tagsContainer.style.height = tagsContainer.style.height == "auto" ? "1.7em" : "auto"
          }
        }
      ]
    }, container) as HTMLDivElement
    document.documentElement.append(container)
    this.renderTags()
    // focus 
    window.setTimeout(() => {
      container.focus()
      inputContainer.focus()
      inputNode.focus()
    })
    return container
  }

  /**
   * Render tags, sorted according to position
   */
  private renderTags() {
    this.tagsContainer!?.querySelectorAll("div").forEach(e=>e.remove())
    let tags = this.getTags() as Tag[]
    tags.forEach((tag: Tag, index: number) => {
      this.addTag(tag, index)
    })
  }

  /**
   * add a tag 
   */
  private addTag(tag: Tag, index: number) {
    let [red, green, blue] = this.utils.getRGB(tag.color)
    let timer: undefined | number;
    let container = this.tagsContainer!
    ztoolkit.UI.appendElement({
      tag: "div",
      id: `tag-${index}`,
      classList: ["tag"],
      styles: {
        display: "inline-block",
        flexShrink: "0",
        fontSize: "0.8em",
        height: "1.5em",
        color: `rgba(${red}, ${green}, ${blue}, 1)`,
        backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.15)`,
        borderRadius: "1em",
        border: "1px solid #fff",
        margin: ".25em",
        padding: "0 .8em",
        cursor: "pointer",
        whiteSpace: "nowrap"
      },
      properties: {
        innerHTML: tag.tag
      },
      listeners: [
        {
          type: "mousedown",
          listener: (event: any) => {
            timer = window.setTimeout(() => {
              timer = undefined
              if (event.buttons == 1) {                
                // Enter edit mode 
                const textareaNode = this.inputContainer?.querySelector("textarea")!
                const inputNode = this.inputContainer?.querySelector("input")!
                inputNode.style.display = "none";
                textareaNode.style.display = ""
                textareaNode.value = tag.text
                this.outputContainer.style!.display = "none"
              } else if (event.buttons == 2) {
                let tags = this.getTags()
                tags = tags.filter((_tag: Tag) => _tag.tag != tag.tag)
                this.setTags(tags)
                this.renderTags();
              }
            }, 1000)
          }
        },
        {
          type: "mouseup",
          listener: async () => {
            if (timer) {
              window.clearTimeout(timer)
              timer = undefined
              this.outputContainer.querySelector(".auxiliary")?.remove()
	      var curLanguage = Zotero.Prefs.get(`${config.addonRef}.usingLanguage`) as string
	      if (tag.tag.includes("Translate") && curLanguage.length == 0) {
		  window.alert = function(msg, parentContainer) {
		       const backgroundContainer = ztoolkit.UI.createElement(document, "div", {
			      id: "languagesBg",
                               
			      styles: {
                                  display: "block",
				  flexDirection: "column",
				  justifyContent: "flex-start",
				  alignItems: "center",
				  position: "fixed",
				  //left: "0px",
				  //top: "0px",
				  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
				  fontSize: "18px",
				  borderRadius: "10px",
				  backgroundColor: "#000",
				  boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
				  0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
				  0px 30px 90px rgba(0, 0, 0, 0.2)`,
				  fontFamily: fontFamily,
				  opacity: 0.6,
				  zIndex:2, 
                              },
                      })

		      const allLanguagesContainer = ztoolkit.UI.createElement(document, "div", {
			      id: "allLanguages",
                               
			      styles: {
                                  display: "block",
				  flexDirection: "column",
				  //justifyContent: "flex-start",
				  justifyContent: "center",
				  alignItems: "center",
				  position: "fixed",
				  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
				  fontSize: "18px",
				  borderRadius: "10px",
				  backgroundColor: "#fff",
				  boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
				  0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
				  0px 30px 90px rgba(0, 0, 0, 0.2)`,
				  fontFamily: fontFamily,
				  //cursor: "pointer",
				  //spacing: "20px", 
				  zIndex:3, 
                                  
			      },
                      })


                      const languageContainer = ztoolkit.UI.appendElement({
			      tag: "div", 
			      id: "languages",
                               
			      styles: {
                                  display: "flex",
				  //flexDirection: "column",
				  //justifyContent: "flex-start",
				  justifyContent: "center",
				  alignItems: "center",
				  position: "fixed",
				  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
				  fontSize: "18px",
				  //borderRadius: "10px",
				  //backgroundColor: "#fff",
				  //boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
				  //0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
				  //0px 30px 90px rgba(0, 0, 0, 0.2)`,
				  fontFamily: fontFamily,
				  color: "red",
				  cursor: "pointer",
				  //spacing: "20px", 
				  zIndex:3, 
                                  
			      },
                              properties: {
			          innerHTML: msg 
			      }
                      }, allLanguagesContainer) as HTMLDivElement



		      const closeContainer = ztoolkit.UI.appendElement({
		          tag: "div",
		          id: "close",
			  styles: {
                                  display: "flex",
				  flexDirection: "column",
				  //justifyContent: "flex-start",
				  justifyContent: "center",
				  alignItems: "center",
				  position: "fixed",
				  width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
				  fontSize: "15px",
				  borderRadius: "10px",
				  backgroundColor: "#fff",
				  boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
				  0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
				  0px 30px 90px rgba(0, 0, 0, 0.2)`,
				  fontFamily: fontFamily,
				  color: "#1e90ff",
				  cursor: "pointer",
				  zIndex:3, 
			          margin: "20px" 
			      },
			  properties: {
			      value: "",
			      innerHTML: "X" 
			  }
	              }, allLanguagesContainer) as HTMLDivElement

		      closeContainer.addEventListener("click", async event => {
			      event.stopPropagation();
			      
                              backgroundContainer.style.display = "none"
			      allLanguagesContainer.style.display = "none" 

		      })




                      const languageSelectContainer = ztoolkit.UI.appendElement({
		          tag: "select",
		          id: "languagesSelect",
			  styles: {
			      margin: "20px" 
			  }, 
			  properties: {
			      value: "" 
			  }
	              }, languageContainer) as HTMLSelectElement//HTMLDivElement
                      


		      let languagesJson
		      try {
			      languagesJson = Zotero.Prefs.get(`${config.addonRef}.languages`) as string
		      } catch {}

		      var curLanguage = Zotero.Prefs.get(`${config.addonRef}.usingLanguage`) as string
		      var languageSelectIdx = 0
		      this.supportedLanguages = JSON.parse(languagesJson)
		      if (this.supportedLanguages.length == 0) {
			      const defaultLanguages = ["Arbic","Chinese", "English", "French", "German", "Hindi", "Italian", "Japanese", "Portuguese", "Russian", "Spanish"]
			      for (let defaultLanguage of defaultLanguages) {
				      this.supportedLanguages.push(defaultLanguage) 
			      }
		      }

		      var idx = 0	
		      for (let language of this.supportedLanguages) {
			      if (curLanguage == language) {
				      languageSelectIdx = idx + 1
				      break
			      }	   
			      idx = idx + 1 
		      }	

		      var optionId = "languageOption0"
		      const optionContainer = ztoolkit.UI.appendElement({
			      tag: "option",
			      id: optionId,
			      properties: {
				      innerHTML: "",
				      value: "" 
			      }
		      }, languageSelectContainer) as HTMLDivElement

		      for (var i = 0; i < this.supportedLanguages.length; i++) {
			      if (this.supportedLanguages[i] == curLanguage) {
				      languageSelectIdx = i + 1 
			      }	
			      var optionId = "languageOption" + (i + 1) 
			      const optionContainer = ztoolkit.UI.appendElement({
				      tag: "option",
				      id: optionId,
				      properties: {
					      innerHTML: this.supportedLanguages[i],
					      value: this.supportedLanguages[i]
				      }
			      }, languageSelectContainer) as HTMLDivElement
		      }
		      languageSelectContainer.selectedIndex = languageSelectIdx 

		      languageSelectContainer.addEventListener("change", async event => {
			      event.stopPropagation();
			      curLanguage = languageSelectContainer.value
			      Zotero.Prefs.set(`${config.addonRef}.usingLanguage`, curLanguage)

			      for (var i = 0; i < this.supportedLanguages.length; i++) {
				      if (this.supportedLanguages[i] == curLanguage) {
					      languageSelectContainer.selectedIndex = i + 1
					      break 
				      }	  
			      }

                              backgroundContainer.style.display = "none"
			      allLanguagesContainer.style.display = "none" 

		      })

 
		      
		  

                      document.documentElement.append(backgroundContainer)
                      document.documentElement.append(allLanguagesContainer)

		      backgroundContainer.style.display = "flex"
		      
                      //const rect = document.documentElement.getBoundingClientRect()
		      
		      backgroundContainer.style.height = "30%" 
		      backgroundContainer.style.width = parentContainer.style.width 
		      languageContainer.style.display = "flex"

		      backgroundContainer.style.left = parentContainer.style.left 
		      backgroundContainer.style.top = parentContainer.style.top 


		      var x = -1
		      var y = -1
		      if (x + y < 0) {
			      const rect = document.documentElement.getBoundingClientRect()
			      x = rect.width / 2 - languageContainer.offsetWidth / 2;
			      y = rect.height / 2 - languageContainer.offsetHeight / 2;
		      }

		      // ensure container doesn't go off the right side of the screen
		      if (x + languageContainer.offsetWidth > window.innerWidth) {
			      x = window.innerWidth - languageContainer.offsetWidth
		      }

		      // ensure container doesn't go off the bottom of the screen
		      if (y + languageContainer.offsetHeight > window.innerHeight) {
			      y = window.innerHeight - languageContainer.offsetHeight
		      }

		      // ensure container doesn't go off the left side of the screen
		      if (x < 0) {
			      x = 0
		      }

		      // ensure container doesn't go off the top of the screen
		      if (y < 0) {
			      y = 0
		      }
		      // this.container.style.display = "flex"
		      languageContainer.style.left = `${x}px`
		      languageContainer.style.top = `${y}px`
		  
		      //returnConfirmContainer.style.left = `${x + allLanguagesContainer.clientWidth/2}px`
		      //returnConfirmContainer.style.left = `${window.innerWidth - 10}px`
		      //returnConfirmContainer.style.top = `${y + allLanguagesContainer.clientHeight/2}px`
		      //returnConfirmContainer.style.width = "80px" 
		      //returnConfirmContainer.style.height = "40px" 


		      allLanguagesContainer.style.left = `${x}px`
		      allLanguagesContainer.style.top = `${y}px`
		      allLanguagesContainer.style.height = "80px" 

		      
		      const percent = Number(Zotero.Prefs.get(`${config.addonRef}.width`))
		      closeContainer.style.left = `${x}px` 
		      closeContainer.style.top = `${y + 6}px`//allLanguagesContainer.style.top 
		      closeContainer.style.width = "3px" 
		      closeContainer.style.height = "5px" 

		  }
		  window.alert('Please specify language first:', this.container);
		  
	      } else { 
                  await this.execTag(tag)
	      }
            }
          }
        }
      ]
    }, this.tagsContainer!) as HTMLDivElement

    if (tag.tag.includes("Translate")) {
      var curLanguage = Zotero.Prefs.get(`${config.addonRef}.usingLanguage`) as string
      if (curLanguage.length > 0)  {
        ztoolkit.UI.appendElement({
		tag: "div",
		id: `translateLanguageConfig`,
		styles: {
			display: "inline-block",
			flexShrink: "0",
			fontSize: "0.5em",
			height: "1.5em",
			//color: `rgba(${red}, ${green}, ${blue}, 1)`,
			backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.15)`,
			borderRadius: "1em",
			border: "1px solid #fff",
			margin: ".15em",
			padding: "0 .6em",
			cursor: "pointer",
			whiteSpace: "nowrap"
		},
		properties: {
			innerHTML: "..." 
		},
		listeners: [
			{
				type: "click",
				listener: async () => {
					var curLanguage = Zotero.Prefs.get(`${config.addonRef}.usingLanguage`) as string
					window.alert = function(msg, parentContainer) {
						const backgroundContainer = ztoolkit.UI.createElement(document, "div", {
							id: "languagesBg",

							styles: {
								display: "block",
								flexDirection: "column",
								justifyContent: "flex-start",
								alignItems: "center",
								position: "fixed",
								//left: "0px",
								//top: "0px",
								width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
								fontSize: "18px",
								borderRadius: "10px",
								backgroundColor: "#000",
								boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
								0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
								0px 30px 90px rgba(0, 0, 0, 0.2)`,
								fontFamily: fontFamily,
								opacity: 0.6,
								zIndex:2, 
							},
						})

						const allLanguagesContainer = ztoolkit.UI.createElement(document, "div", {
							id: "allLanguages",

							styles: {
								display: "block",
								flexDirection: "column",
								//justifyContent: "flex-start",
								justifyContent: "center",
								alignItems: "center",
								position: "fixed",
								width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
								fontSize: "18px",
								borderRadius: "10px",
								backgroundColor: "#fff",
								boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
								0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
								0px 30px 90px rgba(0, 0, 0, 0.2)`,
								fontFamily: fontFamily,
								//cursor: "pointer",
								//spacing: "20px", 
								zIndex:3, 

							},
						})


						const languageContainer = ztoolkit.UI.appendElement({
							tag: "div", 
							id: "languages",

							styles: {
								display: "flex",
								//flexDirection: "column",
								//justifyContent: "flex-start",
								justifyContent: "center",
								alignItems: "center",
								position: "fixed",
								width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
								fontSize: "18px",
								//borderRadius: "10px",
								//backgroundColor: "#fff",
								//boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
								//0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
								//0px 30px 90px rgba(0, 0, 0, 0.2)`,
								fontFamily: fontFamily,
								color: "red",
								cursor: "pointer",
								//spacing: "20px", 
								zIndex:3, 

							},
							properties: {
								innerHTML: msg 
							}
						}, allLanguagesContainer) as HTMLDivElement



						const closeContainer = ztoolkit.UI.appendElement({
							tag: "div",
							id: "close",
							styles: {
								display: "flex",
								flexDirection: "column",
								//justifyContent: "flex-start",
								justifyContent: "center",
								alignItems: "center",
								position: "fixed",
								width: Zotero.Prefs.get(`${config.addonRef}.width`) as string,
								fontSize: "15px",
								borderRadius: "10px",
								backgroundColor: "#fff",
								boxShadow: `0px 1.8px 7.3px rgba(0, 0, 0, 0.071),
								0px 6.3px 24.7px rgba(0, 0, 0, 0.112),
								0px 30px 90px rgba(0, 0, 0, 0.2)`,
								fontFamily: fontFamily,
								color: "#1e90ff",
								cursor: "pointer",
								zIndex:3, 
								margin: "20px" 
							},
							properties: {
								value: "",
								innerHTML: "X" 
							}
						}, allLanguagesContainer) as HTMLDivElement

						closeContainer.addEventListener("click", async event => {
							event.stopPropagation();

							backgroundContainer.style.display = "none"
							allLanguagesContainer.style.display = "none" 

						})



						const languageSelectContainer = ztoolkit.UI.appendElement({
							tag: "select",
							id: "languagesSelect",
							styles: {
								margin: "20px" 
							}, 
							properties: {
								value: "" 
							}
						}, languageContainer) as HTMLSelectElement//HTMLDivElement



						let languagesJson
						try {
							languagesJson = Zotero.Prefs.get(`${config.addonRef}.languages`) as string
						} catch {}

						var curLanguage = Zotero.Prefs.get(`${config.addonRef}.usingLanguage`) as string
						var languageSelectIdx = 0
						this.supportedLanguages = JSON.parse(languagesJson)
						if (this.supportedLanguages.length == 0) {
							const defaultLanguages = ["Arbic","Chinese", "English", "French", "German", "Hindi", "Italian", "Japanese", "Portuguese", "Russian", "Spanish"]
							for (let defaultLanguage of defaultLanguages) {
								this.supportedLanguages.push(defaultLanguage) 
							}
						}

						var idx = 0	
						for (let language of this.supportedLanguages) {
							if (curLanguage == language) {
								languageSelectIdx = idx + 1
								break
							}	   
							idx = idx + 1 
						}	

						var optionId = "languageOption0"
						const optionContainer = ztoolkit.UI.appendElement({
							tag: "option",
							id: optionId,
							properties: {
								innerHTML: "",
								value: "" 
							}
						}, languageSelectContainer) as HTMLDivElement

						for (var i = 0; i < this.supportedLanguages.length; i++) {
							if (this.supportedLanguages[i] == curLanguage) {
								languageSelectIdx = i + 1 
							}	
							var optionId = "languageOption" + (i + 1) 
							const optionContainer = ztoolkit.UI.appendElement({
								tag: "option",
								id: optionId,
								properties: {
									innerHTML: this.supportedLanguages[i],
									value: this.supportedLanguages[i]
								}
							}, languageSelectContainer) as HTMLDivElement
						}
						languageSelectContainer.selectedIndex = languageSelectIdx 

						languageSelectContainer.addEventListener("change", async event => {
							event.stopPropagation();
							curLanguage = languageSelectContainer.value
							Zotero.Prefs.set(`${config.addonRef}.usingLanguage`, curLanguage)

							for (var i = 0; i < this.supportedLanguages.length; i++) {
								if (this.supportedLanguages[i] == curLanguage) {
									languageSelectContainer.selectedIndex = i + 1
									break 
								}	  
							}

							backgroundContainer.style.display = "none"
							allLanguagesContainer.style.display = "none" 

						})


						document.documentElement.append(backgroundContainer)
						document.documentElement.append(allLanguagesContainer)

						backgroundContainer.style.display = "flex"

						backgroundContainer.style.height = "30%" 
						backgroundContainer.style.width = parentContainer.style.width 
						languageContainer.style.display = "flex"

						backgroundContainer.style.left = parentContainer.style.left 
						backgroundContainer.style.top = parentContainer.style.top 


						var x = -1
						var y = -1
						if (x + y < 0) {
							const rect = document.documentElement.getBoundingClientRect()
							x = rect.width / 2 - languageContainer.offsetWidth / 2;
							y = rect.height / 2 - languageContainer.offsetHeight / 2;
						}

						// ensure container doesn't go off the right side of the screen
						if (x + languageContainer.offsetWidth > window.innerWidth) {
							x = window.innerWidth - languageContainer.offsetWidth
						}

						// ensure container doesn't go off the bottom of the screen
						if (y + languageContainer.offsetHeight > window.innerHeight) {
							y = window.innerHeight - languageContainer.offsetHeight
						}

						// ensure container doesn't go off the left side of the screen
						if (x < 0) {
							x = 0
						}

						// ensure container doesn't go off the top of the screen
						if (y < 0) {
							y = 0
						}
						// this.container.style.display = "flex"
						languageContainer.style.left = `${x}px`
						languageContainer.style.top = `${y}px`

						//returnConfirmContainer.style.left = `${x + allLanguagesContainer.clientWidth/2}px`
						//returnConfirmContainer.style.left = `${window.innerWidth - 10}px`
						//returnConfirmContainer.style.top = `${y + allLanguagesContainer.clientHeight/2}px`
						//returnConfirmContainer.style.width = "80px" 
						//returnConfirmContainer.style.height = "40px" 


						allLanguagesContainer.style.left = `${x}px`
						allLanguagesContainer.style.top = `${y}px`
						allLanguagesContainer.style.height = "80px" 

						const percent = Number(Zotero.Prefs.get(`${config.addonRef}.width`))
						closeContainer.style.left = `${x}px` 
						closeContainer.style.top = `${y + 6}px`//allLanguagesContainer.style.top 
						closeContainer.style.width = "3px" 
						closeContainer.style.height = "5px" 

					}

					window.alert('Change translate language:', this.container);
				}
			   }
		]
	}, this.tagsContainer!) as HTMLDivElement
      }
    }

  }


  private rippleEffect(div: HTMLDivElement, color: string) {
    let [red, green, blue] = this.utils.getRGB(color)
    ztoolkit.UI.appendElement({
      tag: "div",
      styles: {
        backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.5)`
      },
      classList: ["ripple"]
    }, div)
  }
  /**
   * execute tag 
   */
  private async execTag(tag: Tag) {
    Meet.Global.input = this.inputContainer.querySelector("input")?.value as string
    this._tag = tag
    const popunWin = new ztoolkit.ProgressWindow(tag.tag, { closeOnClick: true, closeTime: -1, closeOtherProgressWindows: true })
      .show()

    Meet.Global.popupWin = popunWin
    popunWin
      .createLine({ text: "Generating input content...", type: "default" })
    this.dotsContainer?.classList.add("loading")
    this.outputContainer.style.display = "none"
    ztoolkit.log(tag, this.getTags())
    const tagIndex = this.getTags().map(JSON.stringify).indexOf(JSON.stringify(tag)) as number
    this.rippleEffect(
      this.container.querySelector(`#tag-${tagIndex}`)!,
      tag.color
    )
    const outputDiv = this.outputContainer.querySelector("div")!
    outputDiv.innerHTML = ""
    outputDiv.setAttribute("pureText", "");
    let text = tag.text.replace(/^#.+\n/, "")
    // new match version
    for (let rawString of text.match(/```j(?:ava)?s(?:cript)?\n([\s\S]+?)\n```/g)! || []) {
      let codeString = rawString.match(/```j(?:ava)?s(?:cript)?\n([\s\S]+?)\n```/)![1]
      try {
        text = text.replace(rawString, await window.eval(`${codeString}`))
      } catch { }
    }
    for (let rawString of text.match(/\$\{[\s\S]+?\}/g)! || []) {
      let codeString = rawString.match(/\$\{([\s\S]+?)\}/)![1]
      try {
        text = text.replace(rawString, await window.eval(`${codeString}`))
      } catch {  }
    }
    popunWin.createLine({ text: `Characters ${text.length}`, type: "success" })
    popunWin.createLine({ text: "Answering...", type: "default" })
    text = await Meet.integratellms.getGPTResponse(text) as string
    this.dotsContainer?.classList.remove("loading")
    if (text.trim().length) {
      try {
        window.eval(`
          setTimeout(async () => {
            ${text}
          })
        `)
        popunWin.createLine({ text: "Code is executed", type: "success" })
      } catch { }
      popunWin.createLine({ text: "Done", type: "success" })
    } else {
      popunWin.createLine({ text: "Done", type: "fail" })
    }
    popunWin.startCloseTimer(3000)
  }

  /**
   * Execute input box text
   * @param text 
   * @returns 
   */
  private async execText(text: string) {
    // If there is a preset keyword | regular expression for a certain tag in the text, it will be converted to execute the tag
    const tag = this.getTags()
      .filter((tag: Tag) => tag.trigger?.length > 0)
      .find((tag: Tag) => {
      const trigger = tag.trigger
      if (trigger.startsWith("/") && trigger.endsWith("/")) {
        return (window.eval(trigger) as RegExp).test(text)
      } else {
        return text.indexOf(trigger as string) >= 0
      }
    })
    if (tag) { return this.execTag(tag) }

    this.outputContainer.style.display = "none"
    const outputDiv = this.outputContainer.querySelector("div")!
    outputDiv.innerHTML = ""
    outputDiv.setAttribute("pureText", "");
    if (text.trim().length == 0) { return }
    this.dotsContainer?.classList.add("loading")
    await Meet.integratellms.getGPTResponse(text)
    this.dotsContainer?.classList.remove("loading")
  }

  /**
   * Get all saved tags from Zotero.Prefs
   * Return after sorting according to position order
   */
  private getTags() {
    let tagsJson
    try {
      tagsJson = Zotero.Prefs.get(`${config.addonRef}.tags`) as string
    } catch {}
    if (!tagsJson) {
      tagsJson = "[]"
      Zotero.Prefs.set(`${config.addonRef}.tags`, tagsJson)
    }
    let tags = JSON.parse(tagsJson)
    for (let defaultTag of defaultTags) {
      if (!tags.find((tag: Tag) => tag.tag == defaultTag.tag)) {
        tags.push(defaultTag)
      }
    }
    return (tags.length > 0 ? tags : defaultTags).sort((a: Tag, b: Tag) => a.position - b.position)
  }

  private setTags(tags: any[]) {
    Zotero.Prefs.set(`${config.addonRef}.tags`, JSON.stringify(tags))
  }

  public show(x: number = -1, y: number = -1, reBuild: boolean = true) {
    reBuild = reBuild || !this.container
    if (reBuild) {
      document.querySelectorAll(`#${this.id}`).forEach(e=>e.remove())
      this.container = this.buildContainer()
      this.container.style.display = "flex"
    }
    this.container.setAttribute("follow", "")
    if (x + y < 0) {
      const rect = document.documentElement.getBoundingClientRect()
      x = rect.width / 2 - this.container.offsetWidth / 2;
      y = rect.height / 2 - this.container.offsetHeight / 2;
    }

    // ensure container doesn't go off the right side of the screen
    if (x + this.container.offsetWidth > window.innerWidth) {
      x = window.innerWidth - this.container.offsetWidth
    }

    // ensure container doesn't go off the bottom of the screen
    if (y + this.container.offsetHeight > window.innerHeight) {
      y = window.innerHeight - this.container.offsetHeight
    }

    // ensure container doesn't go off the left side of the screen
    if (x < 0) {
      x = 0
    }

    // ensure container doesn't go off the top of the screen
    if (y < 0) {
      y = 0
    }
    // this.container.style.display = "flex"
    this.container.style.left = `${x}px`
    this.container.style.top = `${y}px`
    // reBuild && (this.container.style.display = "flex")
  }

  /**
   * Shutdown the ui and clear all the setIntervall
   */
  public hide() {
    this.container.style.display = "none"
    ztoolkit.log(this._ids)
    this._ids.map(id=>id.id).forEach(window.clearInterval)
  }

  public stopAlloutput() {
    this._ids.filter(id => id.type == "output").map(i => i.id).forEach(window.clearInterval)
  }

  /**
   * Enter auxiliary buttons on the output interface
   * This is a very extensible function
   * Help with positioning, such as locating entries, PDF comments, PDF paragraphs 
   */
  public insertAuxiliary(docs: Document[]) {
    this.outputContainer.querySelector(".auxiliary")?.remove()
    const auxDiv = ztoolkit.UI.appendElement({
      namespace: "html",
      classList: ["auxiliary"],
      tag: "div",
      styles: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    }, this.outputContainer)
    docs.forEach((doc: Document, index: number) => {
      ztoolkit.UI.appendElement({
        namespace: "html",
        tag: "a",
        styles: {
          margin: ".3em",
          fontSize: "0.8em",
          cursor: "pointer",
          borderRadius: "3px",
          backgroundColor: "rgba(89, 192, 188, .43)",
          width: "1.5em",
          height: "1.5em",
          textAlign: "center",
          color: "white",
          fontWeight: "bold"
        },
        properties: {
          innerText: index + 1
        },
        listeners: [
          {
            type: "click",
            listener: async () => {
              if (doc.metadata.type == "box") {
                const reader = await ztoolkit.Reader.getReader();
                (reader!._iframeWindow as any).wrappedJSObject.eval(`
                  PDFViewerApplication.pdfViewer.scrollPageIntoView({
                    pageNumber: ${doc.metadata.box.page + 1},
                    destArray: ${JSON.stringify([null, { name: "XYZ" }, doc.metadata.box.left, doc.metadata.box.top, 3.5])},
                    allowNegativeOffset: false,
                    ignoreDestinationZoom: false
                  })
                `)
              } else if (doc.metadata.type == "id") {
                await ZoteroPane.selectItem(doc.metadata.id as number)
              }
            }
          }
        ]
      }, auxDiv)
    })
  }

  public createMenuNode(
    rect: { x: number, y: number, width: number, height: number },
    items: { name: string, listener: Function }[],
    separators: number[]
  ) {
    document.querySelector(".gpt-menu-box")?.remove()
    const removeNode = () => {
      document.removeEventListener("mousedown", removeNode)
      document.removeEventListener("keydown", keyDownHandler)
      window.setTimeout(() => {
        menuNode.remove()
      }, 0)
      this.inputContainer.querySelector("input")?.focus()
    }
    document.addEventListener("mousedown", removeNode)
    let menuNode = ztoolkit.UI.appendElement({
      tag: "div",
      classList: ["gpt-menu-box"],
      styles: {
        position: "fixed",
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        display: "flex",
        height: `${rect.height}px`,
        justifyContent: "space-around",
        flexDirection: "column",
        padding: "6px",
        border: "1px solid #d4d4d4",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: `0px 1px 2px rgba(0, 0, 0, 0.028),
                                0px 3.4px 6.7px rgba(0, 0, 0, .042),
                                0px 15px 30px rgba(0, 0, 0, .07)`,
        overflow: "hidden",
        userSelect: "none",
      },
      children: (() => {
        let arr = [];
        for (let i = 0; i < items.length; i++) {
          arr.push({
            tag: "div",
            classList: ["menu-item"],
            styles: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 8px",
              cursor: "default",
              fontSize: "13px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
            },
            listeners: [
              {
                type: "mousedown",
                listener: async (event: any) => {
                  await items[i].listener()
                }
              },
              {
                type: "mouseenter",
                listener: function () {
                  nodes.forEach(e => e.classList.remove("selected"))
                  // @ts-ignore
                  this.classList.add("selected")
                  currentIndex = i
                }
              },
            ],
            children: [
              {
                tag: "div",
                classList: ["menu-item-name"],
                styles: {
                  paddingLeft: "0.5em",
                },
                properties: {
                  innerText: items[i].name
                }
              }
            ]
          })
          if (separators.indexOf(i) != -1) {
            arr.push({
              tag: "div",
              styles: {
                height: "0",
                margin: "6px -6px",
                borderTop: ".5px solid #e0e0e0",
                borderBottom: ".5px solid #e0e0e0",
              }
            })
          }

        }
        return arr
      })() as any
    }, document.documentElement)
    
    const winRect = document.documentElement.getBoundingClientRect()
    const nodeRect = menuNode.getBoundingClientRect()
    if (nodeRect.bottom > winRect.bottom) {
      menuNode.style.top = ""
      menuNode.style.bottom = "0px"
    }
    // menuNode.querySelector(".menu-item:first-child")?.classList.add("selected")
    const nodes = menuNode.querySelectorAll(".menu-item")
    nodes[0].classList.add("selected")
    let currentIndex = 0
    this.inputContainer.querySelector("input")?.blur()
    let keyDownHandler = (event: any) => {
      ztoolkit.log(event)
      if (event.code == "ArrowDown") {
        currentIndex += 1
        if (currentIndex >= nodes.length) {
          currentIndex = 0
        }
      } else if (event.code == "ArrowUp") {
        currentIndex -= 1
        if (currentIndex < 0) {
          currentIndex = nodes.length - 1
        }
      } else if (event.code == "Enter") {
        items[currentIndex].listener()
        
        removeNode()
      } else if (event.code == "Escape") {
        removeNode()
	if (Zotero.isMac) {
            var filename = "ChatPDFLocal"
            if (!(IOUtils.exists(filename))) {
                const temp = Zotero.getTempDirectory();
                filename = PathUtils.join(temp.path.replace(temp.leafName, ""), `${filename}.dmg`);
            } 
            shutdownLocalLLMEngine()
	    Zotero.Prefs.set(`${config.addonRef}.startLocalServer`, false)
	}	
      }
      nodes.forEach(e => e.classList.remove("selected"))
      nodes[currentIndex].classList.add("selected")
    }
    document.addEventListener("keydown", keyDownHandler)
    return menuNode
  }

  public async updatePublisherModels(email: string, token: string) {
    await getSupportedLLMs(this.publisher2models, this.publishers, email, token) 
  }

  


  /**
   * Bind shortcut key 
   */
  private registerKey() {
    const callback = async () => {
      this.publisher2models.clear()
      this.publishers = []

      this.isInNote = false
      const defaultModelApiKey = Zotero.Prefs.get(`${config.addonRef}.openaiApiKey`)
      let modelConfig: ModelConfig = {
	  models: ["gpt-3.5-turbo", "gpt-4"],
	  hasApiKey: true,
	  apiKey: defaultModelApiKey,
	  areModelsReady: new Map(),
	  defaultModelIdx: 0,
	  apiUrl: "https://api.openai.com/v1/chat/completions"
      }

      this.publisher2models.set("OpenAI", modelConfig)
      this.publishers.push("OpenAI")
      Zotero.Prefs.set(`${config.addonRef}.usingPublisher`, "OpenAI")
      Zotero.Prefs.set(`${config.addonRef}.usingModel`, "gpt-3.5-turbo")
      Zotero.Prefs.set(`${config.addonRef}.usingAPIURL`, "https://api.openai.com/v1/chat/completions")
      Zotero.Prefs.set(`${config.addonRef}.usingAPIKEY`, defaultModelApiKey)

      var email = Zotero.Prefs.get(`${config.addonRef}.email`) 
      var token =  Zotero.Prefs.get(`${config.addonRef}.token`) 
      if (Zotero.isMac) {
          var filename = "ChatPDFLocal"
	  const temp = Zotero.getTempDirectory();
          filename = PathUtils.join(temp.path.replace(temp.leafName, ""), `${filename}.dmg`);

	  if (await checkFileExist(filename + ".done")) {
	      var startLocalServer = Zotero.Prefs.get(`${config.addonRef}.startLocalServer`)
              if (!startLocalServer) {
		  await startLocalLLMEngine(filename)  
	   
		  Zotero.Prefs.set(`${config.addonRef}.startLocalServer`, true)
	          const execFunc = async() => {
		      var email = Zotero.Prefs.get(`${config.addonRef}.email`) 
                      var token =  Zotero.Prefs.get(`${config.addonRef}.token`)
		      await Zotero[config.addonInstance].views.updatePublisherModels(email, token)
                      Zotero[config.addonInstance].views.createOrUpdateModelsContainer()
                  }
                  window.setTimeout(execFunc, 3000)
	      }
	  } 
      } else {
	  var email = Zotero.Prefs.get(`${config.addonRef}.email`) 
          var token =  Zotero.Prefs.get(`${config.addonRef}.token`)
	  await Zotero[config.addonInstance].views.updatePublisherModels(email, token)
          Zotero[config.addonInstance].views.createOrUpdateModelsContainer()
      }
      
      if (Zotero_Tabs.selectedIndex == 0) {
        const div = document.querySelector("#item-tree-main-default .row.selected")!
        if (div) {
          const rect = div.getBoundingClientRect()
          this.show(rect.x, rect.y + rect.height)
        } else {
          this.show()
        }
      } else {
        const reader = await ztoolkit.Reader.getReader()
        const div = reader?._iframeWindow?.document.querySelector(".selection-popup")!
        if (div) {
          window.setTimeout(() => {
            this.messages = this.messages.concat(
              [
                {
                  role: "user",
                  content: `I am reading a PDF, and the following text is a part of the PDF. Please read it first, and I will ask you some question later: \n${Meet.Zotero.getPDFSelection()}`
                },
                {
                  role: "assistant",
                  content: "OK."
                }
              ]
            )
            const rect = div?.getBoundingClientRect()
            const windRect = document.documentElement.getBoundingClientRect()
            const ww = windRect.width *
              0.01 * Number((Zotero.Prefs.get(`${config.addonRef}.width`) as string).slice(0, -1))
            ww
            this.show(rect.left + rect.width * .5 - ww * .5, rect.bottom)
          }, 233)
        } else {
          this.show()
        }
      }
    }


    const key = "enter"
    if (Zotero.isMac) {
      const modifiers = "meta"
      //ztoolkit.Keyboard.register((ev, data) => {
      ztoolkit.Shortcut.register((ev, data) => {
        if (data.type === "keyup" && data.keyboard) {
          if (data.keyboard.equals(`${modifiers},${key}`)) {
            callback() 
          }
        }
      })
    } else {
      const modifiers = "control"
      //ztoolkit.Keyboard.register((ev, data) => {
      ztoolkit.Shortcut.register((ev, data) => {
        if (data.type === "keyup" && data.keyboard) {
          if (data.keyboard.equals(`${modifiers},${key}`)) {
            callback() 
          }
        }
      })
    }
    
    document.addEventListener(
      "keydown",
      async (event: any) => {
        if (
          Zotero_Tabs.selectedIndex == 1 &&
          event.explicitOriginalTarget.baseURI.indexOf("note-editor") >= 0 &&
          event.code == "Space" &&
          Zotero.BetterNotes.api.editor
        ) {
          this.isInNote = true
          const doc = event.explicitOriginalTarget.ownerDocument
          let selection = doc.getSelection()
          let range = selection.getRangeAt(0);
          const span = range.endContainer
          let text = await Meet.BetterNotes.getEditorText(span)
          ztoolkit.log(text)
          this.messages = [{
            role: "user",
            content: text
          }]
          if (/[\n ]+/.test(span.innerText)) {
            Meet.BetterNotes.follow(span)
            event.preventDefault();
          }
          return 
        }
        if (
          (event.shiftKey && event.key.toLowerCase() == "?") ||
          (event.key == "/" && Zotero.isMac)) {
          if (
            event.originalTarget.isContentEditable ||
            "value" in event.originalTarget
          ) {
            return;
          }
          
        }
      },
      true
    );
  }
}

