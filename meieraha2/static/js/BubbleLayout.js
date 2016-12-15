/**
 * Basically a preconfigured force layout along with a couple of additional helper functions.
 *
 * Copyright 2015, Konstantin Tretyakov
 */
d3.layout.bubble = function() {

    // Creates a properly tuned force layout
    function createForceLayout() {
        var SLACK = 30;
        var layout = d3.layout.force()
                .charge(function(d) {
                    return d.expanded ? 0 : d.radius * -30;
                })
                .gravity(0.2)
                .linkStrength(0.1)
                .linkDistance(function(d) {
                    return d.target.radius;
                 });
        return layout;
    }

    var _layout = createForceLayout();

    // ------------- The following are helper functions --------------
    /**
     * Initialize node positions in a reasonable manner. Modifies the provided nodes array in place.
     */
    _layout.initializePositions = function(nodes) {
        _layout.performOrderedLayout(nodes);    // First do an orderly layout
        _layout.performForceLayout(nodes);      // .. and then force-collapse it to look somewhat "rounder"
    }

    /**
     * Uses a force layout to reposition nodes into more "convenient" positions without animations.
     */
    _layout.performForceLayout = function(nodes) {
        var layout = createForceLayout().nodes(nodes).size(_layout.size());
        layout.gravity(0.2);
        layout.charge(function(d) {
                return d.expanded ? 0 : d.radius * -30;
            });
        layout.start();
        layout.alpha(0.5);
        for (var i = 0; i < 200; i++) layout.tick(); // 200 iterations seems to be enough
        layout.stop();
    }

    /**
     * Lays nodes out in ordered rows.
     */
    _layout.performOrderedLayout = function(nodes) {

        // Layout settings
		var HORIZONTAL_GUTTER = 30,
		    VERTICAL_GUTTER = 30;
        var size = _layout.size();

        // Layouter state
		var curX = size[0] + 1,  // Start at the end of the row.
		    curY = 0,       // Middle of the current row
		    nextRowTop = 0; // Top of the next row

		function putNode(node) {
		    if (curX + node.radius * 2 > size[0]) { // The circle would not fit, start a new row
		        curY = nextRowTop + node.radius;
		        nextRowTop = curY + node.radius + VERTICAL_GUTTER;
		        curX = 0;
		    }

		    node.x = curX + node.radius;
		    node.y = curY;
		    curX += 2*node.radius + HORIZONTAL_GUTTER;
		}

        nodes.sort(function(a, b) { return b.radius - a.radius; });
        nodes.forEach(putNode);
	}

    /**
     * Given a parent node with known coordinates and newly created child nodes,
     * positions the child nodes initially along the border of the parent.
     */
    _layout.positionChildNodes = function(parent, children) {
        var n = children.length;
        var pi2n = Math.PI*2/n;
        for (var i = 0; i < n; i++) {
            children[i].x = parent.x + parent.radius * Math.cos(pi2n*i);
            children[i].y = parent.y + parent.radius * Math.sin(pi2n*i);
        }
    }

	return _layout;
}

