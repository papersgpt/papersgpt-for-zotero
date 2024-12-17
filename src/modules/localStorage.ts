import { config } from "../../package.json";

class LocalStorage {
  public filename!: string;
  public cache: any;
  public lock: any;
  constructor(filename: string) {
    this.lock = Zotero.Promise.defer()
    this.init(filename)
  }

  async init(filename: string) {
    const temp = Zotero.getTempDirectory();
    Zotero.log(temp)
    this.filename = PathUtils.join(temp.path.replace(temp.leafName, ""), `${filename}.json`);
    try {
      const rawString = await Zotero.File.getContentsAsync(this.filename) as string
      this.cache = JSON.parse(rawString)
    } catch {
      this.cache = {}
    }
    this.lock.resolve()
  }

  get(item: Zotero.Item | { key: string }, key: string) {
    if (this.cache == undefined) { return }
    return (this.cache[item.key] ??= {})[key]
  }

  async set(item: Zotero.Item | { key: string }, key: string, value: any) {
    await this.lock.promise;
    (this.cache[item.key] ??= {})[key] = value
    window.setTimeout(async () => {
      await Zotero.File.putContentsAsync(this.filename, JSON.stringify(this.cache));
    })
  }
}

export default LocalStorage

