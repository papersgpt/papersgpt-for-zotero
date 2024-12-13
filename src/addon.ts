//import { ZoteroToolkit } from "zotero-plugin-toolkit";
import { ColumnOptions } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import hooks from "./hooks";
import { createZToolkit } from "./ztoolkit"

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    //ztoolkit: ZoteroToolkit;
    ztoolkit: MyToolkit;
    locale?: {
      stringBundle: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: {};

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      //ztoolkit: new ZoteroToolkit(),
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
