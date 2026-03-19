/**
 * Visual indicator badge injected before </body>.
 *
 * Shows a floating pill in the bottom-right corner indicating WebMCP tools
 * were detected.  Expands on hover to list the tool names.
 *
 * Because the HTML streams through in order, we don't know the final tool
 * count when we encounter <body>.  Instead we inject a small inline script
 * that counts [toolname] elements on DOMContentLoaded and patches the badge.
 */

export function generateBadgeHTML() {
  return `
<!-- WebMCP On Demand — Injected by Fastly Compute -->
<style>
  #wmcp-badge {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 99999;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    pointer-events: auto;
  }

  #wmcp-badge .wmcp-pill {
    display: flex;
    align-items: center;
    gap: 7px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    color: #e2e8f0;
    padding: 8px 14px;
    border-radius: 999px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    cursor: default;
    transition: all 200ms ease;
    white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.08);
  }

  #wmcp-badge:hover .wmcp-pill {
    background: rgba(15, 23, 42, 0.96);
    box-shadow: 0 8px 32px rgba(0,0,0,0.28);
  }

  #wmcp-badge .wmcp-robot {
    font-size: 15px;
    line-height: 1;
  }

  #wmcp-badge .wmcp-label {
    font-weight: 600;
    color: #f8fafc;
  }

  #wmcp-badge .wmcp-sep {
    color: rgba(255,255,255,0.2);
  }

  #wmcp-badge .wmcp-count {
    font-weight: 500;
    color: #60a5fa;
  }

  /* Expandable tool list */
  #wmcp-badge .wmcp-tools {
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 250ms ease, opacity 200ms ease, margin 200ms ease;
    margin-top: 0;
  }

  #wmcp-badge:hover .wmcp-tools {
    max-height: 400px;
    opacity: 1;
    margin-top: 8px;
  }

  #wmcp-badge .wmcp-tools-inner {
    background: rgba(15, 23, 42, 0.94);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-radius: 12px;
    padding: 12px 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.18);
    border: 1px solid rgba(255,255,255,0.08);
  }

  #wmcp-badge .wmcp-tools-title {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    margin-bottom: 6px;
  }

  #wmcp-badge .wmcp-tool-item {
    display: flex;
    align-items: baseline;
    gap: 6px;
    padding: 3px 0;
    font-size: 12px;
  }

  #wmcp-badge .wmcp-tool-name {
    font-family: "SF Mono", "Fira Code", monospace;
    color: #60a5fa;
    font-weight: 500;
  }

  #wmcp-badge .wmcp-tool-desc {
    color: #94a3b8;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  }

  #wmcp-badge .wmcp-powered {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 10px;
    color: #64748b;
  }

  #wmcp-badge .wmcp-powered a {
    color: #f97316;
    text-decoration: none;
    font-weight: 600;
  }
</style>

<div id="wmcp-badge">
  <div class="wmcp-pill">
    <span class="wmcp-robot">🤖</span>
    <span class="wmcp-label">WebMCP Enhanced</span>
    <span class="wmcp-sep">·</span>
    <span class="wmcp-count" id="wmcp-tool-count">…</span>
  </div>
  <div class="wmcp-tools">
    <div class="wmcp-tools-inner">
      <div class="wmcp-tools-title">Detected Tools</div>
      <div id="wmcp-tool-list"></div>
      <div class="wmcp-powered">Powered by <a href="https://www.fastly.com" target="_blank" rel="noopener">Fastly</a> WebMCP on Demand</div>
    </div>
  </div>
</div>

<script>
(function() {
  document.addEventListener("DOMContentLoaded", function() {
    var forms = document.querySelectorAll("form[toolname]");
    var count = forms.length;
    var countEl = document.getElementById("wmcp-tool-count");
    var listEl = document.getElementById("wmcp-tool-list");

    if (countEl) {
      countEl.textContent = count + " tool" + (count !== 1 ? "s" : "") + " detected";
    }

    if (listEl) {
      forms.forEach(function(form) {
        var name = form.getAttribute("toolname");
        var desc = form.getAttribute("tooldescription") || "";
        // Truncate long descriptions
        if (desc.length > 60) desc = desc.substring(0, 57) + "...";

        var item = document.createElement("div");
        item.className = "wmcp-tool-item";

        var nameSpan = document.createElement("span");
        nameSpan.className = "wmcp-tool-name";
        nameSpan.textContent = name;

        var descSpan = document.createElement("span");
        descSpan.className = "wmcp-tool-desc";
        descSpan.textContent = desc;

        item.appendChild(nameSpan);
        item.appendChild(descSpan);
        listEl.appendChild(item);
      });
    }
  });
})();
</script>
`;
}
