import { config } from "../package.json";
import { getString, initLocale } from "./modules/locale";
import Views from "./modules/views";
import Utils from "./modules/utils";
import { createZToolkit } from "./ztoolkit"

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);
  initLocale();
  ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.ico`
  );

  Zotero.Prefs.set(`${config.addonRef}.supportedLLMs`, "")
  Zotero[config.addonInstance].views = new Views();
  Zotero[config.addonInstance].utils = new Utils();
  
  await Promise.all(
    Zotero.getMainWindows().map((win) => onMainWindowLoad(win)),
  );

  if (Zotero.isMac) {
      var filename = "ChatPDFLocal"
      const temp = Zotero.getTempDirectory();
      filename = PathUtils.join(temp.path.replace(temp.leafName, ""), `${filename}.dmg`);

      Zotero.Prefs.set(`${config.addonRef}.startLocalServer`, false)
      if (!await checkFileExist(filename)) {
          let url = "https://www.papersgpt.com/packages/ChatPDFLocal-Zotero.dmg"
          await downloadFile(url, filename)
      }

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
}


async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();
 
  Zotero[config.addonInstance].views.registerInToolbar()
  
  Zotero[config.addonInstance].views.registerInMenupopup()

  Zotero[config.addonInstance].views.registerWindowAppearance()

  //Guide.showGuideInMainWindowIfNeed(win);

  const callback = {
    notify: async (
      event: string,
      type: string,
      ids: number[] | string[],
      extraData: { [key: string]: any },
    ) => {
      onNotify(event, type, ids, extraData);
    },
  };

  var notifierID = Zotero.Notifier.registerObserver(callback, ["tab", "item", "file"]); 
}

async function onMainWindowUnload(win: Window): Promise<void> {
  //ztoolkit.unregisterAll();
  addon.data.ztoolkit.unregisterAll();
  Zotero.getMainWindow().document.querySelector("#papersgpt")?.remove();
}

export function sleep(time) {
    return new Promise((resolve) => window.setTimeout(resolve, time));
}

async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  if (extraData?.skipAutoSync) return 
   
  if (event === "select" && type === "tab") {
      await Zotero[config.addonInstance].views.registerInMenupopup()
    return
  }
}

export async function downloadFile(url, filename) {
    await Zotero.File.download(url, filename)
    var signFile = filename + ".done"
    var execCmd = [signFile];
    var exec = "/usr/bin/touch"
    try {
        await Zotero.Utilities.Internal.exec(exec, execCmd);
    } catch {
	Zotero.log("touch error")
    } 
}

export async function checkFileExist(filename) {
    return await IOUtils.exists(filename)
}

export async function startLocalLLMEngine(filename) {
    var execCmd = ['attach', filename];
    var exec = "/usr/bin/hdiutil"
    try {
        await Zotero.Utilities.Internal.exec(exec, execCmd);
    } catch {
	Zotero.log("hdiutil command error!")
    } 

    if (await checkFileExist("/Volumes/ChatPDFLocal/ChatPDFLocal.app")) {
        execCmd = ['/Volumes/ChatPDFLocal/ChatPDFLocal.app', '--args', 'appLaunchType', 'backend']
        exec = "/usr/bin/open"
        try { 
	    await Zotero.Utilities.Internal.exec(exec, execCmd);
	} catch {
	}
    }
}

export async function shutdownLocalLLMEngine() {
    var execArgs = ['-c', '/usr/bin/pgrep -af "ChatPDFLocal appLaunchType backend" | xargs kill -9']
    var execCmd = '/bin/bash'
     
    try { 
        await Zotero.Utilities.Internal.exec(execCmd, execArgs);
    } catch(error: any) {
	Zotero.log('kill error!!!!')
	Zotero.log(error)
    }
    
    execArgs = ['-9', 'chatpdflocal-llama-server']
    execCmd = "/usr/bin/killall"
    try {
        await Zotero.Utilities.Internal.exec(execCmd, execArgs);
    } catch {
    } 
    
    execArgs = ['-9', 'chatpdflocal-llama-server-x86']
    try { 
        await Zotero.Utilities.Internal.exec(execCmd, execArgs);
    } catch {
    }

    execArgs = ['-9', 'huggingface_download']
    try { 
        await Zotero.Utilities.Internal.exec(execCmd, execArgs);
    } catch {
    }

    execArgs = ['detach', '/Volumes/ChatPDFLocal'];
    execCmd = "/usr/bin/hdiutil"
    try { 
        await Zotero.Utilities.Internal.exec(execCmd, execArgs);
    } catch {
    }
}

function onShutdown(): void {
  if (Zotero.isMac) {
      Zotero.Prefs.set(`${config.addonRef}.startLocalServer`, false)

      shutdownLocalLLMEngine()

      // @ts-ignore
      const temp = Zotero.getTempDirectory();
      var filename = "ChatPDFLocal"

      filename = PathUtils.join(temp.path.replace(temp.leafName, ""), `${filename}.dmg`);

      var execCmd = [filename];
      var exec = "/bin/rm"
      try {
          Zotero.Utilities.Internal.exec(exec, execCmd);
      } catch {
      }
  
      var signFile = filename + ".done"
      execCmd = [signFile];
      try {
          Zotero.Utilities.Internal.exec(exec, execCmd);
      } catch {
      }
  } 
	
  ztoolkit.unregisterAll();

  addon.data.alive = false;
  delete Zotero[config.addonInstance];
  Zotero.Prefs.set(`${config.addonRef}.papersgptState`, "Offline")
}

export default {
  onStartup,
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
};
