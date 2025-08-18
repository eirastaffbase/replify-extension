/* global chrome */

/**
 * This entire function is injected into the Staffbase HR Integrations page
 * to automate the setup of a Workday integration by controlling the UI.
 */
export const workdaySetupScript = async (credentials, mappingField) => {
    // --- Helper Functions ---
  
    // Waits for a specific element to appear in the DOM before proceeding.
    const waitForElement = (selector, timeout = 10000) => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          const element = document.querySelector(selector);
          if (element) {
            clearInterval(interval);
            resolve(element);
          }
        }, 100);
  
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error(`Timeout: Element "${selector}" not found`));
        }, timeout);
      });
    };
  
    // Clicks an element and sends a message back to the extension
    const clickElement = async (selector, statusMessage) => {
      const element = await waitForElement(selector);
      chrome.runtime.sendMessage({ type: 'AUTOMATION_STATUS', payload: { status: statusMessage } });
      element.click();
    };
  
    // Types text into an input field
    const typeIntoElement = async (selector, text, statusMessage) => {
      const element = await waitForElement(selector);
      chrome.runtime.sendMessage({ type: 'AUTOMATION_STATUS', payload: { status: statusMessage } });
      element.value = text;
      // Dispatch input event to ensure React state updates
      element.dispatchEvent(new Event('input', { bubbles: true })); 
    };
    
    // Selects an option from a dropdown
    const selectDropdownOption = async (selectSelector, optionText, statusMessage) => {
        const selectElement = await waitForElement(selectSelector);
        chrome.runtime.sendMessage({ type: 'AUTOMATION_STATUS', payload: { status: statusMessage } });
        
        const option = Array.from(selectElement.options).find(opt => opt.text.trim() === optionText.trim());
        if (!option) throw new Error(`Option "${optionText}" not found in dropdown.`);
        
        selectElement.value = option.value;
        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
    };
  
    // --- Main Automation Flow ---
    try {
      // Step 1: Click the "Add integration" button
      await clickElement('[data-testid="merge-dev-extensions-card__add-btn"]', 'Clicking "Add integration"...');
  
      // Step 2: In the modal, find the Workday button by its image alt text and click it
      const workdayButton = await waitForElement('img[alt="Workday"]');
      chrome.runtime.sendMessage({ type: 'AUTOMATION_STATUS', payload: { status: 'Selecting "Workday"...' } });
      // The image is inside the clickable div, so we find its parent button
      workdayButton.closest('[role="button"]').click();
  
      // Step 3: Click the "Add" button in the modal footer
      await clickElement('.ds-modal__button--accept', 'Confirming "Workday" selection...');
  
      // Step 4: Fill out the integration details form
      await typeIntoElement('input[name="name"]', 'Workday Integration', 'Naming the integration...');
      await selectDropdownOption('select[name="employeeIdentityMapping.profileField"]', mappingField, `Mapping to profile field "${mappingField}"...`);
  
      // Click "Next"
      await clickElement('button[type="submit"]', 'Proceeding to credential form...');
      
      // Step 5: Fill in the Workday credentials
      await typeIntoElement('input[name="customDomain"]', credentials.customDomain, 'Entering Custom Domain...');
      await typeIntoElement('input[name="username"]', credentials.username, 'Entering Username...');
      await typeIntoElement('input[name="password"]', credentials.password, 'Entering Password...');
      
      // The OAuth fields might be hidden but let's fill them just in case
      await typeIntoElement('input[name="oauthClientID"]', credentials.oauthClientID, 'Entering OAuth Client ID...');
      await typeIntoElement('input[name="oauthClientSecret"]', credentials.oauthClientSecret, 'Entering OAuth Client Secret...');
      await typeIntoElement('input[name="oauthRefreshToken"]', credentials.oauthRefreshToken, 'Entering OAuth Refresh Token...');
      await typeIntoElement('input[name="overrideOAuthTokenUrl"]', credentials.overrideOAuthTokenUrl, 'Entering OAuth Token URL...');
      await typeIntoElement('input[name="baseURL"]', credentials.baseURL, 'Entering Base URL...');
  
      // Final Step: Click the final submit/connect button
      await clickElement('button[type="submit"]', 'Submitting credentials...');
  
      // Wait a moment for the final connection to be established
      await new Promise(resolve => setTimeout(resolve, 5000));
  
      return { success: true };
    } catch (error) {
      console.error('[Injected Automation Error]', error);
      return { success: false, error: error.message };
    }
  };