import { config } from "../../../package.json";
import { MD5 } from "crypto-js"
import { Document } from "langchain/document";
import { similaritySearch } from "./integratellms";
import { search, isDocumentExist, addDoc } from "./papersgpt";
import Meet from "./api";
import ZoteroToolkit from "zotero-plugin-toolkit";

/**
 * Read clipboard
 * @returns string
 */
export function getClipboardText(): string {
  // @ts-ignore
  const clipboardService = window.Cc['@mozilla.org/widget/clipboard;1'].getService(Ci.nsIClipboard);
  // @ts-ignore
  const transferable = window.Cc['@mozilla.org/widget/transferable;1'].createInstance(Ci.nsITransferable);
  if (!transferable) {
    window.alert('Clipboard service error: Unable to create transportable instance');
  }
  transferable.addDataFlavor('text/unicode');
  clipboardService.getData(transferable, clipboardService.kGlobalClipboard);
  let clipboardData = {};
  let clipboardLength = {};
  try {
    transferable.getTransferData('text/unicode', clipboardData, clipboardLength);
  } catch (err: any) {
    window.console.error('Clipboard service acquisition failed:', err.message);
  }
  clipboardData = clipboardData.value.QueryInterface(Ci.nsISupportsString);
  return clipboardData.data
}

/**
 * Process selected items into full text
 * Note: The vector is not currently stored here because the entries are constantly being updated
 * @param key 
 * @returns 
 */
async function selectedItems2documents(key: string) {
  const docs = ZoteroPane.getSelectedItems().map((item: Zotero.Item) => {
    const text = JSON.stringify(item.toJSON());
    return new Document({
      pageContent: text.slice(0, 500),
      metadata: {
        type: "id",
        id: item.id,
        key
      }
    })
  })
  return docs
}

/**
 * @param items 
 * @returns 
 */
function mergeSameLine(items: PDFItem[]) {
  let toLine = (item: PDFItem) => {
    let line: PDFLine = {
      x: parseFloat(item.transform[4].toFixed(1)),
      y: parseFloat(item.transform[5].toFixed(1)),
      text: item.str || "",
      height: item.height,
      width: item.width,
      url: item?.url,
      _height: [item.height]
    }
    if (line.width < 0) {
      line.x += line.width
      line.width = -line.width
    }
    return line
  }

  let j = 0
  let lines: PDFLine[] = [toLine(items[j])]
  for (j = 1; j < items.length; j++) {
    let line = toLine(items[j])
    let lastLine = lines.slice(-1)[0]
    // Consider superscript and subscript
    if (
      line.y == lastLine.y ||
      (line.y >= lastLine.y && line.y < lastLine.y + lastLine.height) ||
      (line.y + line.height > lastLine.y && line.y + line.height <= lastLine.y + lastLine.height)
    ) {
      lastLine.text += (" " + line.text)
      lastLine.width += line.width
      lastLine.url = lastLine.url || line.url
      // Record all altitudes
      lastLine._height.push(line.height)
    } else {
      let hh = lastLine._height
      const num: any = {}
      for (let i = 0; i < hh.length; i++) {
        num[String(hh[i])] ??= 0
        num[String(hh[i])] += 1
      }
      lastLine.height = Number(
        Object.keys(num).sort((h1: string, h2: string) => {
          return num[h2] - num[h1]
        })[0]
      )
      lines.push(line)
    }
  }
  return lines
}

declare type Box = {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Determine whether two rectangles A and B intersect geometrically
 * @param A 
 * @param B 
 * @returns 
 */
function isIntersect(A: Box, B: Box): boolean {
  if (
    B.right < A.left ||
    B.left > A.right ||
    B.bottom > A.top ||
    B.top < A.bottom
  ) {
    return false
  } else {
    return true
  }
}

/**
 * Determine whether two rows are cross-page rows at the same position置行
 * @param lineA 
 * @param lineB 
 * @param maxWidth 
 * @param maxHeight 
 * @returns 
 */
function isIntersectLines(lineA: any, lineB: any, maxWidth: number, maxHeight: number) {
  let rectA = {
    left: lineA.x / maxWidth,
    right: (lineA.x + lineA.width) / maxWidth,
    bottom: lineA.y / maxHeight,
    top: (lineA.y + lineA.height) / maxHeight
  }
  let rectB = {
    left: lineB.x / maxWidth,
    right: (lineB.x + lineB.width) / maxWidth,
    bottom: lineB.y / maxHeight,
    top: (lineB.y + lineB.height) / maxHeight
  }
  return isIntersect(rectA, rectB)
}

/**
 * Read the full text of the PDF. Because the reading speed is generally faster, it is not stored.
 * Of course, dissertations, books, etc. are excluded
 * This function will stop reading when it encounters the reference keyword, because the reference too affects the final calculation of similarity.
 */
async function pdf2documents(itemkey: string) {
  const reader = await ztoolkit.Reader.getReader() as _ZoteroTypes.ReaderInstance
  const PDFViewerApplication = (reader._iframeWindow as any).wrappedJSObject.PDFViewerApplication;
  await PDFViewerApplication.pdfLoadingTask.promise;
  await PDFViewerApplication.pdfViewer.pagesPromise;
  let pages = PDFViewerApplication.pdfViewer._pages;
  let totalPageNum = pages.length
  // const popupWin = new ztoolkit.ProgressWindow("[Pending] PDF", { closeTime: -1 })
  //   .createLine({ text: `[1/${totalPageNum}] Reading`, progress: 1, type: "success" })
  //   .show()
  const popupWin = Meet.Global.popupWin.createLine({ text: `[1/${totalPageNum}] Reading PDF`, progress: 1, type: "success" })
    .show()
  // Read all lines of the page
  const pageLines: any = {}
  let docs: Document[] = []
  for (let pageNum = 0; pageNum < totalPageNum; pageNum++) {
    let pdfPage = pages[pageNum].pdfPage
    let textContent = await pdfPage.getTextContent()
    let items: PDFItem[] = textContent.items.filter((item: PDFItem) => item.str.trim().length)
    let lines = mergeSameLine(items)
    let index = lines.findIndex(line => /(r?eferences?|acknowledgements)$/i.test(line.text.trim()))
    if (index != -1) {
      lines = lines.slice(0, index)
    }
    pageLines[pageNum] = lines
    popupWin.changeLine({ idx: popupWin.lines.length - 1, text: `[${pageNum + 1}/${totalPageNum}] Reading PDF`, progress: (pageNum + 1) / totalPageNum * 100})
    if (index != -1 && pageNum / totalPageNum >= .9) {
      break
    }
  }

  popupWin.changeLine({ idx: popupWin.lines.length - 1, text: "Reading PDF", progress: 100 })
  popupWin.changeLine({ progress: 100 });
  totalPageNum = Object.keys(pageLines).length
  
  for (let pageNum1 = 0; pageNum1 < totalPageNum; pageNum1++) {
    let pdfPage = pages[pageNum1].pdfPage
    const maxWidth = pdfPage._pageInfo.view[2];
    const maxHeight = pdfPage._pageInfo.view[3];
    let lines = [...pageLines[pageNum1]]
    // Todo: Remove header and footer information, duplicate 
  

    // paragraph clustering
    // principle: Font size from large to small, merge; From small to big
    let abs = (x: number) => x > 0 ? x : -x
    const paragraphs = [[lines[0]]]
    for (let i = 1; i < lines.length; i++) {
      let lastLine = paragraphs.slice(-1)[0].slice(-1)[0]
      let currentLine = lines[i]
      let nextLine = lines[i + 1]
      const isNewParagraph =
        // Reach a certain row count threshold
        paragraphs.slice(-1)[0].length >= 5 && 
        (
          // There is text in a very large font on the current line
          currentLine._height.some((h2: number) => lastLine._height.every((h1: number) => h2 > h1)) ||
          // The abstract is automatically one paragraph
          /abstract/i.test(currentLine.text) ||
          // The distance from the previous line is too large
          abs(lastLine.y - currentLine.y) > currentLine.height * 2 ||
          // First line indented paragraph
          (currentLine.x > lastLine.x && nextLine && nextLine.x < currentLine.x)
        )
      // Open new paragraph 
      if (isNewParagraph) {
        paragraphs.push([currentLine])
      }
      // Otherwise, include it in the current paragraph
      else {
        paragraphs.slice(-1)[0].push(currentLine)
      }
    }
    ztoolkit.log(paragraphs)
    // Paragraph merge
    for (let i = 0; i < paragraphs.length; i++) {
      let box: { page: number, left: number; top: number; right: number; bottom: number }
      /**
       * All lines belong to a paragraph
       * Merge while calculating its bounds
       */
      let _pageText = ""
      let line, nextLine
      for (let j = 0; j < paragraphs[i].length; j++) {
        line = paragraphs[i][j]
        if (!line) { continue }
        nextLine = paragraphs[i]?.[j + 1]
        // Update boundaries 
        box ??= { page: pageNum1, left: line.x, right: line.x + line.width, top: line.y + line.height, bottom: line.y }
        if (line.x < box.left) {
          box.left = line.x
        }
        if (line.x + line.width > box.right) {
          box.right = line.x + line.width
        }
        if (line.y < box.bottom) {
          line.y = box.bottom
        }
        if (line.y + line.height > box.top) {
          box.top = line.y + line.height
        }
        _pageText += line.text
        if (
          nextLine &&
          line.height > nextLine.height
        ) {
          _pageText = "\n"
        } else if (j < paragraphs[i].length - 1) {
          if (!line.text.endsWith("-")) {
            _pageText += " "
          }
        }
      }
      _pageText = _pageText.replace(/\x20+/g, " ").replace(/^\x20*\n+/g, "").replace(/\x20*\n+/g, "");
      if (_pageText.length > 0) {
        docs.push(
          new Document({
            pageContent: _pageText,
            metadata: { type: "box", box: box!, key: itemkey },
          })
        )
      }
    }
  }
  // popupWin.changeHeadline("[Done] PDF")
  // popupWin.startCloseTimer(1000)
  return docs
}

/**
 * If you are currently in the main panel, generate text based on the selected item and find related - used to search for items
 * If you are in the PDF reading UI, read the original PDF text, search and return the corresponding paragraph - used to summarize the problem
 * @param queryText 
 * @returns 
 */
export async function getRelatedText(queryText: string) {
  const usingPublisher = Zotero.Prefs.get(`${config.addonRef}.usingPublisher`)
  if (usingPublisher != "Local LLM") {
    // @ts-ignore
    const cache = (window._GPTGlobal ??= {cache: []}).cache
    let docs: Document[], key: string
    switch (Zotero_Tabs.selectedIndex) {
      case 0:
        // Only when the same entry is selected again and the entry has not been updated will it be reused, otherwise the index will be created repeatedly
        key = MD5(ZoteroPane.getSelectedItems().map(i => i.key).join("")).toString()
        docs = cache[key] || await selectedItems2documents(key)
        break;
      default:
        let pdfItem = Zotero.Items.get(
          Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)!.itemID as number
        )
        key = pdfItem.key
        docs = cache[key] || await pdf2documents(key)
        break
    }
    cache[key] = docs
    docs = await similaritySearch(queryText, docs, { key }) as Document[]
    Zotero[config.addonInstance].views.insertAuxiliary(docs)
    return docs.map((doc: Document, index: number) => `[${index + 1}]${doc.pageContent}`).join("\n\n")
  } else {
    var docs: Document[], key: string
    let topn = 4
    var packFields: string
    switch (Zotero_Tabs.selectedIndex) {
      case 0:
        // Only when the same entry is selected again and the entry has not been updated will it be reused, otherwise the index will be created repeatedly
        key = MD5(ZoteroPane.getSelectedItems().map(i => i.key).join("")).toString()
        if (!isDocumentExist(key)) {
	  docs = await selectedItems2documents(key)
	  await addDoc(key, docs, "id")
	}

	packFields = "text-string:type-string:id-int"

        break;
      default:
        let pdfItem = Zotero.Items.get(
          Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)!.itemID as number
        )
        key = pdfItem.key
        let isKeyProcessed = await isDocumentExist(key)
	if (!isKeyProcessed) {
	  docs = await pdf2documents(key)
	  await addDoc(key, docs, "box")
	} 
	packFields = "text-string:type-string:box_page-int:box_left-float:box_right-float:box_bottom-float:box_top-float"

        break
    }
    const usingModel = Zotero.Prefs.get(`${config.addonRef}.usingModel`)
    var results = await search("Local LLM", usingModel, key, queryText, topn, "", packFields) 	


    Zotero[config.addonInstance].views.insertAuxiliary(results)
    return results.map((doc: Document, index: number) => `[${index + 1}]${doc.pageContent}`).join("\n\n")
  }

}

export function getTranslatingLanguage() {
  return Zotero.Prefs.get(`${config.addonRef}.usingLanguage`) as string
}

/**
 * Get a field of the selected item
 * @param fieldName 
 * @returns 
 */
export function getItemField(fieldName: any) {
  return ZoteroPane.getSelectedItems()[0].getField(fieldName)
}

/**
 * Get PDF page text
 * @returns 
 */
export function getPDFSelection() {
  try {
    return ztoolkit.Reader.getSelectedText(
      Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)
    );
  } catch {
    return ""
  }
}

export async function getPDFAnnotations(select: boolean = false) {
  let keys: string[]
  if (select) {
    // try {
      const reader = await ztoolkit.Reader.getReader() as _ZoteroTypes.ReaderInstance
      const nodes = reader._iframeWindow?.document.querySelectorAll("[id^=annotation-].selected") as any
      ztoolkit.log(nodes)
      keys = [...nodes].map(i => i.id.split("-")[1])
      ztoolkit.log(keys)
    // } catch {}
  }
  const pdfItem = Zotero.Items.get(
    Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)!.itemID as number
  )
  const docs: Document[] = [] 
  pdfItem.getAnnotations().forEach((anno: any) => {
    if (select && keys.indexOf(anno.key) == -1) { return }
    const pos = JSON.parse(anno.annotationPosition)
    const rect = pos.rects[0]
    docs.push(
      new Document({
        pageContent: anno.annotationText,
        metadata: {
          type: "box",
          box: { page: pos.pageIndex, left: rect[0], right: rect[2], top: rect[3], bottom: rect[1] },
          key: pdfItem.key
        }
      })
    )
  })
  Zotero[config.addonInstance].views.insertAuxiliary(docs)
  return docs.map((doc: Document, index: number) => `[${index + 1}]${doc.pageContent}`).join("\n\n")
}
