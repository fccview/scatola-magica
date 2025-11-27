# Shortcuts

Scatola Magica supports a range of keyboard shortcuts to help you manage files efficiently without reaching for the mouse. These shortcuts work globally throughout the application, and context menus provide quick access to file operations with a right-click.

### Global Shortcuts

These shortcuts work anywhere in the application to help you navigate and manage files quickly. We use non-conflicting shortcuts that don't override browser defaults.

| Shortcut                                            | Action                                                                                    |
| :-------------------------------------------------- | :---------------------------------------------------------------------------------------- |
| <kbd>F</kbd>                                        | Focus the search bar to search for files                                                  |
| <kbd>⌘ Cmd</kbd> + <kbd>Shift</kbd> + <kbd>U</kbd> | Open the upload file dialog                                                               |
| <kbd>+</kbd>                                        | Open the create folder dialog                                                             |
| <kbd>⌘ Cmd</kbd> + <kbd>V</kbd>                     | Upload files/images from clipboard (only works with files, not text)                      |
| <kbd>V</kbd>                                        | Toggle between grid and list view                                                         |
| <kbd>R</kbd>                                        | Toggle recursive mode (show all files from subfolders vs folders + direct files)          |
| <kbd>X</kbd>                                        | Enter/exit selection mode to select multiple files                                        |

**\*Note:** For Windows/Linux shortcuts, use `Ctrl` instead of `⌘ Cmd`. Single-key shortcuts (like `/`, `V`, `R`, `X`) only work when you're not typing in an input field.\*

## Context Menus (Right-Click)

Context menus appear when you right-click on different areas of the application. The available options change based on what you click.

### File Context Menu

Right-click on any file to access:
- **Rename** - Rename the file
- **Move** - Move the file to a different folder
- **Delete** - Delete the file (with confirmation)

### Folder Context Menu

Right-click on any folder to access:
- **Rename Folder** - Rename the folder
- **New Folder** - Create a new subfolder
- **Upload Files** - Upload files to this folder
- **Delete Folder** - Delete the folder and all its contents (with confirmation)

### Empty Space Context Menu

Right-click on empty space in the files area to access:
- **New Folder** - Create a new folder in the current location
- **Upload Files** - Upload files to the current location

## Tips

- All shortcuts work globally throughout the application
- Shortcuts don't trigger when you're typing in an input field or textarea
- Context menus automatically adjust their position to stay within the viewport
- Press <kbd>Esc</kbd> to close any open context menu
- Confirmation dialogs appear for destructive actions (delete, etc.)

### Paste Upload Behavior

The paste upload (<kbd>⌘ Cmd</kbd> + <kbd>V</kbd>) feature is smart:
- Only triggers when clipboard contains files or images
- Won't interfere with normal text pasting in inputs
- Works with screenshots, copied images, and copied files
- Automatically detects your current folder location
