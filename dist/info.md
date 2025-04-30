## Replify for Staffbase

Replify is an internal Chrome extension that helps Staffbase Solutions teams brand their demo environments with one click. It lets you personalize colors, logo, and background image from a side panel, preview changes live, save and reuse environment tokens, import LinkedIn posts, and set up new demo instances programmatically.

## Overview

Replify streamlines demo preparation by combining branding, content import, and environment setup in a single tool. Once authenticated with your Staffbase admin API key, you can choose to brand an existing environment or configure a new one. All settings are stored locally so you can switch between projects without reentering tokens.

## Usage
	1.	Navigate to a Staffbase demo environment (URL under app.staffbase.com).
	2.	Click the Replify icon or open the side panel.
	3.	Click + to enter and save your Staffbase admin API key.
	4.	Select a saved environment or authenticate a new one.
	5.	To brand an existing environment:
	    •	Enter prospect name, logo URL, background image URL.
	    •	Pick primary branding color, text color, and neutral background color.
	    •	Adjust logo padding and background position.
	    •	Click Preview Branding to see live changes or Create to apply them immediately.
	6.	To set up a new demo environment:
	    •	Toggle chat, Microsoft integration, and campaigns.
	    •	Choose launchpad items, mobile quick links, custom widgets, and merge integrations.
	    •	Click Set Up Environment and wait a few minutes for the process to complete.
	7.	To import LinkedIn posts into a Staffbase channel:
	    •	Enter a LinkedIn page URL and post count.
	    •	Click Import LinkedIn; the process runs in the background.

## Permissions
	•	scripting
Used for injecting custom CSS and modifying the Staffbase page DOM during live previews.
	•	activeTab
Grants temporary access to the active tab so the extension can query it and inject scripts.
	•	sidePanel
Enables the extension UI to appear in Chrome’s side panel.
	•	Host permissions
	•	https://app.staffbase.com/* for reading and updating environment settings.
	•	https://sb-news-generator.uc.r.appspot.com/* for setting up new demo instances.