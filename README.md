Send a block from your Roam Research graph to your Readwise library.

This extension sends blocks from Roam Research to Readwise.io as highlights. Invoke it from the Command Palette, slash menu, or block context menu. Tags in Roam are automatically converted to Readwise tags.

**Features:**
- Send a single block or a parent block merged with its child blocks as one indented highlight
- Command palette, slash menu, and block context menu commands (with “include child blocks” variants)
- Multi-select support — each selected block is sent as a separate highlight
- Configurable ‘book’ title, category (book or article), tag handling, and link labels
- Option to use the page title for the Readwise book title (prepended by ‘Roam - ‘)
- Bidirectional links: adds a Readwise highlight link back to Roam and a Roam backlink inside Readwise, with customisable labels
- Duplicate link prevention — existing Readwise links are stripped before adding a new one
- Extension Tools API integration — exposes `sr_get_config` and `sr_send` tools for Chief of Staff and other AI orchestrators

**Child blocks:**
If you want to send a parent block together with its nested child blocks as a single, indented highlight, enable the **Include child blocks** toggle in the settings. To keep children as separate highlights instead, leave this toggle off and send the child blocks individually or via multi-select. There are also command palette/context/slash variants labeled “Send to Readwise (include child blocks)” that temporarily force the merged mode without changing your default setting.

**Setup:**
You need to get an access token at https://readwise.io/access_token. Settings are configured within the Roam Depot menus.
