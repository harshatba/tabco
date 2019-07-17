'use strict';

(function(){


    var Config = {

        DEFAULT_FAVICON: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAMklEQVR4AWMgEkT9R4INWBUgKX0Q1YBXQYQCkhKEMDILogSnAhhEV4AGRqoCTEhkPAMAbO9DU+cdCDkAAAAASUVORK5CYII=',

        // Templates
        MAIN_TEMPLATE :'<div class="tab-switcher" style="display: none;">' +
        '<input type="text" placeholder="Search by Title">' +
        '<ul class="tabs-list">' +
        '</ul>' +
        '</div>',

        TAB_TEMPLATE  : '<li data-tab-id="{id}" data-window-id="{windowId}" class="tab-item">' +
        '<span class="favicon-img">' +
        '<img src="{favicon}" onerror="this.src=\'{default_favicon}\';">' +
        '</span>' +
        '<span class="title">{title}</span>' +
        '</li>',

        SELECTED_CLASS: 'selected-tab',
        TAB_SELECTED  : '.selected-tab',
        FAVICON_IMG   : '.favicon-img img',
        TAB_SWITCHER  : '.tab-switcher',
        TAB_LIST      : '.tab-switcher .tabs-list',
        TAB_ITEM      : '.tab-item',
        TAB_INPUT     : '.tab-switcher input[type="text"]',
        TAB_SWITCHER_CONTAINER: 'body',

        MASTER_KEY    : '⌘+⇧+l, ⌃+⇧+l',

        DOWN_KEY      : 40,
        UP_KEY        : 38,
        ESCAPE_KEY    : 27,
        ENTER_KEY     : 13,
        SEMICOLON_KEY : 186,
        COMMA_KEY     : 188,

        // Actions
        GOING_UP      : 'going_up',
        GOING_DOWN    : 'going_down',
        ESCAPING      : 'escaping',
        SWITCHING     : 'switching',
        CLOSING       : 'closing',
        PINNING       : 'pinning'
    };
    var BrowserTab = {

        
        allTabs: [],

        close: function (tabId) {
            chrome.extension.sendMessage({
                type: 'closeTab',
                params: {
                    tabId: tabId
                }
            }, function(res) {});

            return true;
        },


        switch: function (tabId, windowId) {
            chrome.extension.sendMessage({
                type: 'switchTab',
                params: {
                    tabId: tabId,
                    windowId: windowId
                }
            }, function(res) {});
        },

        togglePin: function (tabId, windowId) {
            chrome.extension.sendMessage({
                type: 'togglePin',
                params: {
                    tabId: tabId,
                    windowId: windowId
                }
            }, function(res) {});
        },

        getAll: function (callback) {
            chrome.extension.sendMessage({ type: 'getTabs' }, function(tabs) {
                if (!tabs) {
                    return false;
                }
                BrowserTab.allTabs = tabs;
                callback(tabs);
            });
        }
    };


    function TabSwitcher() {

        function populateTabs(tabs) {
            var tabsHtml = getTabsHtml(tabs);

            $(Config.TAB_LIST).html(tabsHtml);
            $(Config.TAB_ITEM).first().addClass(Config.SELECTED_CLASS);
        }


        function hideSwitcher() {
            $(Config.TAB_SWITCHER).hide();
            $(Config.TAB_INPUT).val('');
        }


        function getSwitcherAction(keyCode) {
            switch (keyCode) {
                case Config.UP_KEY:
                    return Config.GOING_UP;
                case Config.DOWN_KEY:
                    return Config.GOING_DOWN;
                case Config.ESCAPE_KEY:
                    return Config.ESCAPING;
                case Config.ENTER_KEY:
                    return Config.SWITCHING;
                case Config.SEMICOLON_KEY:
                    return Config.CLOSING;
                case Config.COMMA_KEY:
                    return Config.PINNING;
                default:
                    return false;
            }
        }


        function moveTabFocus(action) {

            var $firstSelected  = $(Config.TAB_SELECTED);

            
            if ($firstSelected.length !== 0 ) {

            
                $firstSelected.removeClass(Config.SELECTED_CLASS);

                var $toSelect = null;

                if (action === Config.GOING_DOWN) {
                    var $nextSelected = $firstSelected.next(Config.TAB_ITEM);
                    $toSelect         = $nextSelected.length !== 0 ? $nextSelected : $(Config.TAB_ITEM).first();
                } else if (action === Config.GOING_UP) {
                    var $prevSelected = $firstSelected.prev(Config.TAB_ITEM);
                    $toSelect = $prevSelected.length !== 0 ? $prevSelected : $(Config.TAB_ITEM).last();
                }

                $nextSelected = $toSelect.addClass(Config.SELECTED_CLASS);
            } else {
                $nextSelected = $(Config.TAB_ITEM).first().addClass(Config.SELECTED_CLASS);
            }

            $nextSelected.get(0).scrollIntoViewIfNeeded();
        }

       
        function closeSelectedTab() {
            var $firstSelected = $(Config.TAB_SWITCHER).find(Config.TAB_SELECTED).first();

            if (BrowserTab.close($firstSelected.data('tabId'))) {
                $firstSelected.remove();
                $(Config.TAB_ITEM).first().addClass(Config.SELECTED_CLASS);
            }
        }

        
        function switchSelectedTab() {
            var $firstSelected = $(Config.TAB_SWITCHER).find(Config.TAB_SELECTED).first();
            BrowserTab.switch($firstSelected.data('tabId'), $firstSelected.data('windowId'));
        }

        function togglePinTab() {
            var $firstSelected = $(Config.TAB_SWITCHER).find(Config.TAB_SELECTED).first();
            BrowserTab.togglePin($firstSelected.data('tabId'), $firstSelected.data('windowId'));
        }


        function handleKeyPress(event) {

            var action = getSwitcherAction(event.keyCode);

            switch (action) {
                case Config.GOING_UP:
                case Config.GOING_DOWN:
                    moveTabFocus(action);
                    break;
                case Config.ESCAPING:
                    $(Config.TAB_SWITCHER).hide();
                    break;
                case Config.CLOSING:
                    // Because we are using `;` to close so prevent entering
                    event.preventDefault();
                    closeSelectedTab();
                    break;
                case Config.PINNING:
                    event.preventDefault();
                    togglePinTab();
                    break;
                case Config.SWITCHING:
                    switchSelectedTab();
                    break;
            }
        }


        function getTabsHtml(tabs) {
            var tabsHtml = '';
            tabs.forEach(function(tab){

                var tempTabTemplate = Config.TAB_TEMPLATE,
                    faviconUrl = tab.favIconUrl || Config.DEFAULT_FAVICON;

                tempTabTemplate = tempTabTemplate.replace('{favicon}', faviconUrl);
                tempTabTemplate = tempTabTemplate.replace('{default_favicon}', Config.DEFAULT_FAVICON);
                tempTabTemplate = tempTabTemplate.replace('{title}', sanitizeHtml(tab.title));
                tempTabTemplate = tempTabTemplate.replace('{id}', tab.id);
                tempTabTemplate = tempTabTemplate.replace('{windowId}', tab.windowId);

                tabsHtml += tempTabTemplate;
            });

            return tabsHtml;
        }

        function filterTabs(keyword) {

          // console.log(keyword);

            keyword = keyword.toLowerCase();

            var matches   = [],
                tempTitle = '',
                tempUrl   = '';

            BrowserTab.allTabs.map(function (tab) {
                tempTitle = tab.title.toLowerCase();
                tempUrl   = tab.url.toLowerCase();

                if (tempTitle.match(keyword) || tempUrl.match(keyword)) {
                    matches.push(tab);
                }
            });

            populateTabs(matches);
        }


        function appendTabSwitcherHtml($container) {
            if (!($container instanceof jQuery)) {
                $container = $($container);
            }

            $container.append(Config.MAIN_TEMPLATE);
            return $container;
        }

        function showTabSwitcher() {
            var $tabSwitcher = $(Config.TAB_SWITCHER);

            if ($tabSwitcher.length === 0) {
                appendTabSwitcherHtml(Config.TAB_SWITCHER_CONTAINER);
                $tabSwitcher = $(Config.TAB_SWITCHER);
            }

            $tabSwitcher.show();
        }

        return {

            loadExtension: function ($container) {
                appendTabSwitcherHtml($container);
                this.bindUI();
            },

            bindUI: function () {
                $(document).on('mousedown', Config.TAB_ITEM, function () {

                    var $this = $(this),
                        tabId = $this.data('tabId'),
                        windowId = $this.data('windowId');

                    BrowserTab.switch(tabId, windowId);
                });


                $(document).on('blur', Config.TAB_INPUT, function () {
                    hideSwitcher();
                });


                $(document).on('keydown', Config.TAB_INPUT, function (e) {
                    if ($(Config.TAB_SWITCHER).is(':visible')) {
                        handleKeyPress(e);
                    }
                });


                $(document).on('keyup', Config.TAB_INPUT, function (e) {

                    var keyCode = e.keyCode,
                        action  = getSwitcherAction(keyCode);

                    switch (action) {
                        case Config.GOING_DOWN:
                        case Config.GOING_UP:
                        case Config.ESCAPING:
                        case Config.SWITCHING:
                        case Config.CLOSING:
                        case Config.PINNING:
                            return;
                        default:
                            var keyword = $(this).val();
                            if ($.trim(keyword) !== '') {
                                filterTabs(keyword);
                            } else {
                                populateTabs(BrowserTab.allTabs);
                            }
                    }
                });


                key(Config.MASTER_KEY, function () {
                    showTabSwitcher();
                    $(Config.TAB_INPUT).focus();

                    BrowserTab.getAll(populateTabs);
                });
            }
        };
    }

    $(document).ready(function () {
        var tabSwitcher = new TabSwitcher();
        tabSwitcher.loadExtension(Config.TAB_SWITCHER_CONTAINER);
    });

}());