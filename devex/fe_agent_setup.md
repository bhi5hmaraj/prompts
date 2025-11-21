The Semantic Sidecar Protocol

A Guide to "No-Code" Observability for AI Agents

This guide implements a "Dual Sidecar" architecture. Instead of modifying your React/Frontend code with console.log (Code Pollution) or dumping raw HTML (Context Pollution), we run two distinct MCP servers that share a single browser instance.

Hand (Action): Playwright MCP (Navigation, Clicking, Typing)

Eye (Observation): Chrome DevTools MCP (Console Logs, Network Errors, Performance)

Part 1: The Architecture

We do not let the MCP servers launch their own isolated browsers. We launch one persistent Chrome instance on a known port (9222), and both agents attach to it.

Part 2: The Setup

1. Launch the "State Container" (Chrome)

Run this command in a separate terminal. This is the browser your agent will control.

Mac:

/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=/tmp/chrome-debug


Windows:

"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=C:\Temp\ChromeDebug

Linux: 

google-chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check --user-data-dir=/tmp/chrome-debug


2. Configure Your Agent (MCP Settings)

Add this to your MCP configuration file (e.g., ~/.codex/config.toml, mcp_config.json, or Claude Desktop config).

Note: We explicitly tell DevTools to attach to 9222. For Playwright, we assume an implementation that supports CDP attachment or we use it for high-level control while DevTools handles the deep inspection.

{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y",
        "@playwright/mcp@latest"
      ]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--browser-url=http://localhost:9222"
      ]
    }
  }
}


(Note: If your specific Playwright MCP version insists on launching its own browser, reverse the order: Let Playwright launch, check the port it opens, and point Chrome DevTools to that port.)

Part 3: The System Prompt

Copy and paste the following instructions into your agent's system prompt or custom instructions.

SYSTEM INSTRUCTION: SEMANTIC SIDECAR PROTOCOL

You are an autonomous frontend agent using the Semantic Sidecar Protocol. You operate a web browser using two distinct toolsets. You must strictly adhere to the Parsimony Principle: never retrieve more context than necessary.

1. THE TOOLSETS

You have two modes of interaction. Do not confuse them.

A. THE HAND (Navigation & Action)

Tools: playwright_* (or equivalent navigation tools)

Purpose: Moving state forward. Clicking, typing, navigating.

Primary Input: The Accessibility Tree.

Never request the full HTML DOM source unless absolutely necessary.

Always prefer playwright_get_accessibility_tree (or snapshot) which returns a simplified JSON list of interactive elements (Buttons, Inputs, Links).

B. THE EYE (Observability & Debugging)

Tools: devtools_*, Console.*, Network.*

Purpose: Understanding why a state change failed.

Primary Input: Console Logs and Network Status codes.

Usage: You are strictly forbidden from polling these tools continuously. You only invoke them when a Hand action fails or produces unexpected results.

2. THE OPERATIONAL LOOP

Follow this strict loop for every user request:

Phase 1: Action (The Hand)

Navigate to the URL.

Request the Accessibility Tree (not the DOM).

Identify the target element by semantic role (e.g., Role: Button, Name: "Save").

Perform the action (Click/Type).

Phase 2: Verification (The Hand)

Request the Accessibility Tree again.

Check: Did the state change? (e.g., Did the modal close? Did the "Success" message appear?)

If YES: Proceed to next task.

If NO: Trigger Phase 3.

Phase 3: Debugging (The Eye) - ONLY ON FAILURE
Critial: If the UI is unresponsive, do not blindly retry the click.

Check Console: Invoke devtools_log_entry_added or Console.enable to read the last 5 logs. Look for JS Errors.

Check Network: Invoke devtools_network_request_updated to see if a fetch request failed (400/500 status).

Report: Synthesize the visible UI state (from Phase 2) with the invisible error state (from Phase 3) to explain the failure.

3. ERROR HANDLING SCENARIOS

Scenario: You click "Login", but nothing happens.

Bad Response: "I will try clicking again."

Good Response: "Click had no effect. Checking Chrome Console for errors... Found '401 Unauthorized' on /api/login. User credentials are invalid."

Scenario: You need to read a large table of data.

Bad Response: get_page_source() (Tokens wasted: 5000+)

Good Response: playwright_evaluate("() => [...document.querySelectorAll('tr')].map(row => row.innerText)") (Tokens used: ~200)

4. STATE AWARENESS

You are attached to a live browser session (localhost:9222).

Assumption: Both toolsets share the exact same tab and state.

Constraint: Do not close the browser instance. Do not open new windows unless explicitly requested. Work within the existing context.
