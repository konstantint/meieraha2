/**
 * A singleton utility object for opening disqus threads.
 * The disqus thread is always opened in the <div id="disqus_thread">
 */
var DisqusOpener = {
    disqusLoaded: false,
    disqusShortname: '',
    onNewComment: function(comment) {
        // Nothing
    },
    openDisqus: function(id, url, title, language) {
        var self = this;
        if (language === undefined) language = 'en';
        window.disqus_shortname = this.disqusShortname;
        window.disqus_identifier = id;
        window.disqus_url = url;
        window.disqus_title = title;
        window.disqus_config = function() {
            this.language = language;
            this.callbacks.onNewComment = [self.onNewComment];
        }

        if (!this.disqusLoaded) {
            (function() {
                var dsq = document.createElement('script'); dsq.type = 'text/javascript'; dsq.async = true;
                dsq.src = 'http://' + this.disqusShortname + '.disqus.com/embed.js';
                (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(dsq);
            })();
            this.disqusLoaded = true;
        }
        else {
            DISQUS.reset({
                    reload: true,
                    config: function () {
                        this.page.identifier = id;
                        this.page.url = url;
                        this.page.title = title;
                        this.language = language;
                    }
                });
        }
    }
};

/**
 * Component for managing bubble-associated discussions.
 * Although it is creatable as a usual object, it may not be created more than
 * once because it initializes a DiscusOpener that can only work in one instance per page.
 * Parameters:
 *   disqusShortname:  The "shortname" config parameter for disqus.
 *   backendConnector: The BackendConnector instance.
 *   dataMapper:       The dataMapper instance for the visualization (may be set later via setDataMapper)
 */
function BubbleDisqusUtil(disqusShortname, backendConnector, dataMapper) {
    var self = this;
    var _bubbleInfo = $("#bubbleInfo"),
        _dataMapper,        // DataMapper instance, used to properly format titles in the discussion panel
        _visId,             // Currently shown visualization id, needed to query appropriate list of discussions
        _disqusUrlPrefix,   // The disqus prefix used for disqus threads.
        _currentDataItem,   // The dataItem for which the discussion window was opened last.
        _dataItemRegistry;  // We internally keep track of the association between "thread_id" and the corresponding dataItem
                            // This makes it possible to correctly recover item titles in the discussion list
                            // Note, though, that if you would reuse the BubbleDisqusUtil for loading multiple
                            // datasets, it won't clean up the registry and will eat the memory.
                            // The registry is automatically updated when prepareData is called.

    function __init__() {
        _dataMapper = dataMapper;
        _dataItemRegistry = {};
        if (DisqusOpener.disqusShortname != '') throw "DisqusOpener already configured, no two instances are allowed!"
        DisqusOpener.disqusShortname = disqusShortname;

        DisqusOpener.onNewComment = function(comment) {
            backendConnector.reportComment(window.disqus_identifier);
        }
    }
    __init__();

    self.setDataMapper = function(dataMapper) {
        _dataMapper = dataMapper;
    }

    /**
     * Opens the discussion for given data item.
     * NB: The url of the discussion is determined from the disqus_id parameter of the dataItem.
     *     This parameter is set using the prepareData method, which must be invoked before the data item may be used with this method.
     */
    self.openDiscussion = function(dataItem) {
        _currentDataItem = dataItem;
        var node = self.updateDisplay();

        $('#discussionIndex').hide();
        $('#bubbleInfo').show();
        if ($('#infoPanel').hasClass('open')) $('#infoPanel').removeClass('open');
        if (!$('#discussionPanel').hasClass('open')) $("#discussionPanel").addClass('open');

        DisqusOpener.openDisqus(dataItem.disqus_id, dataItem.disqus_url, node.label, _dataMapper.getLang());
    }

    /**
     * Same as openDiscussion, but a threadId is provided instead of dataItem.
     */
    self.openDiscussionByThreadId = function(threadId) {
       self.openDiscussion(_dataItemRegistry[threadId]);
    }

    /**
     * Updates the display of the discussion panel with data from currentDataItem.
     * If currentDataItem is not yet available (e.g. no one ever opened a discussion dialog), does nothing
     */
    self.updateDisplay = function() {
        if (_currentDataItem === undefined) return {};

        // We support two different "modes" for bubble tooltips and Disqus metainfo:
        //   Single-year: this is the "default" mode, it corresponds to the situation
        //                when the revision slider shows different revisions of a single-year budget over the months.
        //                In this case we may show "initial" value (the very first revision) along with "adjusted" (current revision).
        //   Multi-year:  this corresponds to the situation, where the revision slider shows different years.
        //                In this case there is no point in showing the "initial" and "adjusted" values - every revision is
        //                a full revision in its own right.
        //                The multi-year mode is indicated by setting multiyear: true in the metadata of the visualization.
        var singleYear = (_currentDataItem.__meta__ === undefined || !_currentDataItem.__meta__.multiyear);

        var node = _dataMapper.createNode(_currentDataItem);
        $('#bubbleTitle').html(node.label);

        if (node.label != node.description)
            $('#bubbleDescription').html(node.description);
        else
            $('#bubbleDescription').html('');

        _bubbleInfo.find(".current .value").html(node.amountText);
        _bubbleInfo.find(".initial .value").html(node.initialAmountText);

        if (node.fillAmountText === undefined) {
            _bubbleInfo.find(".filled").css({"visibility": "hidden"});
        }
        else {
            _bubbleInfo.find(".filled").css({"visibility": "visible"});
            var txt = node.fillAmountText;
            if (node.amount != 0)
                txt = txt + " (" + Math.round(100*node.fillAmount / node.amount) + "%)";
            _bubbleInfo.find(".filled .value").html(txt);
        }

        if (!singleYear || !(_currentDataItem.amount instanceof Array) || node.amountText == node.initialAmountText) {
            _bubbleInfo.find(".current").css({"visibility": "hidden"});
        }
        else {
            _bubbleInfo.find(".current").css({"visibility": "visible"});
            if (node.initialAmount != 0) {
                var txt = node.amountText;
                var diff = Math.round(100*(node.amount - node.initialAmount)/node.initialAmount);
                var diffTxt = (diff == 0) ? "" :
                              (diff > 0) ? " (+" + diff + "%)" :
                              " (" + diff + "%)";
                txt = txt + diffTxt;
                _bubbleInfo.find(".current .value").html(txt);
            }
        }

        // Prepare breadcrumb hierarchical display.
        function breadCrumb(dataItem) {
            if (dataItem === undefined) return "";
            else return breadCrumb(dataItem.__parent__)
                            + "<span class='link'>"
                            + _dataMapper.computeLabel(dataItem)
                            + "</span> &gt; ";
        }
        _bubbleInfo.find("#breadCrum").html(breadCrumb(_currentDataItem.__parent__));

        return node;
    }

    /**
     * Provides the ID and "disqusUrlPrefix" of the visualization that is yet to be loaded.
     * Parameters:
     *  vis_id : must be the id of the visualization shown.
     *  disqusUrlPrefix:  a fully-qualified URL of the form http://.../view/<id>
     */
    self.setVisualizationParams = function(visId, disqusUrlPrefix) {
        _visId = visId;
        _disqusUrlPrefix = disqusUrlPrefix;
    }

    /**
     * Adds the disqus_id := <vis_id>|<role>|<item_id> attribute to all elements of the dataset
     * and records the items in the registry.
     * Make sure setVisualizationParams is invoked before prepareData for the data of the visualization.
     * Parameters:
     *  rootItem : the root item of the data tree.
     *  role:   typically "left", "right" or "comparison".
     */
    self.prepareData = function(rootItem, role) {
        if (rootItem.disqus_id === undefined) rootItem.disqus_id = '' + _visId + '|' + role + '|' + rootItem.id;
        if (rootItem.disqus_url === undefined) rootItem.disqus_url = _disqusUrlPrefix + '?disqus=' + rootItem.disqus_id;
        _dataItemRegistry[rootItem.disqus_id] = rootItem;
        if (rootItem.children !== undefined) rootItem.children.forEach(function(el) { self.prepareData(el, role); });
    }

    /**
     * Hides discussion/info panels.
     */
    self.hidePanels = function() {
        $("#discussionPanel").removeClass('open');
        $("#infoPanel").removeClass('open');
    }

    /**
     * Opens discussion list.
     */
    self.openDiscussionList = function() {
        backendConnector.discussionList(_visId)
                        .done(function(data) {
            // Update discussion list
            $("#discussionCount").html(data.total);
            if (data.total == 0) $("#noDiscussions").show();
            else $("#noDiscussions").hide();

            var items = [["#incomeDiscussions", data.incomes],
                         ["#expenditureDiscussions", data.expenditures],
                         ["#comparisonDiscussions", data.comparisons]];
            var template = $("#discussionListItemTemplate");

            for (var i = 0; i < 3; i++) {
                var rootEl = $(items[i][0]);
                var discussions = items[i][1];
                if (discussions.length == 0) rootEl.hide();
                else {
                    rootEl.show();
                    var rootUl = rootEl.find("ul");
                    rootUl.empty();
                    for (var j = 0; j < discussions.length; j++) {
                        var newItem = template.clone();
                        var dataItem = _dataItemRegistry[discussions[j][0]];
						if (!dataItem) continue; // This may happen if you delete bubbles which had discussions assigned.
						// We won't include these discussions to the list (arguable decision, I know, but sounds OK to me at this moment). 
                        newItem.find(".titlelink").html(_dataMapper.computeLabel(dataItem));
                        newItem.find(".titlelink").data("item", dataItem);
                        newItem.find(".count").html(discussions[j][1]);
                        newItem.find(".timestamp").html(discussions[j][2]);
                        newItem.show();
                        rootUl.append(newItem);
                    }
                }
            }

            $('#bubbleInfo').hide();
            $('#discussionIndex').show();

            if ( $('#infoPanel').hasClass('open') ) {
                $('#infoPanel').removeClass('open');
            }
            $('#discussionPanel').addClass('open');
        });
    }

};

