/**
 * A "MeieRaha" visualization class
 *
 * Constructor parameters:
 *   svgBudgetStage, svgComparisonStage: selectable ids of the two <svg> elements for displaying the main screen and the "comparison bubbles".
 *               svgBudgetStage should contain two <g> elements with ids "#leftPane" and "#rightPane".
 *               svgComparisonStage should contain a <g> element sith id "#comparisonPane".
 *               Both svg elements should also contain a <g class="zoomcontainer"> which defines the zoomable/pannable area.
 *               Both svg elements *must* have a viewBox specified. To ensure similar scale on the two stages make sure the viewBox/size ratios of the two
 *               elements are the same.
 *  divTooltip: selectable id of a tooltip component suitable for BubbleTooltip.
 *  divRevisionSlider:  selectable id of a div that will contain a noUISlider for selecting revisions.
 *  disqusUtil:         Instance of BubbleDisqusUtil used to enable commenting functionality.
 *  commentReportUrl:   The URL used for reporting comments.
 * Copyright 2015, Konstantin Tretyakov.
 *
 */
function MeieRahaVisualization(svgBudgetStage, svgComparisonStage, divTooltip, divRevisionSlider, disqusUtil) {
    var self = this;
    // ---------------------- Private vars ---------------------- //
    var _leftPane,                  // BubbleVisualization instances corresponding to the three panes.
        _rightPane,
        _comparisonPane,
        _zuBudget, _zuComparison,   // ZoomUtils managing zoom for the two SVG elements.
        _tooltip,                   // Div for showing the tooltip
        _revisionSlider             // Slider for selecting revisions
        ;

    // ---------------------- Private methods ---------------------- //
    // Constructor
    function __init__() {
        var _budget = typeof svgBudgetStage == "string" ? d3.select(svgBudgetStage) : svgBudgetStage,
            _comparison = typeof svgBudgetStage == "string" ? d3.select(svgComparisonStage) : svgComparisonStage;

        // Initialize the three bubblevisualizations, making sure they all use the same dataMapper instance.
        _leftPane = new BubbleVisualization(_budget.select("#leftPane"));
        _rightPane = new BubbleVisualization(_budget.select("#rightPane"), _leftPane.dataMapper);
        _comparisonPane = new BubbleVisualization(_comparison.select("#comparisonPane"), _leftPane.dataMapper);

        // Configure DisqusUtil
        if (disqusUtil !== undefined) disqusUtil.setDataMapper(_leftPane.dataMapper);

        // Initialize tooltip component
        _tooltip = new BubbleTooltip(divTooltip);
        _tooltip.setDisqusUtil(disqusUtil);
        _leftPane.dataMapper.setTooltip(_tooltip);

        // Set up zoom behaviour, binding main stage with comparison.
        // ZoomUtil needs to know the coordinates of the center point of the stage,
        // We read this out from the viewBox parameter.
        var budgetDims = _budget.attr("viewBox").split(" ");
        var comparisonDims = _comparison.attr("viewBox").split(" ");
        _zuBudget = new ZoomUtil(_budget, _budget.select(".zoomcontainer"), parseInt(budgetDims[2])/2, parseInt(budgetDims[3])/2);
        _zuComparison = new ZoomUtil(_comparison, _comparison.select(".zoomcontainer"),
                                        parseInt(comparisonDims[2])/2, parseInt(comparisonDims[3])/2,
                                        _zuBudget.dispatch);
        _revisionSlider = $(divRevisionSlider);

        // Expose some fields to public without reassignment right
        self.leftPane = _leftPane;
        self.rightPane = _rightPane;
        self.comparisonPane = _comparisonPane;
    };
    __init__();  // Invoke the constructor right here.


    // ---------------------- Public methods ---------------------- //
    // Sets the language of the visualization
    self.setLang = function(newLang) {
        _leftPane.dataMapper.setLang(newLang);
    }

    /**
     * Loads the data and creates the visualization.
     * Data may be either a usual visualization data, or a "saved state" of a previously saved visualization.
     */
    self.loadData = function(data) {
        if (data.type == 'state') {
            // We are loading a saved state
            self.restoreState(data);

            // Update disqus registry
            if (disqusUtil !== undefined) {
                disqusUtil.prepareData(_leftPane.data, 'left');
                disqusUtil.prepareData(_rightPane.data, 'right');
                disqusUtil.prepareData(_comparisonPane.data, 'comparison');
            }
        }
        else {
            // Before we may load the data we must invoke prepareData first.
            _leftPane.dataMapper.prepareData(data.left, data.meta);
            _rightPane.dataMapper.prepareData(data.right, data.meta);
            _comparisonPane.dataMapper.prepareData(data.comparison, data.meta);

            // .. and calibrate the scaling factor so that bubbles have decent size.
            _leftPane.dataMapper.calibrateScalingFactor(data.left);

            // We also need to prepare data with DisqusUtil.
            if (disqusUtil !== undefined) {
                disqusUtil.prepareData(data.left, 'left');
                disqusUtil.prepareData(data.right, 'right');
                disqusUtil.prepareData(data.comparison, 'comparison');
            }

            // Now we can load the data and display the bubbles.
            _leftPane.loadData(data.left);
            _rightPane.loadData(data.right);
            _comparisonPane.loadData(data.comparison, undefined, undefined, true);

            // With comparison pane we do a small hack: we re-layout the nodes using ordered layout, and mark all of them as fixed
            var n = _comparisonPane.nodes;
            _comparisonPane.layout.performOrderedLayout(n);
            n.forEach(function(n) { n.fixed = true; delete(n['px']); delete(n['py']); });
            _comparisonPane.updateNodes(n, []);

            // Set up revision slider
            configureRevisionSlider(data.meta.revisions,
                                    (data.meta.revisions) ? data.meta.revisions.length - 1 : 0,
                                     _leftPane.dataMapper);

            // Reset zoom & hide the comparison panel
            _zuBudget.reset();
            _zuComparison.reset();
            $('#comparisonPanel').removeClass('open');

            // Save the metadata - this needs to be used in "saveState".
            self.meta = data.meta;
        }
    }

    /**
     * Configures revision slider
     */
    function configureRevisionSlider(revisions, currentRevisionIdx, dataMapper) {
        if (revisions === undefined) _revisionSlider.parent().hide();
        else {
            _revisionSlider.empty();
            var revisionNames = revisions.map(function(r) {
                return dataMapper.getLocalizedAttribute(r, 'label');
            });

            if (currentRevisionIdx >= revisions.length) currentRevisionIdx = revisions.length - 1;
            _revisionSlider.noUiSlider({
                start: [ currentRevisionIdx ],
                connect: 'lower',
                step: 1,
                range: {
                    'min': [ 0 ],
                    'max': [ revisionNames.length-1 ]
                }
            }, true).on({
                slide: function(){
                    var idx = $( this ).val() | 0;
                    $( '#revisionTip' ).html(revisionNames[idx]);
                    self.setRevision(idx);
                }
            });

            $( '.noUi-origin' ).append( '<div class="noUi-tooltip" id="revisionTip">' + revisionNames[ currentRevisionIdx ] + '</div>' );

            self.setRevision(currentRevisionIdx);

            _revisionSlider.parent().show();
        }
    }

    /**
     * Changes the current revision index, updates all panes appropriately
     */
    self.setRevision = function(newRevision) {
        _leftPane.dataMapper.setRevision(newRevision);
        // Update nodes in both panes
        _leftPane.nodes.forEach(_leftPane.dataMapper.reviseNode);
        _rightPane.nodes.forEach(_rightPane.dataMapper.reviseNode);
        _leftPane.updateNodes(_leftPane.nodes, _leftPane.links, true);
        _rightPane.updateNodes(_rightPane.nodes, _rightPane.links, true);

        // Update disqus panel
        if (disqusUtil !== undefined) disqusUtil.updateDisplay();
    }

    /**
     * Returns a saved state object, that can be used to then restore the visualization
     * using restoreState.
     */
    self.saveState = function() {
        return {
            type: 'state',
            timestamp: (new Date()).getTime(),
            meta: self.meta,
            left: _leftPane.saveState(),
            right: _rightPane.saveState(),
            comparison: _comparisonPane.saveState(),
            zoom: {
                budget: _zuBudget.saveState(),
                comparison: _zuComparison.saveState()
            },
            visibility: {
                comparison: $("#comparisonPanel").hasClass('open')
            }
        }
    }

    /**
     * Restores the state of the visualization save using saveState.
     * NB: The provided state object gets garbled.
     */
    self.restoreState = function(state) {
        _leftPane.restoreState(state.left);
        _rightPane.restoreState(state.right);
        _comparisonPane.restoreState(state.comparison);
        _zuComparison.restoreState(state.zoom.comparison);
        _zuBudget.restoreState(state.zoom.budget);
        configureRevisionSlider(state.meta.revisions, state.left.dataMapper.revision, _leftPane.dataMapper);
        if (state.visibility.comparison != $('#comparisonPanel').hasClass('open')) {
            $('#comparisonPanel').toggleClass('open');
        }
        self.meta = state.meta;
    }

    /**
     * See ZoomUtil.zoomInOut
     */
    self.zoomInOut = function(factor) {
        _zuBudget.zoomInOut(factor);
    }

}