/* global chrome */

/**
 * This entire function is injected into the Staffbase HR Integrations page
 * to automate the setup of a Workday integration by controlling the UI.
 */
export const workdaySetupScript = async (credentials, mappingField) => {
    // --- Helper Functions ---
  
    // Waits for a specific element to appear in the DOM before proceeding.
    const waitForElement = (selector, timeout = 20000) => {
      return new Promise((resolve, reject) => {
        const intervalTime = 100;
        let elapsedTime = 0;
        const interval = setInterval(() => {
          // querySelectorAll returns a NodeList, which can be empty.
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            clearInterval(interval);
            // Resolve with the first element found
            resolve(elements[0]);
          }
          elapsedTime += intervalTime;
          if (elapsedTime >= timeout) {
            clearInterval(interval);
            reject(new Error(`Timeout: Element "${selector}" not found`));
          }
        }, intervalTime);
      });
    };
  
    // Clicks an element and sends a message back to the extension
    const clickElement = async (selector, statusMessage) => {
      const element = await waitForElement(selector);
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: statusMessage },
      });
      element.click();
    };
  
    // Types text into an input field
    const typeIntoElement = async (selector, text, statusMessage) => {
      const element = await waitForElement(selector);
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: statusMessage },
      });
      element.focus(); // Focus on the element before typing
      element.value = text;
      // Dispatch input event to ensure React state updates
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.blur(); // Unfocus to trigger any onBlur events
    };
  
    // Finds an element (like a button or div) that contains specific text.
    const findElementByText = (selector, text) => {
      return Array.from(document.querySelectorAll(selector)).find((el) =>
        el.textContent.trim().includes(text)
      );
    };
  
    // --- Main Automation Flow ---
    try {
      // Step 1: Click the "Add integration" button
      await clickElement(
        '[data-testid="merge-dev-extensions-card__add-btn"]',
        'Clicking "Add integration"...'
      );
  
      // Step 2: In the modal, find the Workday button by its image alt text and click it
      const workdayButton = await waitForElement('img[alt="Workday"]');
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: 'Selecting "Workday"...' },
      });
      workdayButton.closest('[role="button"]').click();
  
      // Step 3: Click the "Add" button in the modal footer
      await clickElement(
        ".ds-modal__button--accept",
        'Confirming "Workday" selection...'
      );
  
      // Step 4: Fill out the "Select Unique Identifier" modal
      // Wait for the modal's name field to be ready before typing.
      await waitForElement('input[placeholder="Enter a name for your integration ..."]');
      await typeIntoElement(
        'input[placeholder="Enter a name for your integration ..."]',
        "workday",
        'Naming the integration "workday"...'
      );
  
      // Handle the custom "Staffbase Studio" dropdown intelligently
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: `Checking mapping field: "${mappingField}"...` },
      });
  
      const studioLabel = await waitForElement("label", 2000).then(() => findElementByText("label", "Staffbase Studio"));
      if (!studioLabel) throw new Error('Could not find "Staffbase Studio" label.');
      
      const studioDropdownButton = studioLabel.parentElement.querySelector("button");
      if (!studioDropdownButton) throw new Error("Could not find dropdown button.");
  
      const currentValueSpan = studioDropdownButton.querySelector('.ds-single-select__button-value');
      const isAlreadySelected = currentValueSpan && currentValueSpan.textContent.trim() === mappingField;
  
      if (isAlreadySelected) {
        chrome.runtime.sendMessage({
          type: "AUTOMATION_STATUS",
          payload: { status: `"${mappingField}" is already selected. Skipping.` },
        });
      } else {
        chrome.runtime.sendMessage({
          type: "AUTOMATION_STATUS",
          payload: { status: `Selecting "${mappingField}"...` },
        });
        studioDropdownButton.click();
        await waitForElement('[role="option"]'); // Wait for options to render
        const targetOption = findElementByText('[role="option"]', mappingField);
        if (!targetOption) throw new Error(`Dropdown option "${mappingField}" not found.`);
        targetOption.click();
      }
  
      // Click "Next" in this modal
      await clickElement('.ds-modal__button--accept', 'Proceeding to authentication...');
  
      // Step 5: "How would you like to authenticate?" modal
      const authChoiceHeader = await waitForElement("h4").then(() => findElementByText("h4", "How would you like to authenticate?"));
      if (!authChoiceHeader) throw new Error("Authentication modal did not load.");
  
      const authChoice = findElementByText("p", "Use my Workday credentials and also provide OAuth credentials");
      if (!authChoice) throw new Error("Could not find OAuth authentication option.");
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: "Selecting OAuth auth method..." },
      });
      authChoice.closest("button").click();
  
      // Step 6: "Administrator role required" modal
      const adminRoleHeader = await waitForElement("h4").then(() => findElementByText("h4", "Administrator role required"));
      if (!adminRoleHeader) throw new Error("Admin role modal did not load.");
  
      const adminButton = findElementByText("button", "I am an admin");
      if (!adminButton) throw new Error('Could not find "I am an admin" button.');
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: "Confirming admin role..." },
      });
      adminButton.click();
  
      // Step 7: Data access permissions modal
      const accessHeader = await waitForElement("h4").then(() => findElementByText("h4", "has read access to:"));
      if (!accessHeader) throw new Error("Data access modal did not load.");
  
      const nextButtonPermissions = findElementByText("button#requested-data-custom-button", "Next");
      if (!nextButtonPermissions) throw new Error("Could not find 'Next' on permissions screen.");
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: "Confirming data permissions..." },
      });
      nextButtonPermissions.click();
      
      // Step 8: "Enter your web services endpoint URL" modal
      const endpointHeader = await waitForElement("h4").then(() => findElementByText("h4", "Enter your web services endpoint URL"));
      if (!endpointHeader) throw new Error("Endpoint URL modal did not load.");
  
      await typeIntoElement(
        'input[placeholder="URL"]',
        credentials.baseURL,
        "Entering Base URL..."
      );
      const nextButtonURL = await waitForElement("button#custom-button:not([disabled])");
      if (!nextButtonURL) throw new Error("Could not find enabled 'Next' button after entering URL.");
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: "Submitting Base URL..." },
      });
      nextButtonURL.click();
  
      // Step 9: "Enter the credentials for the ISU" modal
      const isuHeader = await waitForElement("h4").then(() => findElementByText("h4", "Enter the credentials for the ISU"));
      if (!isuHeader) throw new Error("ISU credentials modal did not load.");
  
      await typeIntoElement(
        'input[placeholder="Username"]',
        credentials.username,
        "Entering ISU Username..."
      );
      await typeIntoElement(
        'input[placeholder="Password"]',
        credentials.password,
        "Entering ISU Password..."
      );
      const nextButtonCreds = await waitForElement("button#custom-button:not([disabled])");
      if (!nextButtonCreds) throw new Error("Could not find enabled 'Next' button after entering credentials.");
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: "Submitting credentials and finishing..." },
      });
      nextButtonCreds.click();
  
      // Final Step: Wait for success screen or next step
      await waitForElement("h4", 30000).then(el => {
          chrome.runtime.sendMessage({ type: 'AUTOMATION_STATUS', payload: { status: `Integration successful: ${el.textContent}` } });
      });
  
      return { success: true };
    } catch (error) {
      console.error("[Injected Automation Error]", error);
      chrome.runtime.sendMessage({
        type: "AUTOMATION_STATUS",
        payload: { status: `❌ ERROR: ${error.message}` },
      });
      return { success: false, error: error.message };
    }
  };