window.APP_CONFIG = window.APP_CONFIG || {
  apiBaseUrl: "http://localhost:4000"
};

const sampleInput = {
  age: 25,
  email: "user@example.com",
  isActive: true,
  profile: {
    city: "Bangalore",
    zip: 560001
  },
  tags: ["api", "qa"]
};

const heroLines = [
  "Paste your API. Skip the guesswork.",
  "Auto-generate edge cases that actually matter.",
  "Turn them into test-ready snippets instantly."
];

const TAB_LABELS = {
  edgeCases: "Edge Cases",
  testCases: "Test Cases"
};

const uiState = {
  activeTab: "edgeCases",
  filterMenuOpen: false,
  selectedPriorities: {
    edgeCases: new Set(["All"]),
    testCases: new Set(["All"])
  },
  expanded: {
    edgeCases: new Set(),
    testCases: new Set()
  },
  sections: {
    edgeCases: [],
    testCases: []
  }
};

const typewriterText = document.getElementById("typewriter-text");
const jsonInput = document.getElementById("json-input");
const jsonHighlight = document.getElementById("json-highlight");
const lineNumbers = document.getElementById("line-numbers");
const generateButton = document.getElementById("generate-button");
const loadSampleButton = document.getElementById("load-sample");
const results = document.getElementById("results");
const statusText = document.getElementById("status");
const postmanToggle = document.getElementById("postman-toggle");
const raToggle = document.getElementById("ra-toggle");

function startTypewriter(lines) {
  let lineIndex = 0;
  let charIndex = 0;
  let deleting = false;

  function tick() {
    const currentLine = lines[lineIndex];

    if (!deleting) {
      charIndex += 1;
      typewriterText.textContent = currentLine.slice(0, charIndex);

      if (charIndex === currentLine.length) {
        if (lineIndex === lines.length - 1) {
          return;
        }

        deleting = true;
        setTimeout(tick, 1200);
        return;
      }

      setTimeout(tick, 55);
      return;
    }

    charIndex -= 1;
    typewriterText.textContent = currentLine.slice(0, charIndex);

    if (charIndex === 0) {
      deleting = false;
      lineIndex += 1;
      setTimeout(tick, 280);
      return;
    }

    setTimeout(tick, 28);
  }

  tick();
}
function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.className = isError ? "status error" : "status";
}

function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightJson(value) {
  const escaped = escapeHtml(value);
  return escaped.replace(/("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:?)|\b(true|false|null)\b|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, (match, stringToken, keywordToken) => {
    if (stringToken) {
      if (stringToken.endsWith(":")) {
        return `<span class="json-key">${stringToken.slice(0, -1)}</span>:`;
      }
      return `<span class="json-string">${stringToken}</span>`;
    }
    if (keywordToken === "true" || keywordToken === "false") {
      return `<span class="json-boolean">${match}</span>`;
    }
    if (keywordToken === "null") {
      return `<span class="json-null">${match}</span>`;
    }
    return `<span class="json-number">${match}</span>`;
  });
}

function updateLineNumbers(value) {
  const lines = value.split("\n").length;
  lineNumbers.textContent = Array.from({ length: lines }, (_, index) => index + 1).join("\n");
}

function syncEditorPresentation() {
  const value = jsonInput.value || "";
  jsonHighlight.innerHTML = `${highlightJson(value)}\n`;
  updateLineNumbers(value);
  jsonHighlight.scrollTop = jsonInput.scrollTop;
  jsonHighlight.scrollLeft = jsonInput.scrollLeft;
  lineNumbers.scrollTop = jsonInput.scrollTop;
}

function insertAtCursor(text) {
  const start = jsonInput.selectionStart;
  const end = jsonInput.selectionEnd;
  const currentValue = jsonInput.value;
  jsonInput.value = `${currentValue.slice(0, start)}${text}${currentValue.slice(end)}`;
  jsonInput.selectionStart = jsonInput.selectionEnd = start + text.length;
  syncEditorPresentation();
}

async function copyText(text, button) {
  await navigator.clipboard.writeText(text);
  const previous = button.innerHTML;
  button.innerHTML = "&#10003;";
  setTimeout(() => {
    button.innerHTML = previous;
  }, 1200);
}

function clipboardIcon(text, isData = false) {
  const encoded = encodeURIComponent(text);
  return `<button class="copy-icon ${isData ? "data-copy" : ""}" data-copy="${encoded}" type="button" aria-label="Copy"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>`;
}

function getSnippetTargets() {
  const targets = [];
  if (postmanToggle.checked) targets.push("postman");
  if (raToggle.checked) targets.push("restassured");
  return targets;
}

function getPriorityOptions(tabKey) {
  const items = uiState.sections[tabKey];
  const priorities = [...new Set(items.map((item) => item.priority || "unknown"))];
  return ["All", ...priorities];
}

function resetPrioritySelection(tabKey) {
  uiState.selectedPriorities[tabKey] = new Set(["All"]);
}

function setInitialExpansion() {
  Object.keys(uiState.sections).forEach((tabKey) => {
    uiState.expanded[tabKey] = new Set();
    resetPrioritySelection(tabKey);
  });
  uiState.activeTab = uiState.sections.edgeCases.length > 0 ? "edgeCases" : "testCases";
  uiState.filterMenuOpen = false;
}

function buildSections(payload) {
  uiState.sections.edgeCases = (payload.edgeCases || []).map((item, index) => ({ ...item, uiId: `edge-${index + 1}` }));
  uiState.sections.testCases = (payload.testCases || []).map((item, index) => ({ ...item, uiId: item.id || `test-${index + 1}` }));
  setInitialExpansion();
}

function isPriorityVisible(tabKey, item) {
  const selected = uiState.selectedPriorities[tabKey];
  if (selected.has("All") || selected.size === 0) return true;
  return selected.has(item.priority || "unknown");
}

function getFilteredItems(tabKey) {
  return uiState.sections[tabKey].filter((item) => isPriorityVisible(tabKey, item));
}

function renderAccordionMeta(item) {
  return `<div class="inline-meta"><span class="meta-pill">${escapeHtml(item.type)}</span><span class="meta-pill">${escapeHtml(item.priority)}</span></div>`;
}

function arrowIcon(expanded) {
  return expanded ? "&#9662;" : "&#9656;";
}

function renderDataBlock(title, text) {
  return `<section class="content-block"><div class="block-head"><h5>${escapeHtml(title)}</h5></div><div class="pre-wrap">${clipboardIcon(text, true)}<pre class="data-block">${escapeHtml(text)}</pre></div></section>`;
}

function renderCodeBlock(title, code) {
  if (!code) return "";
  return `<section class="code-block"><div class="block-head"><h5>${escapeHtml(title)}</h5></div><div class="pre-wrap">${clipboardIcon(code)}<pre class="code-snippet">${escapeHtml(code)}</pre></div></section>`;
}

function renderEdgeCaseAccordion(item) {
  const expanded = uiState.expanded.edgeCases.has(item.uiId);
  return `<article class="card"><button class="accordion-toggle" data-accordion-tab="edgeCases" data-accordion-id="${escapeHtml(item.uiId)}" type="button"><div class="accordion-main"><span class="case-id">${escapeHtml(item.uiId.replace("edge-", "EC_"))}</span><h4 class="card-title">${escapeHtml(item.title)}</h4>${renderAccordionMeta(item)}</div><span class="accordion-indicator">${arrowIcon(expanded)}</span></button><div class="accordion-body ${expanded ? "expanded" : ""}"><div class="content-grid">${renderDataBlock("Input Variant", formatJson(item.input))}${renderCodeBlock("Postman", item.postman)}${renderCodeBlock("RestAssured", item.restassured)}</div></div></article>`;
}

function renderTestCaseAccordion(item) {
  const expanded = uiState.expanded.testCases.has(item.uiId);
  return `<article class="card"><button class="accordion-toggle" data-accordion-tab="testCases" data-accordion-id="${escapeHtml(item.uiId)}" type="button"><div class="accordion-main"><span class="case-id">${escapeHtml(item.id)}</span><h4 class="card-title">${escapeHtml(item.title)}</h4>${renderAccordionMeta(item)}</div><span class="accordion-indicator">${arrowIcon(expanded)}</span></button><div class="accordion-body ${expanded ? "expanded" : ""}"><div class="content-grid">${renderDataBlock("Input", formatJson(item.input))}${renderDataBlock("Expected", formatJson(item.expected))}</div><div class="code-grid">${renderCodeBlock("Postman", item.postman)}${renderCodeBlock("RestAssured", item.restassured)}</div></div></article>`;
}

function renderFilterMenu() {
  const tabKey = uiState.activeTab;
  const options = getPriorityOptions(tabKey);
  const selected = uiState.selectedPriorities[tabKey];
  return `<div class="filter-wrap"><button id="filter-toggle" class="filter-toggle" type="button" aria-label="Filter priorities"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4"></polygon></svg></button><div class="filter-menu ${uiState.filterMenuOpen ? "open" : ""}">${options.map((option) => `<label class="filter-option"><input type="checkbox" data-filter-tab="${tabKey}" data-filter-value="${escapeHtml(option)}" ${selected.has(option) ? "checked" : ""} /><span>${escapeHtml(option)}</span></label>`).join("")}</div></div>`;
}

function renderResults(payload) {
  if (payload) buildSections(payload);
  const availableTabs = ["edgeCases", "testCases"].filter((tabKey) => uiState.sections[tabKey].length > 0);
  if (availableTabs.length === 0) {
    results.className = "results empty-state";
    results.textContent = "Generated results will appear here.";
    return;
  }
  const activeItems = getFilteredItems(uiState.activeTab);
  const listMarkup = uiState.activeTab === "edgeCases" ? activeItems.map(renderEdgeCaseAccordion).join("") : activeItems.map(renderTestCaseAccordion).join("");
  results.className = "results";
  results.innerHTML = `<div class="toolbar"><div class="tab-row">${availableTabs.map((tabKey) => `<button class="tab-button ${uiState.activeTab === tabKey ? "active" : ""}" data-tab="${tabKey}" type="button"><span>${escapeHtml(TAB_LABELS[tabKey])}</span><span class="count-badge">${uiState.sections[tabKey].length}</span></button>`).join("")}</div>${renderFilterMenu()}</div><div class="card-list">${listMarkup || '<div class="no-results">No items for the selected filter.</div>'}</div>`;
  bindInteractiveControls();
}

function bindInteractiveControls() {
  results.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const text = decodeURIComponent(button.getAttribute("data-copy"));
      await copyText(text, button);
    });
  });
  results.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      uiState.activeTab = button.getAttribute("data-tab");
      uiState.expanded[uiState.activeTab] = new Set();
      uiState.filterMenuOpen = false;
      renderResults();
    });
  });
  const filterToggle = document.getElementById("filter-toggle");
  if (filterToggle) {
    filterToggle.addEventListener("click", () => {
      uiState.filterMenuOpen = !uiState.filterMenuOpen;
      renderResults();
    });
  }
  results.querySelectorAll("[data-filter-tab]").forEach((input) => {
    input.addEventListener("change", () => {
      const tabKey = input.getAttribute("data-filter-tab");
      const value = input.getAttribute("data-filter-value");
      const selected = uiState.selectedPriorities[tabKey];
      const allOptions = getPriorityOptions(tabKey).filter((item) => item !== "All");
      if (value === "All") {
        uiState.selectedPriorities[tabKey] = input.checked ? new Set(["All"]) : new Set();
      } else {
        selected.delete("All");
        if (input.checked) selected.add(value); else selected.delete(value);
        const selectedWithoutAll = [...selected].filter((item) => item !== "All");
        if (selectedWithoutAll.length === 0 || selectedWithoutAll.length === allOptions.length) {
          uiState.selectedPriorities[tabKey] = new Set(["All"]);
        }
      }
      renderResults();
    });
  });
  results.querySelectorAll("[data-accordion-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabKey = button.getAttribute("data-accordion-tab");
      const itemId = button.getAttribute("data-accordion-id");
      const expandedSet = uiState.expanded[tabKey];
      if (expandedSet.has(itemId)) expandedSet.delete(itemId); else expandedSet.add(itemId);
      renderResults();
    });
  });
}

async function generateCases() {
  setStatus("Generating output...");
  let parsed;
  try {
    parsed = JSON.parse(jsonInput.value);
  } catch {
    setStatus("Input must be valid JSON.", true);
    return;
  }
  try {
    const response = await fetch(`${window.APP_CONFIG.apiBaseUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: parsed,
        options: {
          includeEdgeCases: true,
          includeTestCases: true,
          snippetTargets: getSnippetTargets()
        }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to generate output.");
    renderResults(data);
    setStatus("Generated successfully.");
  } catch (error) {
    setStatus(error.message || "Request failed.", true);
  }
}

jsonInput.addEventListener("input", syncEditorPresentation);
jsonInput.addEventListener("scroll", syncEditorPresentation);
jsonInput.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    insertAtCursor("  ");
    return;
  }
  if (event.key === "Enter") {
    const start = jsonInput.selectionStart;
    const currentValue = jsonInput.value;
    const lineStart = currentValue.lastIndexOf("\n", start - 1) + 1;
    const currentLine = currentValue.slice(lineStart, start);
    const indentation = currentLine.match(/^\s*/)?.[0] ?? "";
    const previousChar = currentValue[start - 1];
    const nextChar = currentValue[start];
    if (previousChar === "{" || previousChar === "[") {
      event.preventDefault();
      const extraIndent = `${indentation}  `;
      const closingIndent = nextChar === "}" || nextChar === "]" ? `\n${indentation}` : "";
      insertAtCursor(`\n${extraIndent}${closingIndent}`);
      jsonInput.selectionStart = jsonInput.selectionEnd = start + 1 + extraIndent.length;
      return;
    }
    event.preventDefault();
    insertAtCursor(`\n${indentation}`);
  }
});

jsonInput.value = formatJson(sampleInput);
syncEditorPresentation();
startTypewriter(heroLines);
loadSampleButton.addEventListener("click", () => {
  jsonInput.value = formatJson(sampleInput);
  syncEditorPresentation();
  setStatus("Sample loaded.");
});
generateButton.addEventListener("click", generateCases);

