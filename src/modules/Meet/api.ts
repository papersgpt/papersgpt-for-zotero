import {
  getClipboardText,
  getItemField,
  getPDFSelection,
  getRelatedText,
  getPDFAnnotations,
  getTranslatingLanguage
} from "./Zotero"

import {
  getEditorText,
  insertEditorText,
  replaceEditorText,
  follow,
  reFocus
} from "./BetterNotes"

import {
  getGPTResponse
} from "./integratellms"
import Views from "../views";

const Meet: {
  [key: string]: any;
  Global: {
    [key: string]: any;
    views: Views | undefined
  }
} = {
  /**
   * Open to users 
   * Example: Meet.Zotero.xxx()
   */
  Zotero: {
    /**
     * Returns the contents copied from the system clipboard 
     */
    getClipboardText,
    /**
     * Returns a field value of the selected entry. Multiple selections return a field value of the first selected item
     * @fieldName The received field name
     * Such as abstract, Meet.Zotero.getItemField("abstractNote")
     */
    getItemField, 

    getTranslatingLanguage,
    /**
     * Returns the text selected when reading PDF
     */
    getPDFSelection,
    /**
     * Return relevant paragraphs. If you select multiple items, return the 5 items most relevant to the question
     * If you are in PDF it will read the entire PDF and return the 5 paragraphs most relevant to the question
     * @queryText Receive a query string
     * Meet.Zotero.getItemField("What does the XXX mentioned in this article mean?")
     */
    getRelatedText,
    /**
     * Get PDF annotation content
     * @select Receives a boolean, whether to return the selected label
     * getPDFAnnotations(true) Return selected annotation
     * getPDFAnnotations() Returns all annotations by default
     */
    getPDFAnnotations,
  },
  /**
   * Partially open 
   * The following functions are only for main notes
   */
  BetterNotes: {
    getEditorText,
    insertEditorText,
    replaceEditorText,
    follow,
    reFocus
  },
  integratellms: {
    getGPTResponse
  },
  Global: {
    lock: undefined,
    input: undefined,
    views: undefined,
    popupWin: undefined,
    storage: undefined
  }
}

export default Meet
