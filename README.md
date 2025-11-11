# 📝 Floating Note - Obsidian Plugin
---

Open your notes in always-on-top floating windows, perfect for taking notes while watching videos, reading, or working with multiple monitors.

***

![Demo GIF](assets/demo.gif)

***

## ✨ Features

- 📌 **Always on Top**: Keep notes visible above all other windows
- 🎯 **Quick Access**: Multiple ways to open floating notes
- 💾 **Remember Positions**: Automatically saves window positions
- 🎨 **Customizable**: Control size, position, opacity, and behavior
***

## 🚀 Installation

### From Obsidian Community Plugins (Recommended)
1. Open Settings in Obsidian
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Floating Note"
4. Install the plugin and enable it
***

### Manual Installation
1. Download the latest release from GitHub
2. Extract `main.js`, `manifest.json` to your vault:
   `VaultFolder/.obsidian/plugins/obsidian-floating-note/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins
***

## 📖 Usage

### Opening Floating Notes

**Method 1: Command Palette**
1. Press `Ctrl/Cmd + P` to open the command palette.
2. Search for "Open in floating window" and choose a position (e.g., `center`, `top-right`).
3. Press Enter.

**Method 2: Right-Click Menu**
1. Right-click on any markdown file in the file explorer.
2. Select "Open in floating window".

**Method 3: Ribbon Icon**
- Click the popup icon in the left sidebar to open the currently active note in a floating window.
***
## ⚙️ Settings

### Window Size
- **Default Width**: Set the default width for new floating windows (default: 400px).
- **Default Height**: Set the default height for new floating windows (default: 600px).

### Window Position
- **Default Position**: Choose where new windows appear by default:
    - Center
    - Top Right
    - Top Left
    - Bottom Right
    - Bottom Left
- **Remember Position**: If enabled, the plugin saves the size and position for each note individually.

### Window Appearance
- **Window Opacity**: Set the default transparency for floating windows (from 0.3 to 1.0).

### Window Behavior
- **Always on Top**: Keep floating windows above all other applications.

### Data Management
- **Clean up saved positions**: Remove saved position and size data for notes that no longer exist in your vault. This is useful for maintenance if you frequently delete or rename notes.

***
## 💡 Use Cases

- **📺 Video Learning**: Take notes while watching tutorial videos
- **📚 Research**: Keep reference notes visible while writing
- **👨‍💻 Coding**: Keep documentation or snippets handy
- **✍️ Writing**: Reference outlines or ideas while drafting
- **🎓 Studying**: Keep study notes visible during practice
- **📊 Presentations**: Quick access to speaker notes
***
## 🔧 Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Obsidian (v1.0.0 or higher)
***
### Setup Development Environment
```bash
# Clone the repository
git clone https://github.com/elkraps/obsidian-floating-note.git
cd obsidian-floating-note

# Install dependencies
npm install

# Build the plugin
npm run build

# For development with auto-rebuild
npm run dev
```
***
### Testing Locally

1. Create a test vault in Obsidian
2. Create the plugin directory:
```bash
   mkdir -p /path/to/test-vault/.obsidian/plugins/obisidian-floating-note
```
3. Copy built files:
```bash
   cp main.js manifest.json /path/to/test-vault/.obsidian/plugins/obsidian-floating-note/
```
4. Restart Obsidian and enable the plugin

***
## 🐛 Troubleshooting

### Window doesn't stay on top
- Make sure "Always on top" is enabled in settings
- Try restarting Obsidian
- Check if your OS has window management restrictions

### Window position not saving
- Ensure "Remember position" is enabled
- Check file permissions in `.obsidian/plugins/obsidian-floating-note/data.json`

### Plugin not loading
- Check Obsidian console for errors (Ctrl/Cmd + Shift + I)
- Ensure you're using Obsidian v1.0.0 or higher
- Verify all plugin files are present

### Performance issues
- Limit number of open floating windows
- Close unused floating windows
- Check for conflicting plugins

***
## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

***
## 📝 Changelog

### 1.0.0 - Initial release
- Always-on-top floating windows
- Customizable window size and position
- Position memory per note
- Window opacity
***
## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

***
## 💬 Support

- 🐛 [Report a bug](https://github.com/elkraps/obsidian-floating-note/issues)
- 💡 [Request a feature](https://github.com/elkraps/obsidian-floating-note/issues)
- 💬 [Discussions](https://github.com/elkraps/obsidian-floating-note/discussions)
- ⭐ Star this repo if you find it useful!

---

Made with ❤️ for the Obsidian community