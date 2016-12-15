/**
 * The class encapsulates most of the logic related to the display of bubbles.
 * The only display-related logic in BubbleVisualization is related to movement of the bubbles and display of links.
 *
 * Copyright 2015, Konstantin Tretyakov.
 */
function BubbleDataMapper() {
    var self = this;
    var _colorScale = d3.scale.category20(),
        _tooltip,           // BubbleTooltip instance, must be given via setTooltip
        SIZE_SCALE_FACTOR = 700,
        LANG = '',
        REVISION = 1e9      // Basically means "last revision"
        ;

    /**
     * Traverses data, adding "__parent__" links to all child nodes.
     * We use them to make sure all child nodes are colored the same as the parent.
     */
    self.makeParentLinks = function(dataItem, parent) {
        if (parent !== undefined) {
            dataItem.__parent__ = parent;
        }
        if (dataItem.children !== undefined) {
            dataItem.children.forEach(function(el) { self.makeParentLinks(el, dataItem); });
        }
    }

    /**
     * Traverses data, adding "__meta__" links to all child nodes.
     * At the moment this link is used by the tooltip and disqus to figure out what "revision_mode" is used.
     */
    self.makeMetaLinks = function(data, meta) {
        self.traverseData(data, function(item) {
            item.__meta__ = meta;
        });
    }
    /**
     * If an item has actualFillAmount and/or plannedFillAmount fields,
     * we combine those to create a "fillAmount" field.
     */
    function makeFillAmountField(data, meta) {
        if (meta.revisions === undefined) return;

        // We may specify fillAmount as an atomic value or as a list.
        // Here we convert both representations to a dict {revision_id: value}
        function convertToDict(value) {
            if (value instanceof Array) {
                result = {}
                for (var i = 0; i < value.length; i++) result[meta.revisions[i].id] = value[i];
            }
            else if (typeof value != "object") {
                result = {}
                for (var i = 0; i < meta.revisions.length; i++) result[meta.revisions[i].id] = value[i];
            }
            else result = value;
            return result;
        }

        function processItem(item) {
            if (item.plannedFillAmount !== undefined || item.actualFillAmount !== undefined) {
                if (item.plannedFillAmount === undefined) item.plannedFillAmount = item.actualFillAmount;
                if (item.actualFillAmount === undefined) item.actualFillAmount = item.plannedFillAmount;
                item.fillAmount = convertToDict(item.plannedFillAmount);
                var actualFillAmount = convertToDict(item.actualFillAmount);
                for (var el in actualFillAmount) {
                    if (actualFillAmount.hasOwnProperty(el)) {
                        item.fillAmount[el] = actualFillAmount[el];
                    }
                }
                delete item.plannedFillAmount;
                delete item.actualFillAmount;
            }
        }

        // Process all items
        self.traverseData(data, processItem);
    }


    /**
     * Nearly each value of each object in the data tree may be of one of three forms:
     * - Atomic value (string, int, etc)
     * - List of length < meta.revisions.length
     * - Dict {revision_id: value}
     * This function will leave atomic values as is, and convert all other values to
     *     a list of length == meta.revisions.length with appropriate revision values
     */
    function cleanupRevisions(data, meta) {

        // Main logic for processing a single field.
        function cleanupRevisionedField(name, value) {
            if (name == "children" || name.substr(0,2) == "__") return value;
            if (value instanceof Array) {
                while (value.length < meta.revisions.length) value[value.length] = value[value.length-1];
            }
            else if (typeof value == "object") {
                // Convert to an array of proper length
                result = [];
                for (var i = 0; i < meta.revisions.length; i++) {
                    if (value[meta.revisions[i].id] === undefined) {
                        if (i == 0) {   // Must fill in the first element. Consider "color" a special case
                            if (name == "color") result[i] = "black";
                            else result[i] = 0; // Otherwise we assume it is a numeric value.
                        }
                        else {
                            result[i] = result[i-1];
                        }
                    }
                    else {
                        result[i] = value[meta.revisions[i].id]
                    }
                }
                value = result;
            }
            return value;
        }

        // Apply the "convertRevisionedField" method to all elements of an item
        function processItem(item) {
            for (var el in item) {
                if (item.hasOwnProperty(el)) {
                    item[el] = cleanupRevisionedField(el, item[el]);
                }
            }
        }

        // Process all items
        self.traverseData(data, processItem)
    }

    /**
     * Compute totals for the amount and fillAmount fields.
     * Assumes that the leaf nodes have the values specified either as ints or as lists of equal length.
     */
    function computeAmountSums(data) {
        function addArrays(a, b) {
            if (a === undefined) return b;
            if (b === undefined) return a;
            if (!(a instanceof Array) && !(b instanceof Array)) return a+b;
            if (!(a instanceof Array)) {
                a = b.map(function() { return a; });
            }
            if (!(b instanceof Array)) {
                b = a.map(function() { return b; });
            }
            return a.map(function(el, i){ return el + b[i]; });
        }

        function processItem(item) {
            if (item.children === undefined || item.children.length == 0) return;
            var fields = ['amount', 'fillAmount'];
            for (var fi = 0; fi < fields.length; fi++) {
                var field = fields[fi];
                if (item[field] === undefined) {
                    // Sum the amounts of all children
                    var total = item.children[0][field];
                    for (var i = 1; i < item.children.length; i++) {
                        total = addArrays(total, item.children[i][field]);
                    }
                    item[field] = total;
                }
            }
        }

        self.traverseData(data, processItem);
    }

    /**
     * Estimate the "scaling factor" that will ensure decently sized bubbles.
     * Provide this method with the topmost dataItem *after* prepareData was run.
     *
     * NB: If there are two BubbleVisualizations on one page, you most probably should *not* have each of them compute
     * its own scaling factor! Make sure you share the dataMapper instance and calibrate the scaling factor before calling loadData.
     */
    self.calibrateScalingFactor = function(dataItem) {
        var maxAmount;
        if (dataItem.amount instanceof Array) {
            maxAmount = dataItem.amount[0];
            for (var i = 1; i < dataItem.amount.length; i++)
                if (dataItem.amount[i] > maxAmount) maxAmount = dataItem.amount[i];
        }
        else maxAmount = dataItem.amount;

        SIZE_SCALE_FACTOR = Math.sqrt(maxAmount)*0.010;
    }


    /**
     * Given a value or a list of values, returns either that value, or the
     * value from the list which corresponds to the currently selected REVISION
     */
    self.getCorrectRevisionOf = function(val) {
        if (val === undefined) return undefined;
        if (val instanceof Array) {
            if (REVISION < val.length) return val[REVISION];
            else return val[val.length - 1];
        }
        else return val;
    }

    /**
     * This runs through the tree under the given data item and makes sure it has the properties necessary
     * for the visualization to work.
     */
    self.prepareData = function(rootItem, meta) {
        self.makeParentLinks(rootItem);
        self.makeMetaLinks(rootItem, meta);
        makeFillAmountField(rootItem, meta);
        cleanupRevisions(rootItem, meta);
        computeAmountSums(rootItem);
    }

    /**
     * Sets the language, which is used to extract label texts from dataItems.
     */
    self.setLang = function(newLang) {
        LANG = newLang;
        i18n.setLang(newLang);
    }

    /**
     * Returns the current language
     */
    self.getLang = function() {
        return LANG;
    }

    /**
     * Sets the BubbleTooltip instance that will be used to show tooltips on hover.
     */
    self.setTooltip = function(bubbleTooltip) {
        _tooltip = bubbleTooltip;
    }

    /**
     * Sets the revision number, which is used to extract correct values from multiversioned dataItems.
     */
    self.setRevision = function(newRevision) {
        REVISION = newRevision;
    }

    /**
     * Saves the state of the data mapper for future loading with restoreState
     */
    self.saveState = function() {
        return {lang: LANG, revision: REVISION, sizeScaleFactor: SIZE_SCALE_FACTOR};
    }

    /**
     * Restores the state of the data mapper saved using saveState
     */
    self.restoreState = function(state) {
        //LANG = state.lang;  // Probably the language of a saved visualization should not be restored
        REVISION = state.revision;
        SIZE_SCALE_FACTOR = state.sizeScaleFactor;
    }

    /**
     * Creates a visualization node corresponding to given dataItem.
     */
    self.createNode = function(dataItem) {
        var n = {
            id: dataItem.id,
            radius: self.computeRadius(self.getCorrectRevisionOf(dataItem.amount)),
            color: self.computeColor(dataItem),
            amount: self.getCorrectRevisionOf(dataItem.amount),
            amountText: self.computeValueText(self.getCorrectRevisionOf(dataItem.amount)),
            fillAmount: self.getCorrectRevisionOf(dataItem.fillAmount),
            fillHeight: self.computeFillHeight(dataItem),
            label: self.computeLabel(dataItem),
            style: "",
            dataItem: dataItem
        };
        if (_tooltip !== undefined) _tooltip.onCreateNode(n, dataItem, self);
        return n;
    }

    /**
     * Updates the node's values according to (possibly changed) revision / language
     */
    self.reviseNode = function(node) {
        node.radius = self.computeRadius(self.getCorrectRevisionOf(node.dataItem.amount));
        node.color = self.computeColor(node.dataItem);
        node.amount = self.getCorrectRevisionOf(node.dataItem.amount);
        node.amountText = self.computeValueText(node.amount);
        node.fillAmount = self.getCorrectRevisionOf(node.dataItem.fillAmount);
        node.fillHeight = self.computeFillHeight(node.dataItem);
        node.label = self.computeLabel(node.dataItem);
        node.style = "";
        if (_tooltip !== undefined) _tooltip.onReviseNode(node, self);
    }

    /**
     * Computes the height of a clipped circle that should cover the top part of the bubble
     * Denoting the "unfilled amount". The name is somewhat misleading as it is really the "yetUnfilledHeight".
     */
    self.computeFillHeight = function(dataItem) {
        if (dataItem.fillAmount === undefined) return undefined;
        else {  // We are not doing proper trigonometry here
            var r = self.computeRadius(self.getCorrectRevisionOf(dataItem.amount));
            var margin = (r >= 40) ? 4 : r/10;
            var amt = self.getCorrectRevisionOf(dataItem.amount);
            var fillPct = (amt == 0) ? 0 : self.getCorrectRevisionOf(dataItem.fillAmount) / amt;
            if (fillPct > 1) fillPct = 1;
            if (fillPct < 0) fillPct = 0;
            var result = 2 * (r+margin) * (1 - fillPct);
            return result;
        }
    }

    /**
     * Computes a color for a node correponding to given data item.
     * If the dataItem has a color field, returns the value of that field.
     */
    self.computeColor = function(dataItem) {
        if (dataItem.color !== undefined) return self.getCorrectRevisionOf(dataItem.color);
        var label = (dataItem.__parent__ !== undefined && dataItem.__parent__.__parent__ !== undefined) ?
                                self.getCorrectRevisionOf(dataItem.__parent__.label) :
                                self.getCorrectRevisionOf(dataItem.label);
        var hash = label.hashCode();
        return _colorScale(hash % 20);
    }

    /**
     * Description of the node is shown on the tooltip. It is either the (localized) value of the description attribute or,
     * if the latter is not present, the (localized) value of the label attribute.
     */
    self.computeDescription = function(dataItem) {
        var d = self.getCorrectRevisionOf(self.getLocalizedAttribute(dataItem, 'description'));
        if (d === undefined) d = self.getCorrectRevisionOf(self.getLocalizedAttribute(dataItem, 'label'));
        return d;
    }

    /**
     * Returns obj[attrname_LANG], if it exists, otherwise obj[attrname]
     */
    self.getLocalizedAttribute = function(obj, attrname) {
        var result = obj[attrname + '_' + LANG];
        if (result === undefined) result = obj[attrname];
        return result;
    }

    /**
     * The label of the node is dataItem.label_<lan> field, or dataItem.label if the latter does not match.
     */
    self.computeLabel = function(dataItem) {
        return self.getCorrectRevisionOf(self.getLocalizedAttribute(dataItem, 'label'));
    }

    /**
     * Computes the radius of the nodes corresponding to the given data item
     */
    self.computeRadius = function(amount) {
        return Math.sqrt(amount) / SIZE_SCALE_FACTOR;
    }

    /**
     * Computes the textual representation of the value.
     * "Original" version.
     */
    self._computeValueTextOriginal = function(amount) {
        if (amount < 0) return "-" + self.computeValueText(-amount);
        if (amount === undefined) return undefined;
        if (amount < 10000) return "" + Math.round(amount);
        else if (amount < 10000000) return "" + Math.round(amount/1000) + i18n.get("K");
        else if (amount < 10000000000) return "" + Math.round(amount/1000000) + i18n.get("M");
        else return "" + Math.round(amount/1000000000) + i18n.get("B");
    }

    /**
     * Computes the textual representation of the value.
     * Current ("armenian") version.
     */
    self.computeValueText = function(amount) {
        if (amount < 0) return "-" + self.computeValueText(-amount);
        if (amount === undefined) return undefined;
        if (amount < 1000) return "" + Math.round(amount);
        else if (amount < 1000000) return "" + commaFormat(amount/1000) + i18n.get("K")
        else if (amount < 1000000000) return "" + commaFormat(amount/1000000) + i18n.get("M")
        else return "" + commaFormat(amount/1000000000) + i18n.get("B");
    }
    /**
     * Helper for computeValueText
     */
    function commaFormat(amount) {
        var total = Math.round(amount);
        var rounding = (total >= 1000) ? 1
                     : (total >= 100) ? 10
                     : (total >= 10) ? 100
                     : 1000;
        var rounded = "" + Math.round(amount*rounding)/rounding;
        if (rounded.indexOf(".") >= 0 && i18n.get(".") != ".") {
            rounded = rounded.replace(".", i18n.get("."));
            while (rounded.length < 5) rounded = rounded + "0";
        }
        return rounded;
    }

    /**
     * Computes the font-size for the amount text (inside the circle)
     */
    self.computeAmountTextFontSize = function(node) {
        var fs = node.radius / 50 * 1.85;
        if (fs > 1.85) fs = 1.85;
        return "" + fs + "em";
    }

    /**
     * Computes the font-size for the label (below the circle)
     */
    self.computeLabelFontSize = function(node) {
        var fs = node.radius / 40;
        if (fs > 1) fs = 1;
        if (fs < 0.3) fs = 0.3;
        return "" + fs + "em";
    }

    /**
     * A callable that adds "bubbles" corresponding to the nodes in the selection.
     * Usage: d3.select(...).call(createBubbles)
     */
    self.createBubbles = function(selection) {
        var g = selection.append("g")
            .attr("class", function(d) { return "bubble" + (d.expanded ? " expanded" : ""); }) // The container <g> controls the position of the element
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })

        g.append("circle")                      // The circle.outer is colored, has an outer margin and a drop shadow
            .attr("class", "outer")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", function(d) { var margin = (d.radius >= 40) ? 4 : d.radius/10; return d.radius + margin; })
            .attr("style", function(d) { return "fill:" + d.color + ";" + d.style; });

        g.append("circle")                      // The circle.inner is a white dashed line that is shown for expandable nodes
            .attr("class", function(d) { return (d.dataItem.children === undefined) ? "inner" : "inner expandable"; })
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", function(d) { return d.radius; })

        g.append("text")                        // Text representing the value, positioned in the middle of the bubble
            .attr("class", "amount")
            .attr("y", "0.4em")  // This wouldn't be needed if IE supported dominant-baseline: center
            .attr("style", function(d) { return "font-size: " + self.computeAmountTextFontSize(d); })
            .text(function(d) { return d.amountText; });

        g.append("text")                        // The label is positioned under the bubble
            .attr("class", "label")
            .attr("y", function(d) { return (d.radius >= 40) ? d.radius + 2*4 + 12: d.radius*1.2 + ((d.radius < 12) ? 3.6 : d.radius*12/40); })
            .attr("style", function(d) { return "font-size: " + self.computeLabelFontSize(d); })
            .text(function(d) { return d.label });

        // To demonstrate the "fill" of the bubble, add a clipped circle that covers the top part.
        // This only applies to elements that have the "fillHeight" value.
        var fillCover = g.filter(function(d) { return d.fillHeight !== undefined; });
        fillCover.append("clipPath")
            .attr("id", function(d) { return "cp-" + d.id; })
                .append("rect")
                .attr("height", function(d) { return d.fillHeight; })
                .attr("width", function(d) { return d.radius*2 + 10; })
                .attr("x", function(d) { return -d.radius - 4; })
                .attr("y", function(d) {  var margin = (d.radius >= 40) ? 4 : d.radius/10; return -d.radius - margin - 0.001; });
        fillCover.append("circle")
            .attr("class", "fill-cover")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", function(d) { var margin = (d.radius >= 40) ? 4 : d.radius/10; return d.radius + margin; })
            .attr("style", "fill: white; opacity: 0.5")
            .attr("clip-path", function(d) { return "url(#cp-" + d.id + ")"});

        // When the circle is expanded, a black "handle" appears in the center.
        /*g.append("circle")
            .attr("class", "handle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", function(d) { return (d.radius >= 15) ? 10 : 5; });*/

        if (_tooltip !== undefined) _tooltip.onCreateBubbles(g, self);
    }


    /**
     * Updates the existing bubbles (given as a selection on .bubble) with new data
     */
    self.updateBubbles = function(selection, withTransition) {
        if (withTransition === undefined) withTransition = false;

        selection.attr("class", function(d) { return "bubble" + (d.expanded ? " expanded" : ""); });

        var sel = withTransition ? selection.transition() : selection;
        sel.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })

        sel = selection.selectAll("circle.outer")
            .attr("style", function(d) { return "fill:" + d.color + ";" + d.style; });
        sel = withTransition ? sel.transition() : sel;
        sel.attr("r", function(d) { var margin = (d.radius >= 40) ? 4 : d.radius/10; return d.radius + margin; });


        sel = selection.selectAll("circle.inner")
            .attr("class", function(d) { return (d.dataItem.children === undefined) ? "inner" : "inner expandable"; });
        sel = withTransition ? sel.transition() : sel;
        sel.attr("r", function(d) { return d.radius; });

        selection.selectAll("text.amount")
            .attr("style", function(d) { return "font-size: " + self.computeAmountTextFontSize(d); })
            .text(function(d) { return d.amountText; });

        sel = selection.selectAll("text.label")
              .text(function(d) { return d.label });
        sel = withTransition ? sel.transition() : sel;
        sel.attr("y", function(d) { return (d.radius >= 40) ? d.radius + 2*4 + 10: d.radius*1.2 + ((d.radius < 12) ? 3.6 : d.radius*12/40); })
           .attr("style", function(d) { return "font-size: " + self.computeLabelFontSize(d); });


        sel = selection.selectAll("rect");     // Covering rects
        sel = withTransition ? sel.transition() : sel;
        sel.attr("height", function(d) { return d.fillHeight; })
           .attr("width", function(d) { return d.radius*2 + 10; })
           .attr("x", function(d) { return -d.radius - 4; })
           .attr("y", function(d) {  var margin = (d.radius >= 40) ? 4 : d.radius/10; return -d.radius - margin - 0.001; });

        sel = selection.selectAll("circle.fill-cover");
        sel = withTransition ? sel.transition() : sel;
        sel.attr("r", function(d) { var margin = (d.radius >= 40) ? 4 : d.radius/10; return d.radius + margin; })

        selection.selectAll("circle.handle")
            .attr("r", function(d) { return (d.radius >= 15) ? 10 : 5; });
    }

    /**
     * Utility function for recursively visiting the data tree in postorder, and calling visitor(d) for each data item d.
     */
    self.traverseData = function(root, visitor) {
        if (root.children !== undefined) {
            root.children.forEach(function(el) { self.traverseData(el, visitor); })
        }
        visitor(root);
    }
}
