'use strict';

function stringFormat(a, args) {
    for (var k in args) {
        a = a.replace("{" + k + "}", args[k])
    }
    return a
}

function htmlToElement(html)
{
  var element = document.createElement('div');
  element.innerHTML = html;
  return(element);
}


(function () {
    var Config = {
        DEFAULT_FAVICON: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAMklEQVR4AWMgEkT9R4INWBUgKX0Q1YBXQYQCkhKEMDILogSnAhhEV4AGRqoCTEhkPAMAbO9DU+cdCDkAAAAASUVORK5CYII=',

        // Templates
        MAIN_TEMPLATE: $('<div class="tabco tab-switcher" style="display: none;">' +
            '<input type="text" placeholder="Search across Tabs">' +
            '<ul class="tabs-list">' +
            '</ul>' +
            '</div>'),

        TAB_TEMPLATE: '<li data-tab-id="{id}" data-window-id="{windowId}" class="tab-item">' +
            '<span class="favicon-img">' +
            '<img src="{favicon}" onerror="this.src=\'{default_favicon}\';">' +
            '</span>' +
            '<span class="title">{title}</span>' +
            '</li>',

        SELECTED_CLASS: 'selected-tab',
        TAB_LIST: '.tab-switcher .tabs-list',
        TAB_ITEM: '.tab-item',
        TAB_INPUT: '.tab-switcher input[type="text"]',
        TAB_SWITCHER_CONTAINER: 'body',

        DOWN_KEY: 40,
        UP_KEY: 38,
        RIGHT_KEY: 39,
        LEFT_KEY: 37,
        ESCAPE_KEY: 27,
        ENTER_KEY: 13,
        SEMICOLON_KEY: 186,
        COMMA_KEY: 188,

        // Actions
        GOING_UP: 'going_up',
        GOING_DOWN: 'going_down',
        GOING_RIGHT: 'going_right',
        GOING_LEFT: 'going_left',
        ESCAPING: 'escaping',
        SWITCHING: 'switching',
        CLOSING: 'closing',
        PINNING: 'pinning'
    }

    var BrowserTab = {
        allTabs: [],

        close: function (tabId) {
            chrome.extension.sendMessage({
                    type: 'closeTab',
                    params: {
                        tabId: tabId
                    }
                },
                function (res) {}
            )

            return true
        },

        switch: function (tabId, windowId) {
            chrome.extension.sendMessage({
                    type: 'switchTab',
                    params: {
                        tabId: tabId,
                        windowId: windowId
                    }
                },
                function (res) {}
            )
        },

        togglePin: function (tabId, windowId) {
            chrome.extension.sendMessage({
                    type: 'togglePin',
                    params: {
                        tabId: tabId,
                        windowId: windowId
                    }
                },
                function (res) {}
            )
        },

        getAll: function (callback) {
            chrome.extension.sendMessage({
                type: 'getTabs'
            }, function (tabs) {
                if (!tabs) {
                    return false
                }
                BrowserTab.allTabs = tabs
                callback(tabs)
            })
        }
    }

    function TabSwitcher() {
        var tabsHtml = [],
            selectedIndex = 0

        function populateTabs(tabs) {
            tabsHtml = getTabsHtml(tabs)
            $(Config.TAB_LIST).empty()
            tabsHtml.forEach(function (tabHtml) {
                $(Config.TAB_LIST).append(tabHtml)
            })

            try {
                tabsHtml[0].addClass(Config.SELECTED_CLASS)
            } catch (e) {}
        }

        function hideSwitcher() {
            // return;
            $(Config.TAB_LIST).empty()
            $(Config.MAIN_TEMPLATE).hide()
            $(Config.TAB_INPUT).val('')
        }

        function getSwitcherAction(keyCode) {
            switch (keyCode) {
                case Config.UP_KEY:
                    return Config.GOING_UP
                case Config.DOWN_KEY:
                    return Config.GOING_DOWN
                case Config.RIGHT_KEY:
                    return Config.GOING_RIGHT
                case Config.LEFT_KEY:
                    return Config.GOING_LEFT
                case Config.ESCAPE_KEY:
                    return Config.ESCAPING
                case Config.ENTER_KEY:
                    return Config.SWITCHING
                case Config.SEMICOLON_KEY:
                    return Config.CLOSING
                case Config.COMMA_KEY:
                    return Config.PINNING
                default:
                    return false
            }
        }

        function moveTabFocus(action) {
            var movement = 0
            if (action === Config.GOING_DOWN) {
                movement = 2
            } else if (action === Config.GOING_UP) {
                movement = -2
            } else if (action === Config.GOING_RIGHT) {
                movement = 1
            } else if (action === Config.GOING_LEFT) {
                movement = -1
            }

            tabsHtml[selectedIndex].removeClass(Config.SELECTED_CLASS)

            var tempSelectedIndex = selectedIndex + movement

            if (tempSelectedIndex > tabsHtml.length - 1) {
                if (selectedIndex == tabsHtml.length - 1) {
                    selectedIndex = 0
                } else {
                    selectedIndex = tabsHtml.length - 1
                }
            } else if (tempSelectedIndex < 0) {
                if (selectedIndex == 0) {
                    selectedIndex = tabsHtml.length - 1
                } else {
                    selectedIndex = 0
                }
            } else {
                selectedIndex = tempSelectedIndex
            }
            tabsHtml[selectedIndex].addClass(Config.SELECTED_CLASS)
            tabsHtml[selectedIndex].get(0).scrollIntoViewIfNeeded()
        }

        function closeSelectedTab() {
            if (BrowserTab.close(tabsHtml[selectedIndex].data('tabId'))) {
                tabsHtml[selectedIndex].remove()
                $(Config.TAB_ITEM)
                    .first()
                    .addClass(Config.SELECTED_CLASS)
            }
        }

        function switchSelectedTab() {
            BrowserTab.switch(
                tabsHtml[selectedIndex].data('tabId'),
                tabsHtml[selectedIndex].data('windowId')
            )
        }

        function togglePinTab() {
            BrowserTab.togglePin(
                tabsHtml[selectedIndex].data('tabId'),
                tabsHtml[selectedIndex].data('windowId')
            )
        }

        function handleKeyPress(event) {
            var action = getSwitcherAction(event.keyCode)

            switch (action) {
                case Config.GOING_UP:
                case Config.GOING_DOWN:
                case Config.GOING_LEFT:
                case Config.GOING_RIGHT:
                    moveTabFocus(action)
                    break
                case Config.ESCAPING:
                    Config.MAIN_TEMPLATE.hide()
                    break
                case Config.CLOSING:
                    // Because we are using `;` to close so prevent entering
                    event.preventDefault()
                    closeSelectedTab()
                    break
                case Config.PINNING:
                    event.preventDefault()
                    togglePinTab()
                    break
                case Config.SWITCHING:
                    switchSelectedTab()
                    break
            }
        }

        function getTabsHtml(tabs) {
            var tempTabsHtml = []
            tabs.forEach(function (tab) {
                var tempTabTemplate = stringFormat(Config.TAB_TEMPLATE, {
                    'favicon': tab.favIconUrl || Config.DEFAULT_FAVICON,
                    'default_favicon': Config.DEFAULT_FAVICON,
                    'title': sanitizeHtml(tab.title),
                    'windowId': tab.windowId,
                    'id': tab.id
                })
                tempTabsHtml.push($(tempTabTemplate))
            })
            return tempTabsHtml
        }

        function match(search, text) {
            search = search.toUpperCase();
            text = text.toUpperCase();

            var j = -1,
                indices = [],
                score = 0;

            for (var i = 0; i < search.length; i++) {
                var l = search[i];
                if (l == ' ') {
                    continue;
                }

                j = text.indexOf(l, j+1);
                if (j == -1) {
                    return [false, 0];
                } else {
                    indices.push(j);
                }
            }

            if (indices.length == 1) {
                return [true, indices[0]]
            } else {
                score = indices[indices.length - 1] - indices[0]
                return [true, score];
            }
        }

        function filterTabs(keyword) {
            keyword = keyword.toLowerCase()

            var matches = [],
                tempTitle = '',
                tempUrl = ''

            BrowserTab.allTabs.map(function (tab) {
                tempTitle = tab.title.toLowerCase()
                tempUrl = tab.url.toLowerCase()
                var parser = document.createElement('a');
                parser.href = tempUrl;
                var scores = [];
                // if (match(keyword,))
                var checkers = [tempTitle, parser.hostname];
                for (var i=0; i < checkers.length; i++) {
                    var checker = checkers[i];
                    var r = match(keyword, checker);
                    if (r[0]) {
                        scores.push(r[1]);
                    }
                    if (checker.match(keyword)) {
                        scores.push(0);
                    }
                }
                if (scores.length > 0) {
                    tab.score = scores.sort()[0]
                    matches.push(tab);
                }
            })
            var result = matches.sort(function(a, b) { return a.score - b.score; });
            populateTabs(result);
        }

        function appendTabSwitcherHtml($container) {
            if (!($container instanceof jQuery)) {
                $container = $($container)
            }

            $container.append(Config.MAIN_TEMPLATE)
            return $container
        }

        function showTabSwitcher() {
            Config.MAIN_TEMPLATE.show()
            selectedIndex = 0
        }

        return {
            loadExtension: function ($container) {
                appendTabSwitcherHtml($container)
                this.bindUI()
            },

            bindUI: function () {
                $(document).on('mousedown', Config.TAB_ITEM, function () {
                    var $this = $(this),
                        tabId = $this.data('tabId'),
                        windowId = $this.data('windowId')

                    BrowserTab.switch(tabId, windowId)
                })

                $(document).on('blur', Config.TAB_INPUT, function () {
                    hideSwitcher()
                })

                $(document).on('keydown', Config.TAB_INPUT, function (e) {
                    if (Config.MAIN_TEMPLATE.is(':visible')) {
                        handleKeyPress(e)
                    }
                })

                $(document).on('keyup', Config.TAB_INPUT, function (e) {
                    var keyCode = e.keyCode,
                        action = getSwitcherAction(keyCode)

                    switch (action) {
                        case Config.GOING_DOWN:
                        case Config.GOING_UP:
                        case Config.GOING_RIGHT:
                        case Config.GOING_LEFT:
                        case Config.ESCAPING:
                        case Config.SWITCHING:
                        case Config.CLOSING:
                        case Config.PINNING:
                            return
                        default:
                            var keyword = $(this).val()
                            if ($.trim(keyword) !== '') {
                                filterTabs(keyword)
                            } else {
                                populateTabs(BrowserTab.allTabs)
                            }
                    }
                })

                chrome.runtime.onMessage.addListener(
                    function (request, sender, sendResponse) {
                        if (request.type === "command") {
                            //  To do something
                            showTabSwitcher()
                            BrowserTab.getAll(populateTabs)
                            $(Config.TAB_INPUT).focus()
                        }
                        sendResponse(true);
                    }
                );
            }
        }
    }

    $(document).ready(function () {
        var tabSwitcher = new TabSwitcher()
        tabSwitcher.loadExtension(Config.TAB_SWITCHER_CONTAINER)
    })

})()