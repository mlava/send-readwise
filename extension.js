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

export default {
  onload: ({ extensionAPI }) => {
    extensionAPI.settings.panel.create(config);

    const sendToReadwise = (e, includeChildrenOverride) =>
      runSendToReadwise(extensionAPI, e, includeChildrenOverride);
    
    extensionAPI.ui.commandPalette.addCommand({
      label: "Send to Readwise",
      callback: () => sendToReadwise(),
    });

    extensionAPI.ui.commandPalette.addCommand({
      label: "Send to Readwise (include child blocks)",
      callback: () => sendToReadwise(undefined, true),
    });
    
    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Send to Readwise",
      callback: (e) => sendToReadwise(e),
    });

    window.roamAlphaAPI.ui.blockContextMenu.addCommand({
      label: "Send to Readwise (include child blocks)",
      callback: (e) => sendToReadwise(e, true),
    });
    
    window.roamAlphaAPI.ui.slashCommand.addCommand({
      label: "Send to Readwise",
      callback: () => {
        sendToReadwise();
        return "";
      },
    });

    window.roamAlphaAPI.ui.slashCommand.addCommand({
      label: "Send to Readwise (include child blocks)",
      callback: () => {
        sendToReadwise(undefined, true);
        return "";
      },
    });

    async function runSendToReadwise(
      extensionAPI,
      e,
      includeChildrenOverride
    ) {
      const rawToken =
        extensionAPI.settings.get("readwise-readwiseToken") || "";
      const readwiseToken = rawToken.trim();

      if (!readwiseToken) {
        sendConfigAlert("API");
        return;
      }

      const rawTitle = extensionAPI.settings.get("readwise-title");
      const defaultTitle = "Notes from Roam Research";
      const baseTitle =
        (rawTitle && String(rawTitle).trim()) || defaultTitle;

      const rawTitleFromPage =
        extensionAPI.settings.get("readwise-titleFromPage");
      const usePageTitle = !!rawTitleFromPage;

      const rawCategory =
        extensionAPI.settings.get("readwise-category") || "books";
      const category = String(rawCategory).trim().toLowerCase();
      const allowedCategories = new Set([
        "books",
        "articles",
        "tweets",
        "podcasts",
      ]);
      if (!allowedCategories.has(category)) {
        sendConfigAlert("cat");
        return;
      }

      const rawTagHandling =
        extensionAPI.settings.get("readwise-tagHandling") || "replace";
      const tagHandling = String(rawTagHandling).trim().toLowerCase();
      const allowedTagHandling = new Set(["replace", "remove"]);
      if (!allowedTagHandling.has(tagHandling)) {
        sendConfigAlert("tag");
        return;
      }

      const rawIncludeTagsInNote = extensionAPI.settings.get(
        "readwise-includeTagsInNote"
      );
      // Default to true if unset, for backwards compatibility.
      const includeTagsInNote =
        rawIncludeTagsInNote === undefined
          ? true
          : !!rawIncludeTagsInNote;

      const includeChildrenSetting = !!extensionAPI.settings.get(
        "readwise-includeChildren"
      );
      const includeChildren =
        includeChildrenOverride !== undefined
          ? !!includeChildrenOverride
          : includeChildrenSetting;

      const createReadwiseHighlightLink = !!extensionAPI.settings.get(
        "readwise-createReadwiseHighlightLink"
      );
      const readwiseHighlightLinkLabel =
        (extensionAPI.settings.get(
          "readwise-readwiseHighlightLinkLabel"
        ) || "Readwise highlight")
          .toString()
          .trim() || "Readwise highlight";
      const createRoamHighlightLink = !!extensionAPI.settings.get(
        "readwise-createRoamHighlightLink"
      );
      const roamHighlightLinkLabel =
        (extensionAPI.settings.get("readwise-roamHighlightLinkLabel") ||
          "View at Roam Research")
          .toString()
          .trim() || "View at Roam Research";

      const source = "Roam_Research";
      const icon_url =
        "https://pbs.twimg.com/profile_images/1340236260846219264/wTVeE_-6_400x400.jpg";
        
      const selectedUids =
        (await window.roamAlphaAPI.ui.individualMultiselect
          ?.getSelectedUids?.()) || [];

      const readwiseLinkRegex =
        /\[[^\]]*?\]\(https:\/\/readwise\.io[^\)]*\)/m;

      /** @type {{ uid: string; text: string; highlightText: string; }[]} */
      const uidArray = [];

      const flattenBlockWithChildren = (block, depth = 0) => {
        const lines = [];
        const raw = String(block?.[":block/string"] || "");
        const cleanedLine = raw.replace(readwiseLinkRegex, "").trim();
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

      const buildBlockEntry = async (uid, fallbackText) => {
        let pulled;
        try {
          pulled = await window.roamAlphaAPI.data.pull(
            "[:block/string {:block/children ...}]",
            [":block/uid", uid]
          );
        } catch (err) {
          console.info("[Send to Readwise] Failed to pull block tree", err);
        }

        const raw = String(pulled?.[":block/string"] ?? fallbackText ?? "");
        const baseText = raw.replace(readwiseLinkRegex, "");

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

      if (selectedUids.length === 0) {
        // Single block mode
        let uid;
        let text;

        if (e && e["block-uid"]) {
          // Right-click context menu event
          uid = String(e["block-uid"]);
          text = String(e["block-string"] || "");
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
          const pulled = await window.roamAlphaAPI.data.pull(
            "[:block/string]",
            [":block/uid", uid]
          );
          text = String(pulled?.[":block/string"] || "");
        }

        const entry = await buildBlockEntry(uid, text);
        const trimmedHighlight = entry.highlightText.trim();
        if (!trimmedHighlight) {
          alert("You can't send an empty block to Readwise!");
          return;
        }

        uidArray.push(entry);
      } else {
        // Multi-select mode
        for (const uid of selectedUids) {
          const entry = await buildBlockEntry(uid);
          const trimmedHighlight =
            entry?.highlightText && entry.highlightText.trim();
          if (!trimmedHighlight) {
            continue;
          }
          uidArray.push(entry);
        }

        if (uidArray.length === 0) {
          alert(
            "All selected blocks were empty. Please select blocks with text to send to Readwise."
          );
          return;
        }
      }

      // derive title from page title of first block, if enabled
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

      // build highlights
      const dbname = window.location.href.split("/")[5];
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
            (full, p1, p2) => (p1 || p2 || "") + " "
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
        alert(
          "There are no non-empty blocks to send to Readwise. Please check your selection."
        );
        return;
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

      // send to Readwise
      try {
        const response = await fetch(
          "https://readwise.io/api/v2/highlights/",
          requestOptions
        );

        if (!response.ok) {
          console.error("[Send to Readwise] HTTP error", response.status);
          alert(
            `Sending to Readwise failed (HTTP ${response.status}). Please check your token and configuration.`
          );
          return;
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
      } catch (error) {
        console.error("[Send to Readwise] Error", error);
        alert("Sending to Readwise failed! Please check the console for details.");
      }

      // turn off multi-select if it was on
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
  },
};
