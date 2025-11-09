import { App, PluginSettingTab, Setting } from "obsidian";
import FloatingNotePlugin from "./main";

export class FloatingNoteSettingTab extends PluginSettingTab {
    plugin: FloatingNotePlugin;

    constructor(app: App, plugin: FloatingNotePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "SETTINGS" });
        containerEl.createEl("h3", { text: "Window Size" });

        new Setting(containerEl)
            .setName("Default width")
            .setDesc("Default width of floating windows in pixels")
            .addText(text => text
                .setPlaceholder("400")
                .setValue(String(this.plugin.settings.defaultWidth))
                .onChange(async (value) => {
                    const num = Number(value);
                    if (!isNaN(num) && num > 200) {
                        this.plugin.settings.defaultWidth = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName("Default height")
            .setDesc("Default height of floating windows in pixels")
            .addText(text => text
                .setPlaceholder("600")
                .setValue(String(this.plugin.settings.defaultHeight))
                .onChange(async (value) => {
                    const num = Number(value);
                    if (!isNaN(num) && num > 200) {
                        this.plugin.settings.defaultHeight = num;
                        await this.plugin.saveSettings();
                    }
                }));

        containerEl.createEl("h3", { text: "Window Position" });

        new Setting(containerEl)
            .setName("Default position")
            .setDesc("Where to place new floating windows")
            .addDropdown(dropdown => dropdown
                .addOption('center', 'Center')
                .addOption('top-right', 'Top Right')
                .addOption('top-left', 'Top Left')
                .addOption('bottom-right', 'Bottom Right')
                .addOption('bottom-left', 'Bottom Left')
                .setValue(this.plugin.settings.defaultPosition)
                .onChange(async (value) => {
                    this.plugin.settings.defaultPosition = value as any;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Remember position")
            .setDesc("Remember the last position and size for each note")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.rememberPosition)
                .onChange(async (value) => {
                    this.plugin.settings.rememberPosition = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl("h3", { text: "Window Appearance" });

        new Setting(containerEl)
            .setName("Window opacity")
            .setDesc("Default opacity level (0.3 = very transparent, 1.0 = fully opaque)")
            .addSlider(slider => slider
                .setLimits(0.3, 1.0, 0.05)
                .setValue(this.plugin.settings.defaultOpacity)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.defaultOpacity = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl("h3", { text: "Window Behavior" });

        new Setting(containerEl)
            .setName("Always on top")
            .setDesc("Keep floating windows above other applications")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.alwaysOnTop)
                .onChange(async (value) => {
                    this.plugin.settings.alwaysOnTop = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl("h3", { text: "Data Management" });

        const desc = containerEl.createEl('p');
        desc.setText('The plugin saves the last used position and size for each note when "Remember position" is enabled. If you delete or rename notes, these saved settings can become "stale". You can clean them up here.');
        
        new Setting(containerEl)
            .setName("Clean up saved positions")
            .setDesc("Remove saved positions for notes that no longer exist in your vault.")
            .addButton(button => button
                .setButtonText("Clean up")
                .onClick(async () => {
                    const count = this.plugin.cleanupStalePositions();
                }));
    }
}