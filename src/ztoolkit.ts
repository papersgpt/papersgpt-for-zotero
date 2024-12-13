import { config } from "../package.json";

export { createZToolkit };

function createZToolkit() {
  // const _ztoolkit = new ZoteroToolkit();
  /**
   * Alternatively, import toolkit modules you use to minify the plugin size.
   * You can add the modules under the `MyToolkit` class below and uncomment the following line.
   */
  const _ztoolkit = new MyToolkit();
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function initZToolkit(_ztoolkit: ReturnType<typeof createZToolkit>) {
  const env = __env__;
  _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  _ztoolkit.basicOptions.log.disableConsole = env === "production";
  _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development";
  _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development";
  _ztoolkit.basicOptions.debug.disableDebugBridgePassword =
    __env__ === "development";
  _ztoolkit.basicOptions.api.pluginID = config.addonID;
  _ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.ico`,
  );
}

import { BasicTool, UITool, ReaderTool, VirtualizedTableHelper, ProgressWindowHelper, ClipboardHelper, MenuManager, unregister, KeyboardManager } from "zotero-plugin-toolkit"


class MyToolkit extends BasicTool {

  UI: UITool;
  VirtualizedTable: typeof VirtualizedTableHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  Menu: MenuManager;
  //Guide: typeof GuideHelper;
  Shortcut: KeyboardManager;
  Reader: ReaderTool;
  Clipboard: typeof ClipboardHelper

  constructor() {
    super();
    this.UI = new UITool(this);
    this.VirtualizedTable = VirtualizedTableHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.Menu = new MenuManager(this);
    //this.Guide = GuideHelper;
    this.Shortcut = new KeyboardManager(this);
    this.Reader = new ReaderTool(this);
    this.Clipboard = ClipboardHelper 
  }

  unregisterAll() {
    unregister(this);
  }
}
