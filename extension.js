const config = {
  tabTitle: "Send to Readwise",
  settings: [
    {
      id: "readwise-readwiseToken",
      name: "Readwise Access Token",
      description: "Your Access Token from https://readwise.io/access_token",
      action: { type: "input", placeholder: "Add Readwise Access Token here" },
    },
    {
      id: "readwise-title",
      name: "Readwise Library Title",
      description: "The default title for your Readwise library",
      action: { type: "input", placeholder: "Notes from Roam Research" },
    },
    {
      id: "readwise-titleFromPage",
      name: "Use page title as library title",
      description:
        "If enabled, the Readwise title will be derived from the page title of the first selected block.",
      action: { type: "switch" },
    },
    {
      id: "readwise-category",
      name: "Readwise Category",
      description: "One of books, articles, tweets or podcasts",
      action: { type: "input", placeholder: "books" },
    },
    {
      id: "readwise-tagHandling",
      name: "Tag Handling",
      description: "Either remove or replace",
      action: { type: "input", placeholder: "replace" },
    },
    {
      id: "readwise-includeTagsInNote",
      name: "Include Roam tags in Readwise note",
      description:
        "If enabled, Roam tags (e.g. #tag, #[[Page Tag]]) will be copied to the Readwise note field as .tag_name entries.",
      action: { type: "switch" },
    },
    {
      id: "readwise-includeChildren",
      name: "Include child blocks",
      description:
        "If enabled, the selected block will be merged with all descendant blocks into a single highlight (indented).",
      action: { type: "switch" },
    },
    {
      id: "readwise-createReadwiseHighlightLink",
      name: "Create Link to Highlights",
      description:
        "Set true to create a link to your highlights in Readwise at the end of the block in Roam",
      action: { type: "switch" },
    },
    {
      id: "readwise-readwiseHighlightLinkLabel",
      name: "Readwise link label",
      description:
        "Text or emoji to show for the Readwise highlight link (e.g. 📚).",
      action: { type: "input", placeholder: "Readwise highlight" },
    },
    {
      id: "readwise-createRoamHighlightLink",
      name: "Create Link back to Roam Research",
      description:
        "Set true to create a link back to the block in Roam within the highlight at Readwise",
      action: { type: "switch" },
    },
    {
      id: "readwise-roamHighlightLinkLabel",
      name: "Roam link label",
      description:
        "Text or emoji to show for the Roam link inside Readwise (e.g. 🪴).",
      action: { type: "input", placeholder: "View at Roam Research" },
    },
  ],
};

function sendConfigAlert(key) {
  if (key === "API") {
    alert(
      "Please enter your Readwise Access Token in the configuration settings via the Roam Depot tab."
    );
  } else if (key === "cat") {
    alert(
      "Please enter one of books, articles, tweets or podcasts in the configuration settings via the Roam Depot tab."
    );
  } else if (key === "tag") {
    alert(
      "Please enter either remove or replace in the configuration settings via the Roam Depot tab."
    );
  }
}

let _extensionAPI;
let _sendInFlight = false;

const ALLOWED_CATEGORIES = new Set(["books", "articles", "tweets", "podcasts"]);
const ALLOWED_TAG_HANDLING = new Set(["replace", "remove"]);

function readAllSettings(overrides) {
  if (!_extensionAPI) {
    return { error: "Extension not initialised", errorCode: "no_init" };
  }

  const rawToken =
    _extensionAPI.settings.get("readwise-readwiseToken") || "";
  const readwiseToken = rawToken.trim();
  if (!readwiseToken) {
    return {
      error: "Readwise access token is not configured",
      errorCode: "no_token",
    };
  }

  const rawTitle = _extensionAPI.settings.get("readwise-title");
  const defaultTitle = "Notes from Roam Research";
  const baseTitle =
    overrides?.titleOverride ||
    (rawTitle && String(rawTitle).trim()) ||
    defaultTitle;

  const rawTitleFromPage =
    _extensionAPI.settings.get("readwise-titleFromPage");
  // Skip page title derivation when an explicit title override is provided
  const usePageTitle = overrides?.titleOverride ? false : !!rawTitleFromPage;

  const rawCategory =
    overrides?.categoryOverride ||
    _extensionAPI.settings.get("readwise-category") ||
    "books";
  const category = String(rawCategory).trim().toLowerCase();
  if (!ALLOWED_CATEGORIES.has(category)) {
    return {
      error: `Invalid category '${category}'. Must be one of: books, articles, tweets, podcasts`,
      errorCode: "invalid_category",
    };
  }

  const rawTagHandling =
    _extensionAPI.settings.get("readwise-tagHandling") || "replace";
  const tagHandling = String(rawTagHandling).trim().toLowerCase();
  if (!ALLOWED_TAG_HANDLING.has(tagHandling)) {
    return {
      error: `Invalid tag handling '${tagHandling}'. Must be either remove or replace`,
      errorCode: "invalid_tag_handling",
    };
  }

  const rawIncludeTagsInNote = _extensionAPI.settings.get(
    "readwise-includeTagsInNote"
  );
  // Default to true if unset, for backwards compatibility.
  const includeTagsInNote =
    rawIncludeTagsInNote === undefined ? true : !!rawIncludeTagsInNote;

  const includeChildrenSetting = !!_extensionAPI.settings.get(
    "readwise-includeChildren"
  );
  const includeChildren =
    overrides?.includeChildrenOverride !== undefined
      ? !!overrides.includeChildrenOverride
      : includeChildrenSetting;

  const createReadwiseHighlightLink = !!_extensionAPI.settings.get(
    "readwise-createReadwiseHighlightLink"
  );
  const readwiseHighlightLinkLabel =
    (_extensionAPI.settings.get("readwise-readwiseHighlightLinkLabel") ||
      "Readwise highlight")
      .toString()
      .trim()
      .replace(/[\]\)]/g, "") || "Readwise highlight";
  const createRoamHighlightLink = !!_extensionAPI.settings.get(
    "readwise-createRoamHighlightLink"
  );
  const roamHighlightLinkLabel =
    (_extensionAPI.settings.get("readwise-roamHighlightLinkLabel") ||
      "View at Roam Research")
      .toString()
      .trim()
      .replace(/[\]\)]/g, "") || "View at Roam Research";

  return {
    readwiseToken,
    baseTitle,
    usePageTitle,
    category,
    tagHandling,
    includeTagsInNote,
    includeChildren,
    createReadwiseHighlightLink,
    readwiseHighlightLinkLabel,
    createRoamHighlightLink,
    roamHighlightLinkLabel,
  };
}

async function sendBlocksToReadwise(uids, settings) {
  if (_sendInFlight) return { error: "A send is already in progress" };
  _sendInFlight = true;
  try {
    return await _sendHighlights(uids, settings);
  } catch (err) {
    console.error("[Send to Readwise] Unexpected error", err);
    return { error: `Unexpected error: ${err.message || String(err)}` };
  } finally {
    _sendInFlight = false;
  }
}

async function _sendHighlights(uids, settings) {
  const {
    readwiseToken,
    baseTitle,
    usePageTitle,
    category,
    tagHandling,
    includeTagsInNote,
    includeChildren,
    createReadwiseHighlightLink,
    readwiseHighlightLinkLabel,
    createRoamHighlightLink,
    roamHighlightLinkLabel,
  } = settings;

  const source = "Roam_Research";
  const icon_url =
    "https://pbs.twimg.com/profile_images/1340236260846219264/wTVeE_-6_400x400.jpg";

  const readwiseLinkPattern = () =>
    /\[[^\]]*?\]\(https:\/\/readwise\.io[^\)]*\)/gm;

  const flattenBlockWithChildren = (block, depth = 0) => {
    const lines = [];
    const raw = String(block?.[":block/string"] || "");
    const cleanedLine = raw.replace(readwiseLinkPattern(), "").trim();
    if (cleanedLine) {
      const prefix = depth === 0 ? "" : `${"  ".repeat(depth)}- `;
      lines.push(`${prefix}${cleanedLine}`);
    }
    const children = Array.isArray(block?.[":block/children"])
      ? block[":block/children"]
      : [];
    for (const child of children) {
      lines.push(...flattenBlockWithChildren(child, depth + 1));
    }
    return lines;
  };

  const buildBlockEntry = async (uid) => {
    let pulled;
    try {
      pulled = await window.roamAlphaAPI.data.pull(
        "[:block/string {:block/children ...}]",
        [":block/uid", uid]
      );
    } catch (err) {
      console.info("[Send to Readwise] Failed to pull block tree", err);
    }

    const raw = String(pulled?.[":block/string"] ?? "");
    const baseText = raw.replace(readwiseLinkPattern(), "");

    let highlightText = baseText;
    if (includeChildren && pulled) {
      const flattened = flattenBlockWithChildren(pulled);
      highlightText = flattened.join("\n");
      if (!highlightText.trim()) {
        highlightText = baseText;
      }
    }

    return {
      uid: String(uid),
      text: baseText,
      highlightText,
    };
  };

  // Build entries from explicit UIDs
  /** @type {{ uid: string; text: string; highlightText: string; }[]} */
  const allEntries = await Promise.all(
    uids.map((uid) => buildBlockEntry(uid))
  );
  const uidArray = allEntries.filter(
    (entry) => entry?.highlightText && entry.highlightText.trim()
  );

  if (uidArray.length === 0) {
    return { error: "All specified blocks are empty or not found" };
  }

  // Derive title from page title of first block, if enabled
  let finalTitle = baseTitle;
  if (usePageTitle && uidArray.length > 0) {
    try {
      const firstUid = uidArray[0].uid;

      const pageTitleResult = await window.roamAlphaAPI.q(
        `[:find ?title .
          :in $ ?uid
          :where
            [?b :block/uid ?uid]
            [?b :block/page ?p]
            [?p :node/title ?title]]`,
        firstUid
      );

      const pageTitle =
        pageTitleResult && String(pageTitleResult).trim();

      if (pageTitle) {
        finalTitle = `Roam – ${pageTitle}`;
      }
    } catch (err) {
      console.info(
        "[Send to Readwise] Failed to resolve page title",
        err
      );
    }
  }

  // Build highlights
  const dbname =
    window.roamAlphaAPI?.graph?.name ||
    window.location.href.split("/")[5];
  /** @type {any[]} */
  const highlights = [];

  for (const { uid, text, highlightText } of uidArray) {
    const roamuri = `https://roamresearch.com/#/app/${dbname}/page/${uid}`;
    const workingText = highlightText || text || "";

    // Extract tags from the original block text
    const tagRegex =
      /#([^\s\[\]]+)|#\[\[([^\]]+)\]\]/g; // #tag or #[[Page Tag]]
    const tags = new Set();
    let match;
    tagRegex.lastIndex = 0;
    while ((match = tagRegex.exec(workingText)) !== null) {
      const tagNameRaw = (match[1] || match[2] || "").trim();
      if (!tagNameRaw) continue;
      // Replace spaces with underscores for consistency
      const tagName = tagNameRaw.replace(/\s+/g, "_");
      tags.add(tagName);
    }

    // Clean text based on tag handling
    let cleanedText;
    if (tagHandling === "replace") {
      cleanedText = workingText.replace(
        tagRegex,
        (_full, p1, p2) => (p1 || p2 || "") + " "
      );
    } else {
      // remove
      cleanedText = workingText.replace(tagRegex, " ");
    }
    cleanedText = cleanedText
      .split("\n")
      .map((line) => {
        const match = line.match(/^(\s*)/);
        const indent = match ? match[1] : "";
        const rest = line.slice(indent.length).replace(/[ \t]{2,}/g, " ");
        return `${indent}${rest}`.trimEnd();
      })
      .join("\n")
      .trimEnd();

    if (createRoamHighlightLink) {
      cleanedText += ` [${roamHighlightLinkLabel}](${roamuri})`;
    }

    const note =
      includeTagsInNote && tags.size > 0
        ? Array.from(tags)
            .map((t) => `.${t}`)
            .join(" ")
        : "";

    const highlight = {
      text: cleanedText,
      title: finalTitle,
      source_type: source,
      category,
      highlight_url: roamuri,
      image_url: icon_url,
    };

    if (note) {
      highlight.note = note;
    }

    highlights.push(highlight);
  }

  if (highlights.length === 0) {
    return {
      error: "No non-empty highlights to send to Readwise",
    };
  }

  const body = JSON.stringify({ highlights });

  const myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json; charset=utf-8");
  myHeaders.append("Authorization", `Token ${readwiseToken}`);

  const requestOptions = {
    method: "POST",
    headers: myHeaders,
    redirect: "follow",
    body,
  };

  // Send to Readwise
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(
      "https://readwise.io/api/v2/highlights/",
      { ...requestOptions, signal: controller.signal }
    );

    if (!response.ok) {
      console.error("[Send to Readwise] HTTP error", response.status);
      return {
        error: `Sending to Readwise failed (HTTP ${response.status}). Please check your token and configuration.`,
      };
    }

    const data = await response.json();

    // Try to be tolerant of response shapes
    let highlightUrl = null;
    if (Array.isArray(data) && data[0]?.highlights_url) {
      highlightUrl = data[0].highlights_url;
    } else if (data?.highlights_url) {
      highlightUrl = data.highlights_url;
    } else if (
      Array.isArray(data?.results) &&
      data.results[0]?.highlights_url
    ) {
      highlightUrl = data.results[0].highlights_url;
    }

    if (createReadwiseHighlightLink && highlightUrl) {
      for (const { uid, text } of uidArray) {
        const newString = `${text} [${readwiseHighlightLinkLabel}](${highlightUrl})`;
        await window.roamAlphaAPI.updateBlock({
          block: { uid, string: newString, open: true },
        });
      }
      // Nudge Roam to drop focus so the cursor isn't left inside the edited block
      try {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const active = document.activeElement;
        if (active && typeof active.blur === "function") {
          active.blur();
        }
        const selection = window.getSelection();
        if (selection && typeof selection.removeAllRanges === "function") {
          selection.removeAllRanges();
        }
        const topbar = document.querySelector(".roam-topbar");
        if (topbar) {
          topbar.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true, cancelable: true })
          );
          topbar.dispatchEvent(
            new MouseEvent("mouseup", { bubbles: true, cancelable: true })
          );
        } else {
          document.body?.click?.();
        }
      } catch (err) {
        console.info("[Send to Readwise] Failed to blur active element", err);
      }
    }

    console.info(
      `[Send to Readwise] Sent ${highlights.length} highlight${
        highlights.length === 1 ? "" : "s"
      } to Readwise.`
    );

    return {
      success: true,
      count: highlights.length,
      highlights_url: highlightUrl,
    };
  } catch (error) {
    console.error("[Send to Readwise] Error", error);
    const message =
      error?.name === "AbortError"
        ? "Request to Readwise timed out after 30 seconds"
        : `Sending to Readwise failed: ${error.message || String(error)}`;
    return { error: message };
  } finally {
    clearTimeout(fetchTimeout);
  }
}

async function runSendToReadwise(e, includeChildrenOverride) {
  const overrides = {};
  if (includeChildrenOverride !== undefined) {
    overrides.includeChildrenOverride = !!includeChildrenOverride;
  }

  const settings = readAllSettings(overrides);
  if (settings.error) {
    if (settings.errorCode === "no_token") sendConfigAlert("API");
    else if (settings.errorCode === "invalid_category")
      sendConfigAlert("cat");
    else if (settings.errorCode === "invalid_tag_handling")
      sendConfigAlert("tag");
    else alert(settings.error);
    return;
  }

  // Resolve UIDs from UI state
  const selectedUids =
    (await window.roamAlphaAPI.ui.individualMultiselect
      ?.getSelectedUids?.()) || [];

  const uids = [];

  if (selectedUids.length === 0) {
    // Single block mode
    let uid;

    if (e && e["block-uid"]) {
      // Right-click context menu event
      uid = String(e["block-uid"]);
    } else {
      // Command palette or slash command: use focused block
      const focused = await window.roamAlphaAPI.ui.getFocusedBlock();
      uid = focused?.["block-uid"];
      if (!uid) {
        alert(
          "No block is focused. Please focus a block or use the block context menu."
        );
        return;
      }
    }

    uids.push(uid);
  } else {
    // Multi-select mode
    uids.push(...selectedUids);
  }

  const result = await sendBlocksToReadwise(uids, settings);
  if (result.error) {
    alert(result.error);
    return;
  }

  // Turn off multi-select if it was on
  if (selectedUids.length !== 0) {
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "m",
        keyCode: 77,
        code: "KeyM",
        which: 77,
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
      })
    );
    window.dispatchEvent(
      new KeyboardEvent("keyup", {
        key: "m",
        keyCode: 77,
        code: "KeyM",
        which: 77,
        shiftKey: false,
        ctrlKey: true,
        metaKey: false,
      })
    );
  }
}

export default {
  onload: ({ extensionAPI }) => {
    _extensionAPI = extensionAPI;
    extensionAPI.settings.panel.create(config);

    extensionAPI.ui.commandPalette.addCommand({
      label: "Send to Readwise",
      callback: () => runSendToReadwise(),
    });

    extensionAPI.ui.commandPalette.addCommand({
      label: "Send to Readwise (include child blocks)",
      callback: () => runSendToReadwise(undefined, true),
    });

    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Send to Readwise",
      callback: (e) => runSendToReadwise(e),
    });

    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Send to Readwise (include child blocks)",
      callback: (e) => runSendToReadwise(e, true),
    });

    window.roamAlphaAPI.ui.slashCommand.addCommand({
      label: "Send to Readwise",
      callback: () => {
        runSendToReadwise();
        return "";
      },
    });

    window.roamAlphaAPI.ui.slashCommand.addCommand({
      label: "Send to Readwise (include child blocks)",
      callback: () => {
        runSendToReadwise(undefined, true);
        return "";
      },
    });

    // ---- Extension Tools API registration ----
    window.RoamExtensionTools = window.RoamExtensionTools || {};
    window.RoamExtensionTools["send-readwise"] = {
      name: "Send to Readwise",
      version: "1.0",
      tools: [
        {
          name: "sr_get_config",
          description:
            "Get current Send to Readwise configuration: whether a token is set, default title, category, tag handling mode, and link settings. Does not expose the actual API token.",
          readOnly: true,
          parameters: { type: "object", properties: {} },
          execute: async () => {
            if (!_extensionAPI) {
              return { error: "Extension not initialised" };
            }

            const rawToken =
              _extensionAPI.settings.get("readwise-readwiseToken") || "";
            const hasToken = !!rawToken.trim();

            const rawTitle =
              _extensionAPI.settings.get("readwise-title");
            const title =
              (rawTitle && String(rawTitle).trim()) ||
              "Notes from Roam Research";

            const usePageTitle = !!_extensionAPI.settings.get(
              "readwise-titleFromPage"
            );

            const rawCategory =
              _extensionAPI.settings.get("readwise-category") || "books";
            const category = String(rawCategory).trim().toLowerCase();

            const rawTagHandling =
              _extensionAPI.settings.get("readwise-tagHandling") || "replace";
            const tagHandling =
              String(rawTagHandling).trim().toLowerCase();

            const rawIncludeTagsInNote = _extensionAPI.settings.get(
              "readwise-includeTagsInNote"
            );
            const includeTagsInNote =
              rawIncludeTagsInNote === undefined
                ? true
                : !!rawIncludeTagsInNote;

            const includeChildren = !!_extensionAPI.settings.get(
              "readwise-includeChildren"
            );

            const createReadwiseLink = !!_extensionAPI.settings.get(
              "readwise-createReadwiseHighlightLink"
            );
            const readwiseLinkLabel =
              (_extensionAPI.settings.get(
                "readwise-readwiseHighlightLinkLabel"
              ) || "Readwise highlight")
                .toString()
                .trim() || "Readwise highlight";

            const createRoamLink = !!_extensionAPI.settings.get(
              "readwise-createRoamHighlightLink"
            );
            const roamLinkLabel =
              (_extensionAPI.settings.get(
                "readwise-roamHighlightLinkLabel"
              ) || "View at Roam Research")
                .toString()
                .trim() || "View at Roam Research";

            return {
              has_token: hasToken,
              title,
              use_page_title: usePageTitle,
              category,
              tag_handling: tagHandling,
              include_tags_in_note: includeTagsInNote,
              include_children: includeChildren,
              create_readwise_link: createReadwiseLink,
              readwise_link_label: readwiseLinkLabel,
              create_roam_link: createRoamLink,
              roam_link_label: roamLinkLabel,
            };
          },
        },
        {
          name: "sr_send",
          description:
            "Send one or more Roam blocks as highlights to Readwise. Requires block UIDs (does not use UI selection state). Respects configured settings but accepts optional overrides for title, category, and include_children.",
          readOnly: false,
          parameters: {
            type: "object",
            properties: {
              uids: {
                type: "array",
                items: { type: "string" },
                description: "Block UIDs to send as highlights.",
              },
              title: {
                type: "string",
                description:
                  "Override the library title for this send. Omit to use configured default.",
              },
              category: {
                type: "string",
                enum: ["books", "articles", "tweets", "podcasts"],
                description:
                  "Override the category. Omit to use configured default.",
              },
              include_children: {
                type: "boolean",
                description:
                  "Override whether to include child blocks. Omit to use configured default.",
              },
            },
            required: ["uids"],
          },
          execute: async (args) => {
            if (
              !args ||
              !Array.isArray(args.uids) ||
              args.uids.length === 0
            ) {
              return {
                error:
                  "uids is required and must be a non-empty array of block UIDs",
              };
            }

            if (args.uids.length > 50) {
              return { error: "Maximum 50 block UIDs per send" };
            }

            const overrides = {};
            if (args.title !== undefined)
              overrides.titleOverride = String(args.title);
            if (args.category !== undefined)
              overrides.categoryOverride = String(args.category);
            if (args.include_children !== undefined)
              overrides.includeChildrenOverride = !!args.include_children;

            const settings = readAllSettings(overrides);
            if (settings.error) return { error: settings.error };

            return await sendBlocksToReadwise(args.uids, settings);
          },
        },
      ],
    };
  },

  onunload: () => {
    window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
      label: "Send to Readwise",
    });
    window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
      label: "Send to Readwise (include child blocks)",
    });
    window.roamAlphaAPI.ui.slashCommand.removeCommand({
      label: "Send to Readwise",
    });
    window.roamAlphaAPI.ui.slashCommand.removeCommand({
      label: "Send to Readwise (include child blocks)",
    });
    delete window.RoamExtensionTools?.["send-readwise"];
    _extensionAPI = null;
  },
};
