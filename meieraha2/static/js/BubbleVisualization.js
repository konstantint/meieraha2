/**
 * The BubbleVisualization class maintains the hierarchical budget visualization within a <svg> element.
 *
 * Constructor parameters:
 *    rootElement       - An existing <g> element (or its #id). The element is cleared on creation.
 *    dataMapper        - An instance of a BubbleDataMapper object. May be shared among several visualization panels
 *                        (e.g. to maintain language / scale consistency). If unspecified, it is created.
 *                        the .dataMapper property of the created object references it.
 *    w, h              - Dimensions of the usable area for laying out bubbles.
 *                        If they are not specified, they are read from the rootElement's data-width and data-height attributes.
 * Copyright 2015, Konstantin Tretyakov
 */
function BubbleVisualization(rootElement, dataMapper, w, h) {
    var self = this;
    // ---------------------- Private vars ---------------------- //
    var _container,     // := d3.select(rootElement), the root <g> element containing the bubbles
        _bubbles,       // Last valid selection of _container.selectAll(".bubble")
        _links,         // Last valid selection of _container.selectAll(".link")
        _layout = d3.layout.bubble(),               // The layout manager
        _drag           // Drag behaviour for nodes
        ;

    // ---------------------- Private methods ---------------------- //
    // Constructor
    function __init__() {
        _container = typeof rootElement == 'string' ? d3.select(rootElement) : rootElement;
        if (w === undefined) w = parseInt(_container.attr("data-width"));
        if (h === undefined) h = parseInt(_container.attr("data-height"));
        _layout.size([w, h]);

        // Create the dataMapper instance
        if (dataMapper === undefined) dataMapper = new BubbleDataMapper();
        self.dataMapper = dataMapper;

        _drag = _layout.drag()
            .on("dragstart", _onDragStart)
            .on("dragend", _onDragEnd);

        // Expose some private variables to outside (this allows to access them but you can't rewrite to a new value)
        self.layout = _layout;
    }
    __init__();  // Invoke the constructor right here.

    // Drag event handlers
    function _onDragStart(d) {
        d3.event.sourceEvent.stopPropagation();     // Important. Otherwise zoom behaviour will be catching this event as well
        d3.select(this).classed("dragging", true);
        d.fixed = true;
    }

    function _onDragEnd(d) {
        d3.event.sourceEvent.stopPropagation();     // Otherwise reacts to "click" event as well here
        d3.select(this).classed("dragging", false);
        if (d.x > w || d.x < 0 || d.y > h || d.y < 0) d.fixed = false;
    }

    // ---------------------- Public methods ---------------------- //
    /**
     * Initializes the visualization with provided dataset.
     * The dataset must have been "prepared" using dataMapper.prepareData before invoking this.
     *
     * The nodes parameter, if specified, provides the set of positioned/laid-out nodes.
     * If it is not provided, nodes are initialized from scratch.
     *
     * If noRootNode is set to true, the visualization ignores the root node and initializes the
     * layout from a set of unconnected bubbles that are the children of the root.
     */
    self.loadData = function(data, nodes, links, noRootNode) {
        self.data = data;

        if (nodes === undefined) {
            if (noRootNode === undefined || noRootNode == false)
                nodes = [self.dataMapper.createNode(data)];
            else
                nodes = data.children.map(self.dataMapper.createNode);

            _layout.initializePositions(nodes);
        }
        if (links === undefined) {
            links = []
        }

        // Clear the container
        _container.selectAll("*").remove();
        _bubbles = _container.selectAll(".bubble");    // Those are the (yet nonexistent) bubble nodes.
        _links = _container.selectAll(".link");

        self.updateNodes(nodes, links);
    }

    /**
     * Returns an object that can represents the current visualization state.
     * When this object is passed to restoreState the state of the visualization is restored.
     */
    self.saveState = function() {
        function cloneData(root) {
            var result = $.extend({}, root);
            delete(result.__parent__);  // TODO? Here we clean up the work done by DataMapper, which makes for some unnecessary coupling.
            delete(result.__meta__);
            if (root.children !== undefined) result.children = root.children.map(cloneData);
            return result;
        }
        return {
            data: cloneData(self.data),
            nodes: self.nodes.map(function(n) {
                    return { id: n.id,
                             expanded: n.expanded,
                             fixed: n.fixed,
                             x: n.x,
                             y: n.y }
                }),
            links: self.links.map(function(ln) {
                    return { sourceId: ln.source.id,
                             targetId: ln.target.id
                           }
                }),
            dataMapper: self.dataMapper.saveState()
        }
    }

    /**
     * Restores the visualization to given state (obtained using saveState)
     * Note: the method makes inplace modifications to the provided state object,
     * hence the state object is not really usable after you pass it here.
     */
    self.restoreState = function(state) {
        self.data = state.data;
        self.dataMapper.restoreState(state.dataMapper);
        self.dataMapper.makeParentLinks(self.data);

        // Restore full node data
        // First index dataItems by their id for convenience
        var idToDataItem = {};
        self.dataMapper.traverseData(self.data, function(el) {
            idToDataItem[el.id] = el;
        });

        // Now recover node visuals from dataitems
        var idToNode = {}
        state.nodes.forEach(function(n) {
            var nn = self.dataMapper.createNode(idToDataItem[n.id]);
            for (var attr in nn) n[attr] = nn[attr];
            idToNode[n.id] = n;
        });

        // Finally, Add "children" record to expanded nodes
        state.nodes.forEach(function(n) {
            if (n.expanded) {
                n.children = n.dataItem.children.map(function(d) { return idToNode[d.id]; });
            }
        });

        // Load links
        var links = state.links.map(function(ln) {
            return {source: idToNode[ln.sourceId], target: idToNode[ln.targetId]};
        });

        // Reset display
        _container.selectAll("*").remove();
        _bubbles = _container.selectAll(".bubble");    // Those are the (yet nonexistent) bubble nodes.
        _links = _container.selectAll(".link");

        // Ready, update info
        self.updateNodes(state.nodes, links);
    }

    /**
     * Every time we change visualization nodes, we have to call this function which will handle all the chores to update the bubbles.
     * withTransition is an optional boolean. If it is true, the nodes are updated with a transition effect.
     */
    self.updateNodes = function(nodes, links, withTransition) {
        if (withTransition === undefined) withTransition = false;
        self.nodes = nodes;
        self.links = links;
        _layout.nodes(nodes);
        _layout.links(links);

        var b = _bubbles.data(nodes, function(d) { return d.id; });
        b.exit().remove();
        b.enter().call(self.dataMapper.createBubbles);
        self.dataMapper.updateBubbles(b, withTransition);

        _bubbles = _container.selectAll(".bubble");
        _bubbles.call(_drag);

        var ln = _links.data(links);
        ln.exit().remove()
        ln.enter().insert("line", ".bubble").attr("class", "link");

        _links = _container.selectAll(".link");

        function _onTick() {
            _bubbles.attr("transform", function(d) { return "translate(" + d.x + "," + d.y +")"; });
            _links.attr("x1", function(d) { return d.source.x; })
                  .attr("y1", function(d) { return d.source.y; })
                  .attr("x2", function(d) { return d.target.x; })
                  .attr("y2", function(d) { return d.target.y; });
        }
        _onTick();  // Update positions of existing nodes

        // Restart layout loop
        _layout.on("tick", _onTick);
        _layout.start();
        _layout.stop(); // Prevent bubbles from moving right after creation

        _bubbles.on("click", function(d) {
            if (d3.event.defaultPrevented) return; // Otherwise click conflicts with dragend: http://stackoverflow.com/a/19077477/318964
            if (d.expanded) self.collapseNode.call(this, d);
            else self.expandNode.call(this, d);
        });
        _bubbles.on("dblclick", function(d) { d.fixed = false; });
    }

    /**
     * Expands the given node in the visualization.
     */
    self.expandNode = function(node) {
        if (node.dataItem.children === undefined || node.dataItem.children.length == 0) return;

        // Mark the node as expanded
        var el = d3.select(this);
        el.classed("expanded", true);
        node.expanded = true;

        // Move the SVG element back in the z-order (kinda optional, but nice)
        //el.moveToBack();

        // Add child nodes
        var newNodes = node.dataItem.children.map(self.dataMapper.createNode);
        _layout.positionChildNodes(node, newNodes);
        node.children = newNodes;
        self.nodes.extend(newNodes);

        // Add links, unless we are expanding the root node which does not need to show links to children
        if (node.dataItem.__parent__ !== undefined)
            self.links.extend(newNodes.map(function(n) { return {source: node, target: n}; }));

        self.updateNodes(self.nodes, self.links);

        // Refresh layout
        _layout.start();
    }

    /**
     * Contracts the given node in the visualization.
     */
    self.collapseNode = function(node) {
        // Remove the subtree of all child nodes and their links from the self.nodes and self.links arrays
        function removeNode(node, childrenOnly) {
            var numChildren = (node.children !== undefined) ? node.children.length : 0;
            if (node.children !== undefined) node.children.forEach(function(n) { removeNode(n, false); });
            delete node.children;

            // Remove all the links from self.links array with source == node
            // Because we always add links in groups, we can do this by finding the first match
            // and splicing out numChildren in a row
            i = 0;
            while (i < self.links.length && self.links[i].source != node) i++;
            if (i < self.links.length) self.links.splice(i, numChildren);

            // Now delete the node from self.nodes array
            if (childrenOnly != true) {
                var i = self.nodes.indexOf(node);
                self.nodes.splice(i, 1);
            }
        }

        removeNode(node, true);
        self.updateNodes(self.nodes, self.links);

        // Restore older node
        var el = d3.select(this);
        el.classed("expanded", false);
        node.expanded = false;
        node.fixed = false;

        // Refresh layout
        _layout.start();
    }
}