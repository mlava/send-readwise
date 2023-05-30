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
            description: "The title for your Readwise library",
            action: { type: "input", placeholder: "Notes from Roam Research" },
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
            id: "readwise-createReadwiseHighlightLink",
            name: "Create Link to Highlights",
            description: "Set true to create a link to your highlights in Readwise at the end of the block in Roam",
            action: { type: "switch" },
        },
        {
            id: "readwise-createRoamHighlightLink",
            name: "Create Link back to Roam Research",
            description: "Set true to create a link back to the block in Roam within the highlight at Readwise",
            action: { type: "switch" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        extensionAPI.ui.commandPalette.addCommand({
            label: "Send to Readwise",
            callback: () => checkSettings()
        });
        window.roamAlphaAPI.ui.blockContextMenu.addCommand({
            label: "Send to Readwise",
            callback: (e) => checkSettings(e),
        });

        async function checkSettings(e) {
            var key, title, category, tagHandling;
            breakme: {
                if (!extensionAPI.settings.get("readwise-readwiseToken")) {
                    key = "API";
                    sendConfigAlert(key);
                    break breakme;
                } else {
                    const readwiseToken = extensionAPI.settings.get("readwise-readwiseToken");
                    const source = "Roam_Research";
                    const icon_url = "https://pbs.twimg.com/profile_images/1340236260846219264/wTVeE_-6_400x400.jpg";

                    if (!extensionAPI.settings.get("readwise-title")) {
                        title = "Notes from Roam Research";
                    } else {
                        title = extensionAPI.settings.get("readwise");
                    }
                    if (!extensionAPI.settings.get("readwise-category")) {
                        category = "books";
                    } else {
                        const regex = /^books|articles|tweets|podcasts$/;
                        if (extensionAPI.settings.get("readwise-category").match(regex)) {
                            category = extensionAPI.settings.get("readwise-category");
                        } else {
                            key = "cat";
                            sendConfigAlert(key);
                            break breakme;
                        }
                    }
                    if (!extensionAPI.settings.get("readwise-tagHandling")) {
                        tagHandling = "replace";
                    } else {
                        const regex = /^replace|remove$/;
                        if (extensionAPI.settings.get("readwise-tagHandling").match(regex)) {
                            tagHandling = extensionAPI.settings.get("readwise-tagHandling");
                        } else {
                            key = "tag";
                            sendConfigAlert(key);
                            break breakme;
                        }
                    }

                    const createReadwiseHighlightLink = extensionAPI.settings.get("readwise-createReadwiseHighlightLink");
                    const createRoamHighlightLink = extensionAPI.settings.get("readwise-createRoamHighlightLink");

                    let uidArray = [];
                    let uids = await roamAlphaAPI.ui.individualMultiselect.getSelectedUids(); // get multi-selection uids
                    const regex = /\[Readwise highlight\]\(https:\/\/readwise.io\/bookreview\/\d+\)/m;
                    const substa = ``;
                    if (uids.length === 0) { // not using multiselect mode
                        var uid, text;
                        if (e) { // bullet right-click 
                            uid = e["block-uid"].toString();
                            text = e["block-string"].toString();
                        } else { // command palette
                            uid = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                            var texta = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uid]);
                            text = texta[":block/string"];
                        }
                        if (text != "") { //there's text in this single block
                            text = text.replace(regex, substa);
                            uidArray.push({ uid, text })
                        } else {
                            alert("You can't send an empty block to Readwise!")
                            return;
                        }
                    } else { // multi-select mode, iterate blocks
                        for (var i = 0; i < uids.length; i++) {
                            var results = await window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uids[i]]);
                            var text = results[":block/string"];
                            if (text != "") { //there's text in this single block
                                let uid = uids[i].toString();
                                text = text.replace(regex, substa);
                                uidArray.push({ uid, text })
                            }
                        }
                    }

                    if (uidArray.length > 0) { // there are blocks to send to Readwise
                        const token = "Token " + readwiseToken;
                        const dbname = window.location.href.split('/')[5];
                        var text = "";
                        var note = "";
                        let highlights = [];

                        for (var j = 0; j < uidArray.length; j++) { // iterate and create highlights for each block
                            const roamuri = "https://roamresearch.com/#/app/" + dbname + "/page/" + uidArray[j].uid;
                            const regex = /#([a-zA-Z_]+)|#\[\[([a-zA-Z_\W]+)\]\]/mg;
                            var subst;
                            if (tagHandling == "replace") {
                                subst = `$1 $2`;
                            } else if (tagHandling == "remove") {
                                subst = ` `;
                            }
                            var replacedText = uidArray[j].text.replace(regex, subst);
                            replacedText = replacedText.replaceAll("  ", " ");
                            if (createRoamHighlightLink) {
                                replacedText += " [View at Roam Research]("+roamuri+")";
                            }

                            let m;
                            if ((m = regex.exec(text)) !== null) {
                                if (m.index === regex.lastIndex) {
                                    regex.lastIndex++;
                                }

                                if (m[2] == null) {
                                    note += " ." + m[1].replaceAll(" ", "_");
                                } else if (m[1] == null) {
                                    note += " ." + m[2].replaceAll(" ", "_");
                                }

                                highlights.push({
                                    'text': replacedText,
                                    'title': title,
                                    'source_type': source,
                                    'category': category,
                                    'highlight_url': roamuri,
                                    'note': note,
                                    'image_url': icon_url
                                });
                            } else {
                                highlights.push({
                                    'text': replacedText,
                                    'title': title,
                                    'source_type': source,
                                    'category': category,
                                    'highlight_url': roamuri,
                                    'image_url': icon_url
                                });
                            }
                        }
                        let highlight = JSON.stringify({
                            'highlights': highlights
                        });
                        
                        var myHeaders = new Headers();
                        myHeaders.append("Content-Type", "application/json; charset=utf-8");
                        myHeaders.append("Authorization", "" + token + "");

                        var requestOptions = {
                            method: 'POST',
                            headers: myHeaders,
                            redirect: 'follow',
                            body: highlight,
                        };

                        fetch("https://readwise.io/api/v2/highlights/", requestOptions)
                            .then(response => response.json())
                            .then(function (data) {
                                if (createReadwiseHighlightLink == true) {
                                    let highlight_url = data[0].highlights_url;
                                    for (var i = 0; i < uidArray.length; i++) { // iterate and add link
                                        var newString = uidArray[i].text + ' [Readwise highlight](' + highlight_url + ')';
                                        window.roamAlphaAPI.updateBlock(
                                            { block: { uid: uidArray[i].uid, string: newString.toString(), open: true } });
                                    }
                                    }
                            })
                            .catch(function (error) {
                                console.error(error);
                                alert("Sending to Readwise failed!");
                            })

                        if (uids.length !== 0) { // was using multiselect mode, so turn it off
                            window.dispatchEvent(new KeyboardEvent('keydown', {
                                key: "m",
                                keyCode: 77,
                                code: "KeyM",
                                which: 77,
                                shiftKey: false,
                                ctrlKey: true,
                                metaKey: false
                            }));
                            window.dispatchEvent(new KeyboardEvent('keyup', {
                                key: "m",
                                keyCode: 77,
                                code: "KeyM",
                                which: 77,
                                shiftKey: false,
                                ctrlKey: true,
                                metaKey: false
                            }));
                        }
                    }
                }
            }
        };
    },
    onunload: () => {
        window.roamAlphaAPI.ui.blockContextMenu.removeCommand({
            label: "Send to Readwise"
        });
    }
}

function sendConfigAlert(key) {
    if (key == "API") {
        alert("Please enter your Readwise Access Token in the configuration settings via the Roam Depot tab.");
    } else if (key == "cat") {
        alert("Please enter one of books, articles, tweets or podcasts in the configuration settings via the Roam Depot tab.");
    } else if (key == "tag") {
        alert("Please enter either remove or replace in the configuration settings via the Roam Depot tab.");
    }
}