import { config } from "../../package.json";


const help = `
### Quick Commands

\`/help\` Show all commands.
\`/clear\` Clear history conversation.
\`/report\` Run this and copy the output content to give feedback to the developer.
\`/secretKey sk-xxx\` Set GPT secret key. Generate it in https://platform.openai.com/account/api-keys.
\`/api https://api.openai.com\` Set API. 
\`/model gpt-4/gpt-3.5-turbo\` Set GPT model. For example, \`/model gpt-3.5-turbo\`.
\`/temperature 1.0\` Set GPT temperature. Controls the randomness and diversity of generated text, specified within a range of 0 to 1.
\`/chatNumber 3\` Set the number of saved historical conversations.
\`/relatedNumber 5\` Set the number of most relevant text. For example, the number of paragraphs referenced while using askPDF.
\`/deltaTime 100\` Control GPT smoothness (ms).
\`/width 32%\` Control GPT UI width (pct).
\`/tagsMore expand/scroll\` Set mode to display more tags.
\`/key default\` Restore the variable values above to their default values (if have).

### About UI

You can hold down \`Ctrl\` and scroll the mouse wheel to zoom the entire UI.
And when your mouse is in the output box, the size of any content in the output box will be adjusted.

### About Tag

You can \`long click\` on the tag below to see its internal pseudo-code.
You can type \`#xxx\` and press \`Enter\` to create a tag. And save it with \`Ctrl + S\`, during which you can execute it with \`Ctrl + R\`.
You can \`right-long-click\` a tag to delete it.

### About Output Text

You can \`double click\` on this text to copy GPT's answer.
You can \`long press\` me without releasing, then move me to a suitable position before releasing.

### About Input Text

You can exit me by pressing \`Esc\` above my head and wake me up by pressing \`Shift + /\` or \`Shift + ?\` in the Zotero main window.
You can type the question in my header, then press \`Enter\` to ask me.
You can press \`Ctrl + Enter\` to execute last executed command tag again.
You can press \`Shift + Enter\` to enter long text editing mode and press \`Ctrl + R\` to execute long text.
`
// This is OpenAI ChatGPT font style 
const fontFamily = `Söhne,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif,Helvetica Neue,Arial,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji`

function parseTag(text: string) {
  text = text.replace(/^\n/, "").replace(/\n$/, "")
  let tagString = text.match(/^#(.+)\n/) as any
  function randomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  let tag: Tag = {
    tag: config.addonName,
    color: randomColor(),
    position: 9,
    text: text,
    trigger: "",
  }
  if (tagString) {
    tagString = tagString[0]
    tag.tag = tagString.match(/^#([^\[\n]+)/)[1]
    // parse color 
    let color = tagString.match(/\[c(?:olor)?="?(#.+?)"?\]/)
    tag.color = color?.[1] || tag.color
    // parse position
    let position = tagString.match(/\[pos(?:ition)?="?(\d+?)"?\]/)
    tag.position = Number(position?.[1] || tag.position)
    // parse trigger keyword
    let trigger = tagString.match(/\[tr(?:igger)?="?(.+)"?\]/)
    tag.trigger = trigger?.[1] || tag.trigger
    tag.text = `#${tag.tag}[position=${tag.position}][color=${tag.color}][trigger=${tag.trigger}]` + "\n" + text.replace(/^#.+\n/, "")
  }
  return tag
}

let defaultChatPrompt: string = 
`
#Chat PDF[color=#0EA293][position=10][trigger=]
You are a helpful assistant. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information, write a comprehensive reply to the given query. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information.

Answer the question: $\{Meet.Global.input\}

Reply in ${Zotero.locale}
`


let defaultBuiltInPrompts: any = [
"Summary",
"Define the topic discussed in the provided context information",
"Provide a detailed overview of its origins, significant milestones, and key developments over time",
"Innovations",
"Criticisms, limitations, or challenges of the topic talking about in the paper",
"Potential future directions and developments"
]


/**
 * The default label here cannot be deleted, but the content inside can be changed, such as color position and internal prompt
 */
let defaultBuiltInTags: any = [
`
#Summary[color=#0EA293][position=10]
You are an academic research expert. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information of the research paper, produce a concise and clear summary that encapsulates the main findings, methodology, results, and implications of the study. Ensure that the summary is written in a manner that is accessible to a general audience while retaining the core insights and nuances of the original paper. Include key terms and concepts, and provide any necessary context or background information. The summary should serve as a standalone piece that gives readers a comprehensive understanding of the paper's significance without needing to read the entire document. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information.

Reply in ${Zotero.locale}
`,
`
#Topic[color=#F49D1A][position=11]
You are a research expert. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information of the research paper, define the topic of the paper clearly. Please provide a comprehensive definition that includes the core aspects of the topic, its boundaries, and the various perspectives from which it can be understood. Also, highlight any key terms or concepts that are essential to grasping the topic fully. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information.

Reply in ${Zotero.locale}
`,
`
#Background[color=#0EA293][position=12]
You are a research expert. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information of the research paper, understand the historical context of the topic talking about in the paper. Please provide a detailed overview of its origins, significant milestones, and key developments over time. Include any historical figures, events, or movements that have played a crucial role in shaping this topic. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information.

Reply in ${Zotero.locale}
`,
`
#Innovations[color=#159895][position=13]
You are a research expert. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information of the research paper, list the main contributions or innovations of this paper. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information

Reply in ${Zotero.locale}
`,
`
#Challenges[color=#F14D72][position=14]
You are a critical analysis expert. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information of the research paper, identify the challenges and criticisms. Please discuss any common criticisms, limitations, or challenges that researchers or practitioners face when dealing with this topic. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information

Reply in ${Zotero.locale}
`,
`
#Outlook[color=#F14D72][position=15]
You are a futurist expert. Context information is below.
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
Using the provided context information of the research paper, explore future directions and the potential. Please provide insights into where this field might be headed, including potential future developments and the impact they could have. Make sure to cite results using [number] notation after the reference. If the provided context information refer to multiple subjects with the same name, write separate answers for each subject. Use prior knowledge only if the given context didn't provide enough information

Reply in ${Zotero.locale}
`,
`
#Translate[color=#F14D72][position=16][trigger=/^translate/]
Translate these content to $\{Meet.Zotero.getTranslatingLanguage\}:
$\{
Meet.Zotero.getPDFSelection() ||
Meet.Global.views.messages[0].content
\}
`,
`
#Improve writing[color=#8e44ad][position=17][trigger=/^improve writing/]
Below is a paragraph from an academic paper. Polish the writing to meet the academic style, improve the spelling, grammar, clarity, concision and overall readability. When necessary, rewrite the whole sentence. Furthermore, list all modification and explain the reasons to do so in markdown table. Paragraph: "$\{
Meet.Global.views.messages[0].content
\}"
`,
]
defaultBuiltInTags = defaultBuiltInTags.map(parseTag)


export { help, fontFamily, defaultBuiltInTags, parseTag, defaultChatPrompt, defaultBuiltInPrompts  }
