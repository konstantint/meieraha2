/**
 * BubbleTooltip is an utility class for displaying a particularly formatted tooltip div on hover.
 *
 * The constructor takes as input the #id of an absolutely-positioned div with the particular structure that is expected by this tooltip.
 * See templates/includes/tooltip.html
 * Uses JQuery.
 */
function BubbleTooltip(tooltipDiv) {
    var self = this,
        DELAY = 500,                // Delay, in ms, to wait before showing the tooltip after requestShow is invoked.
        _tooltip = $(tooltipDiv),
        _disqusUtil,                // BubbleDisqusUtil, should be set via setDisqusUtil.
        _timer = 0,                 // The setInterval timer used for delayed display of the tooltip
        _showing = false;           // When true, either the tooltip is visible, or is queued to be shown

    function __init__() {
        // The users of the tooltip class will request a hide event when mouse
        // leaves them. However, if the mouse at the same time enters the tooltip,
        // we will cancel the timer so that the tooltip will stay.
        _tooltip.on('mouseenter', function(e) {
            _clearTimer();
        })

        // When the mouse leaves the tooltip, we ourselves invoke the hide timer.
        _tooltip.on('mouseleave', function(e) {
            self.hide();
        })

        _tooltip.find('.discuss').on('click', function(event) {
            self.hideLater();
            if (_disqusUtil !== undefined) _disqusUtil.openDiscussion($(this).data("node").dataItem);
        });
    }
    __init__();

    // Enables the functionality of the '.discuss' button.
    self.setDisqusUtil = function(disqusUtil) {
        _disqusUtil = disqusUtil;
    }

    // Shows the tooltip after DELAY ms.
    // (If the method was previously invoked to show the tooltip, the timer is reset).
    self.showLater = function(bubbleDiv, node) {
        _clearTimer();
        _timer = setTimeout(function() {
            self.show(bubbleDiv, node);
            _timer = 0;
        }, DELAY);
    }

    // Hides the tooltip after DELAY ms
    self.hideLater = function() {
        _clearTimer();
        _timer = setTimeout(function() {
            self.hide();
            _timer = 0;
        }, DELAY);
    }

    // Moves the tooltip div to the position of the given bubble, fills with node data and displays it there.
    // node is the node data object used by BubbleVisualization.
    self.show = function(bubbleDiv, node) {

        // Set values
        if (node !== undefined) {
            // We support two different "modes" for bubble tooltips (and Disqus):
            //   Single-year: this is the "default" mode, it corresponds to the situation
            //                when the revision slider shows different revisions of a single-year budget over the months.
            //                In this case we may show "initial" value (the very first revision) along with "adjusted" (current revision).
            //   Multi-year:  this corresponds to the situation, where the revision slider shows different years.
            //                In this case there is no point in showing the "initial" and "adjusted" values - every revision is
            //                a full revision in its own right.
            //                The multi-year mode is indicated by setting multiyear: true in the metadata of the visualization.

            var singleYear = (node.dataItem.__meta__ === undefined || !node.dataItem.__meta__.multiyear);
            _tooltip.find(".description").html(node.description);
            _tooltip.find(".current .value").html(node.amountText);
            _tooltip.find(".initial .value").html(node.initialAmountText);

            if (node.fillAmountText === undefined) {
                _tooltip.find(".filled").hide();
            }
            else {
                _tooltip.find(".filled").show();
                _tooltip.find(".filled .value").html(node.fillAmountText);
            }

            if (!singleYear || !(node.dataItem.amount instanceof Array) || node.amountText == node.initialAmountText) {
                // Do not show "adjusted [current]" value if no adjustments are recorded or the new value is the same as planned
                // Neither do we show it in multi-year mode.
                _tooltip.find(".current").hide();
            }
            else {
                _tooltip.find(".current").show();
            }

            if (node.url === undefined) {
                _tooltip.find(".url").hide();
            }
            else {
                _tooltip.find(".url").show();
                _tooltip.find(".url a").attr('href', node.url);
            }

            _tooltip.find(".discuss").data("node", node);
        }

        if (bubbleDiv !== undefined) {
            // IE11 does not implement getElementsByClassName for SVG and JQuery will try to use it
            // if we do .find(.center)
            var centerPos = $(bubbleDiv).find('[class*=center]').offset();
            _tooltip.css({left: centerPos.left - _tooltip.outerWidth()/2,
                          top:  centerPos.top  -  _tooltip.outerHeight() - 22});
        }
        _tooltip.fadeIn(200);
    }

    // Hides the tooltip div
    self.hide = function() {
        _clearTimer();
        _tooltip.hide();
    }

    // Clears currently running timer, if relevant
    function _clearTimer() {
        if (_timer) {
            clearTimeout(_timer);
            _timer = 0;
        }
    }



    // ---------- Plugin interface to BubbleDataMapper --------------- //
    self.onCreateNode = function(node, dataItem, dataMapper) {
        // Add information to node that is necessary for displaying tooltip
        node.initialAmount = (dataItem.amount instanceof Array) ? dataItem.amount[0] : dataItem.amount;
        node.initialAmountText = dataMapper.computeValueText(node.initialAmount);
        node.fillAmountText = dataMapper.computeValueText(node.fillAmount);
        node.url = dataMapper.getCorrectRevisionOf(dataItem.url);
        node.description = dataMapper.computeDescription(dataItem);
    }

    self.onReviseNode = function(node, dataMapper) {
        node.fillAmountText = dataMapper.computeValueText(node.fillAmount);
        node.url = dataMapper.getCorrectRevisionOf(node.dataItem.url);
        node.description = dataMapper.computeDescription(node.dataItem);
    }

    self.onCreateBubbles = function(selection, dataMapper) {
        selection.append("circle")      // The circle.center is an invisible element used to located the relative coordinates of the center of the bubble using JQuery
            .attr("class", "center")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", "0");
        selection.on('mouseenter.tooltip', function(d) {
            if(!d.expanded) { self.showLater(this, d); }
        });
        selection.on('mouseleave.tooltip', function(d) {
            self.hideLater();
        });
        selection.on('click.tooltip', function(d) {
            self.hide();
        });
        selection.on('mousedown.tooltip', function(d) {
            self.hide();
        });
    }
}