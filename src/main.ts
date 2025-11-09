import {
    Plugin,
    TFile,
    WorkspaceLeaf,
    Menu
} from "obsidian";
import { FloatingNoteSettings, DEFAULT_SETTINGS } from "./types";
import { FloatingNoteSettingTab } from "./settings";

type Position = 'center' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export default class FloatingNotePlugin extends Plugin {
    settings: FloatingNoteSettings;
    private floatingLeaves: Set<WorkspaceLeaf> = new Set();

    async onload() {
        await this.loadSettings();

        const positions: Position[] = ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
        positions.forEach(position => {
            this.addCommand({
                id: `open-floating-note-${position}`,
                name: `Open in floating window (${position})`,
                checkCallback: (checking) => {
                    const file = this.app.workspace.getActiveFile();
                    if (file) {
                        if (!checking) {
                            this.openFloatingNote(file, position);
                        }
                        return true;
                    }
                    return false;
                },
            });
        });

        this.registerEvent(
            this.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
                if (file instanceof TFile && file.extension === "md") {
                    menu.addItem((item) => {
                        item
                            .setTitle("Open in floating window")
                            .setIcon("popup-open")
                            .onClick(() => {
                                this.openFloatingNote(file, this.settings.defaultPosition);
                            });
                    });
                }
            })
        );

        this.addRibbonIcon("popup-open", "Open floating note", async () => {
            const file = this.app.workspace.getActiveFile();
            if (file) {
                await this.openFloatingNote(file, this.settings.defaultPosition);
            }
        });

        this.addSettingTab(new FloatingNoteSettingTab(this.app, this));
        console.log("Floating Note plugin loaded");
    }

    private calculateWindowPosition(screen: any, position: Position, width: number, height: number): { x?: number, y?: number } {
        if (!screen) {
            console.error("Electron screen module is not available.");
            return { x: undefined, y: undefined };
        }

        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth, height: screenHeight } = primaryDisplay.workArea;

        switch (position) {
            case 'center':
                return {
                    x: Math.round((screenWidth - width) / 2),
                    y: Math.round((screenHeight - height) / 2)
                };
            case 'top-left':
                return { x: 0, y: 0 };
            case 'top-right':
                return { x: screenWidth - width, y: 0 };
            case 'bottom-left':
                return { x: 0, y: screenHeight - height };
            case 'bottom-right':
                return { x: screenWidth - width, y: screenHeight - height };
            default:
                return { x: undefined, y: undefined };
        }
    }

    async openFloatingNote(file: TFile, position?: Position) {
        if (!file) {
            return;
        }

        try {
            const popoutLeaf = this.app.workspace.openPopoutLeaf();
            this.floatingLeaves.add(popoutLeaf);

            popoutLeaf.on('close', () => {
                this.floatingLeaves.delete(popoutLeaf);
            });

            await popoutLeaf.openFile(file);

            const popoutWindow = (popoutLeaf.view.containerEl as any)?.win;
            const electronWindow = popoutWindow?.electronWindow;

            if (popoutWindow && electronWindow) {
                // Save position on close
                popoutWindow.addEventListener('beforeunload', () => {
                    if (this.settings.rememberPosition) {
                        const bounds = electronWindow.getBounds();
                        this.settings.notePositions[file.path] = {
                            x: bounds.x,
                            y: bounds.y,
                            width: bounds.width,
                            height: bounds.height,
                        };
                        this.saveSettings();
                    }
                });

                // Always on top
                if (this.settings.alwaysOnTop) {
                    electronWindow.setAlwaysOnTop(true, "floating");
                }

                // Set opacity
                electronWindow.setOpacity(this.settings.defaultOpacity);

                const savedGeometry = this.settings.notePositions[file.path];
                let finalWidth = this.settings.defaultWidth;
                let finalHeight = this.settings.defaultHeight;
                let finalX: number | undefined;
                let finalY: number | undefined;

                if (this.settings.rememberPosition && savedGeometry) {
                    finalWidth = savedGeometry.width;
                    finalHeight = savedGeometry.height;
                    finalX = savedGeometry.x;
                    finalY = savedGeometry.y;
                } else {
                    const screen = popoutWindow.require('@electron/remote').screen;
                    const pos = this.calculateWindowPosition(screen, position || this.settings.defaultPosition, finalWidth, finalHeight);
                    finalX = pos.x;
                    finalY = pos.y;
                }

                const bounds = {
                    width: finalWidth,
                    height: finalHeight,
                    x: finalX,
                    y: finalY,
                };

                const cleanBounds: { width: number, height: number, x?: number, y?: number } = {
                    width: Math.round(bounds.width),
                    height: Math.round(bounds.height)
                };

                if (bounds.x !== undefined) {
                    cleanBounds.x = Math.round(bounds.x);
                }
                if (bounds.y !== undefined) {
                    cleanBounds.y = Math.round(bounds.y);
                }

                electronWindow.setBounds(cleanBounds);
            }

        } catch (error) {
            console.error("Error opening floating window:", error);
        }
    }

    onunload() {
        this.closeAllFloatingWindows();
        console.log("Floating Note plugin unloaded");
    }

    closeAllFloatingWindows() {
        this.floatingLeaves.forEach((leaf) => {
            leaf.detach();
        });
        this.floatingLeaves.clear();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    public cleanupStalePositions(): number {
        const validPaths = new Set(this.app.vault.getMarkdownFiles().map(file => file.path));
        let staleCount = 0;

        if (this.settings.notePositions) {
            for (const path in this.settings.notePositions) {
                if (!validPaths.has(path)) {
                    delete this.settings.notePositions[path];
                    staleCount++;
                }
            }
        }

        // Also remove the obsolete windowBounds property if it exists
        if ((this.settings as any).windowBounds) {
            delete (this.settings as any).windowBounds;
        }

        this.saveSettings();
        return staleCount;
    }
}