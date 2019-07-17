'use strict'

chrome.commands.onCommand.addListener(function (command) {
    console.log('Command:', command)
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {
            type: "command",
            data: {
                msg: "trigger_popup",
            }
        }, function (res) {
        });
    });
});

var tabIdsSorted = [];


chrome.tabs.onActivated.addListener(function(activeInfo) {
    const index = tabIdsSorted.indexOf(activeInfo.tabId);
    if (index > -1) {
        tabIdsSorted.splice(index, 1);
    }
    tabIdsSorted.push(activeInfo.tabId);
});


chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    var handler = {
        getTabs: function () {
            chrome.tabs.query({}, function (tabs) {
                var sortedTabs = tabs.sort(function(a, b){
                    return tabIdsSorted.indexOf(b.id) - tabIdsSorted.indexOf(a.id);
                  });
                sendResponse(sortedTabs);
            })
            return true;
        },
        switchTab: function (params) {
            chrome.tabs.update(params.tabId, {
                active: true
            }, function () {
                chrome.windows.update(params.windowId, {
                    focused: true
                })
            })

            return true
        },

        togglePin: function (params) {
            chrome.tabs.get(params.tabId, function (tab) {
                chrome.tabs.update(
                    params.tabId, {
                        pinned: !tab.pinned
                    },
                    function () {
                        chrome.windows.update(params.windowId, {
                            focused: true
                        })
                        return true
                    }
                )
                return true
            })

            return true
        },

        closeTab: function (params) {
            chrome.tabs.remove(params.tabId)
            return true
        }
    }

    return handler[req.type](req.params)
})
