import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf, TFile, TFolder } from 'obsidian'

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
  mySetting: string
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default'
}

function isLinkFolder(folder: TFolder) {
  return folder.name == "@" || folder.name == "_links"
}

async function moveActiveFileLinksToInside() {
  const file = app.workspace.getActiveFile()
  if (file == null) {
    return
  }

  const targetFolderPath = file.parent.path + "/@"
  const cache = app.metadataCache.getFileCache(file)
  if (cache == null) {
    return
  }

  const sources: TFile[] = []
  for (const link of cache.links ?? []) {
    const linkFile = app.metadataCache.getFirstLinkpathDest(link.link, file.path)
    if (linkFile == null) {
      continue
    }

    if (isLinkFolder(linkFile.parent) && linkFile.parent.path != targetFolderPath) {
      sources.push(linkFile)
    }
  }

  if (sources.length > 0 && !file.parent.children.find(it => it.path == targetFolderPath)) {
    await file.vault.createFolder(targetFolderPath)
  }

  for (const source of sources) {
    const targetPath = targetFolderPath + "/" + source.name
    await app.fileManager.renameFile(source, targetPath)
  }
}

function fileExplorerCollapseActiveFile() {
  const leaf = app.workspace.getLeavesOfType('file-explorer').first()!
  const items = getExplorerItems(leaf)
  const activeFile = app.workspace.getActiveFile()
  const activeFolder = activeFile?.parent

  for (const item of items) {
    if (explorerItemIsFolder(item) && item.file === activeFolder) {
      item.setCollapsed?.(true)
    }
  }
}

function fileExplorerCollapseAll() {
  const leaf = app.workspace.getLeavesOfType('file-explorer').first()!
  const items = getExplorerItems(leaf)
  for (const item of items) {
    if (explorerItemIsFolder(item)) {
      item.setCollapsed?.(true)
    }
  }
}

interface FileExplorerItem {
  file: TFile | TFolder
  collapsed?: boolean
  setCollapsed?: (state: boolean) => void
}

function explorerItemIsFolder(item: FileExplorerItem): boolean {
  return (
    item.file instanceof TFolder &&
    item.file.path !== '/' &&
    item.collapsed !== undefined
  )
}

function getExplorerItems(leaf: WorkspaceLeaf): FileExplorerItem[] {
  return Object.values((leaf.view as any).fileItems) as FileExplorerItem[]
}

function copyActiveFileName() {
  const file = app.workspace.getActiveFile()
  if (!file) {
    return
  }

  navigator.clipboard.writeText(file.basename)
}

export default class MyPlugin extends Plugin {
  settings: MyPluginSettings

  async onload() {
    await this.loadSettings()

    // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
    const statusBarItemEl = this.addStatusBarItem()
    statusBarItemEl.setText('Status Bar Text')

    this.addCommand({
      id: 'file-explorer-collapse-all',
      name: 'File Explorer Collapse All',
      callback: fileExplorerCollapseAll
    })

    this.addCommand({
      id: 'file-explorer-collapse-active-file',
      name: 'File Explorer Collapse Active File',
      callback: fileExplorerCollapseActiveFile
    })

    this.addCommand({
      id: 'copy-active-file-name',
      name: 'Copy Active File Name',
      callback: copyActiveFileName
    })

    this.addCommand({
      id: 'move-active-file-links-to-inside',
      name: 'Move Active File Links To Inside',
      callback: moveActiveFileLinksToInside
    })


    // This adds a settings tab so the user can configure various aspects of the plugin
    this.addSettingTab(new SampleSettingTab(this.app, this))
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app)
  }

  onOpen() {
    const {contentEl} = this
    contentEl.setText('Woah!')
  }

  onClose() {
    const {contentEl} = this
    contentEl.empty()
  }
}

class SampleSettingTab extends PluginSettingTab {
  plugin: MyPlugin

  constructor(app: App, plugin: MyPlugin) {
    super(app, plugin)
    this.plugin = plugin
  }

  display(): void {
    const {containerEl} = this

    containerEl.empty()

    containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'})

    new Setting(containerEl)
      .setName('Setting #1')
      .setDesc('It\'s a secret')
      .addText(text => text
        .setPlaceholder('Enter your secret')
        .setValue(this.plugin.settings.mySetting)
        .onChange(async (value) => {
          console.log('Secret: ' + value)
          this.plugin.settings.mySetting = value
          await this.plugin.saveSettings()
        }))
  }
}
