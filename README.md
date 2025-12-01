Send a block from your Roam Research graph to your Readwise library.

This extension provides a Command Palette command to send the content of a block to Readwise.io. Simply click into the block in Roam Research, and Send to Readwise via the Command Palette. The extension even allows you to process your tags in Roam Research and converts them to Readwise.io tags.

**New:**
- settings option to merge block and childblocks into one highlight for Readwise
- command palette, slash menu and block context menu commands for block with child blocks in addition to just sending the block
- added slash menu commands
- settings option to use the page title for the 'book' title in Readwise, prepended by 'Roam - '
- improved tag handling to make readwise tags
- unfocus after creating a Readwise highlight
- setting to modify the links in Roam to Readwise highlight and in Readwise to Roam block

**Bug fixes & robustness:**
- Avoid duplicate Readwise links by stripping any existing https://readwise.io link before adding a new one
- More robust handling of page titles and block trees, including Daily Notes Pages
- Safer handling of empty blocks and multi-selects

You can configure the title of the 'book' in Readwise, whether your notes are stored as books or articles, whether to remove or replace tags from the block, and whether to leave a link to the highlight at the end of the block in Roam Research.

If you want to send a parent block together with its nested child blocks as a single, indented highlight, enable the **Include child blocks** toggle in the settings. To keep children as separate highlights instead, leave this toggle off and send the child blocks individually or via multi-select. There are also command palette/context/slash variants labeled “Send to Readwise (include child blocks)” that temporarily force the merged mode without changing your default setting.

When multi-select is active, each selected block (and its children, if enabled) is sent as a separate highlight.

Link text is also configurable: set custom labels or emojis for the Readwise highlight link that’s added back to Roam and for the Roam backlink inside Readwise, so you can use short symbols like 📚 or 🪴 instead of longer phrases.

You need to get an access token at https://readwise.io/access_token. Settings are configured within the Roam Depot menus.
