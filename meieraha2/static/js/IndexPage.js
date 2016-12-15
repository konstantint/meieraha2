/**
 * Main page class
 * Just do a var p = new Page(baseUrl, "meieraha", "Check this out")
 * followed by p.loadVisualization(...) to initialize everything after document loads.
 */
function Page(baseUrl, disqusShortname, shareText) {
    var self = this;

    function __init__() {
        // Opening and closing the discussion panel
        var body = $('body');

        // Make sure the svg containing the comparison bubbles is always appropriately scaled
        $("#comparisonStage").css({width: $("#budgetStage .zoomcontainer")[0].getBoundingClientRect().width, margin: "0px auto"});
        $(window).resize(function(event) {
            $("#comparisonStage").css({width: $("#budgetStage .zoomcontainer")[0].getBoundingClientRect().width});
        });

        body.on( "click", "#openDiscussionPanel", function(event) {
            self.disqusUtil.openDiscussionList();
        });

        body.on( "click", "#closeDiscussionPanel", function() {
            if ($('#discussionPanel').hasClass('open')) {
                $('#discussionPanel').removeClass('open');
            }
        });

        // Opening and closing the info panel
        body.on("click", "#openInfoPanel", function(event) {
            $('#infoPanel').toggleClass('open');
        });
        body.on("click", "#closeInfoPanel", function() {
            $('#infoPanel').removeClass('open');
        });

        // Opening and closing the comparison panel
        body.on( "click", "#openComparisonPanel", function(event) {
            $('#comparisonPanel').toggleClass('open');
        });
        body.on( "click", "#closeComparisonPanel", function() {
            $('#comparisonPanel').removeClass('open');
        });

        // Opening and closing the share dialogue
        body.on( "click", "#openShareDialogue", function(event) {
            self.saveVisualization();
        });

        body.on( "click", "#closeShareDialogue", function() {
            $( '#shareDialogue' ).removeClass( 'open' );
        });

        // Opening and closing the budget selector
        body.on( 'click', '#toggleBudgetSelector', function() {
            $( '#budgetSelector' ).toggleClass( 'open' );
        });

        // Selecting budget
        body.on( 'click', '#budgetSelector li', function() {
            $( '#budgetSelector' ).toggleClass( 'open' );
            $( '#toggleBudgetSelector' ).html( $( this ).html() + ' <i class="icon icon-down"></i>' );

            // self.loadUrl($(this).data("url")); // This works in general, but unless we use hash-based URL-s,
                                                  // it leaves a wrong URL in the location bar.
            window.location.href = $(this).data("url");
        });

        // Zoom in/out buttons
        body.on( 'click', '#zoomIn', function() { self.visualization.zoomInOut(1.2); });
        body.on( 'click', '#zoomOut', function() { self.visualization.zoomInOut(1/1.2); });

        // Disqus integration
        $( "body" ).on( "click", "#discussionIndex h4", function(event) {
            self.disqusUtil.openDiscussion($(this).data("item"));
        });

        // Opening and closing the language selector
        $('body').on('click', '#toggleLanguageSelector', function() {
            $('#languageSelector').toggleClass('open');
        });

        // Selecting language
        $('body').on('click', '#languageSelector li', function() {
            $('#languageSelector').toggleClass('open');
            $('#toggleLanguageSelector').html('<i class="icon icon-language"></i> ' + $(this).html() + ' <i class="icon icon-down"></i>' );
            self.backend.setLang($(this).data("lang"));
        });

        // BackendConnector instance
        self.backend = BackendConnector;

        // BubbleDisqusUtil instance
        self.disqusUtil = new BubbleDisqusUtil(disqusShortname, self.backend);

        // MeieRahaVisualization instance.
        self.visualization = new MeieRahaVisualization("#budgetStage", "#comparisonStage", "#tooltip", "#revisionSlider", self.disqusUtil);
    }
    __init__();

    /**
     * Loads the visualization and displays it.
     * Parameters:
     *    id:   The id of the visualization
     *    savedStateId:  the saved state id, if we are loading a saved state.
     */
    self.loadVisualization = function(id, savedStateId) {
        self.backend.loadVisualization(id, savedStateId)
            .done(function(data) {
                // Configure DisqusUtil
                self.disqusUtil.setVisualizationParams(id, self.backend.getDisqusPrefixUrl(id));

                // Load visualization data
                self.visualization.loadData(data);
                self.currentVisualizationId = id;

                // If the URL has a parameter "disqus=<thread_id>", we open the corresponding discussion
                var queryParams = {};
                window.location.search.split(/\?|\&/).forEach(function(el) {
                    if (el) {
                        var param = el.split("=");
                        queryParams[param[0]] = decodeURIComponent(param[1]);
                    }
                });
                if (queryParams.disqus !== undefined) self.disqusUtil.openDiscussionByThreadId(queryParams.disqus);
                else if (savedStateId === undefined || savedStateId == '') {
                    // If savedStateId is not given and the metadata requires it, show the info panel
                    if (data.meta.show_info_panel) {
                        $('#infoPanel').addClass('open');
                    }
                }
            });
    }

    self.setLang = function(lang) {
        self.visualization.setLang(lang);
    }

    self.saveVisualization = function() {
        self.disqusUtil.hidePanels();
        self.backend.saveVisualization(self.currentVisualizationId, self.visualization.saveState())
            .done(function(data) {
                $('.sharecontrols input').val(data.share_url);
                var shareUrl = encodeURIComponent(data.share_url);
                $('.sharecontrols .facebook').attr('href', "https://facebook.com/sharer.php?u=" + shareUrl);
                $('.sharecontrols .twitter').attr('href', "https://twitter.com/intent/tweet?url=" + shareUrl + '&text=' + shareText);
                $('.sharecontrols .odnoklassniki').attr('href',
                        "http://www.odnoklassniki.ru/dk?st.cmd=addShare&st._surl=" + shareUrl + "&title=" + shareText);
                $('.sharecontrols .email').attr('href', "mailto:?&subject=" + shareText + "&body=" + shareUrl);
                $( '#shareDialogue' ).toggleClass( 'open' );
            });
    }
}




// ---------------------------------- Optional fluff ---------------------------- //
// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = (window.console = window.console || {});

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());
