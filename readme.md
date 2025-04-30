# Replify Chrome Extension

This Chrome extension allows you to automatically brand demo environments. 

## Installation

1.  **Clone the repository:**
    ```bash
    git clone replify
    cd replify-extension
    ```

2.  **Navigate to the `replify` folder within `replify-extension`:**
    ```bash
    cd replify
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Build the extension:**
    ```bash
    npm run build
    ```
    This command compiles the application code and outputs the necessary files into the `dist` folder.

5.  **Load the unpacked extension in Chrome:**
    * Open Google Chrome.
    * Navigate to `chrome://extensions/` in the address bar.
    * Enable "Developer mode" in the top right corner.
    * Click the "Load unpacked" button in the top left corner.
    * In the file dialog, navigate to and select the **`dist`** folder from your local repository.

## Development

The extension utilizes two main folders:

* **`dist`**: This folder contains the built and packaged version of your Chrome extension. You will load this folder into Chrome's developer settings.
* **`replify`**: This folder contains the source code of your extension.

### Development Workflow

1.  **Make changes:** Modify the files within the `replify/src` folder.
2.  **Build the extension:** After saving your changes, navigate to the `replify` folder in your terminal and run:
    ```bash
    npm run build
    ```
    This command will automatically rebuild your extension and update the contents of the `dist` folder.
3.  **Automatic Updates in Chrome:** If you have already loaded the `dist` folder as an unpacked extension in Chrome, the changes will be automatically reflected in the extension (you might need to refresh any relevant Chrome pages for the changes to take effect).