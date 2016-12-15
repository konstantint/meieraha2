/**
 * Utility functions & shims used in the BubbleVisualization code.
 *
 * NB: Some shims add their methods to system classes, which may conflict with
 * other code (but hopefully this is not too probable).
 *
 * Copyright 2015, Konstantin Tretyakov
 */

// http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length == 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};


// IE8 does not have indexOf. http://stackoverflow.com/a/3629211/318964
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/) {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0) ? Math.ceil(from) : Math.floor(from);
    if (from < 0)  from += len;

    for (; from < len; from++) {
      if (from in this && this[from] === elt) return from;
    }
    return -1;
  };
}

// http://jsperf.com/array-extending-push-vs-concat/18
Array.prototype.extend = function(array) {
    this.push.apply(this, array)
}

// Moves the selected D3 element to back. http://stackoverflow.com/a/14426477/318964
/*d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};*/

/**
 * Enables the zoom/pan behaviour for a given subObject (typically a <g>) of a given rootObject (typically a <svg>),
 * consistent with MeieRaha needs.
 * Parameters:
 *    rootObject and affectedSubObject:  instances of d3.select, denoting appropriate objects.
 *    cx and cy     - denote the center of the parent. This is used when the
 *        object has to react to a zoom event dispatched from elsewhere - in this case the display is zoomed
 *        with respect to that centerpoint (and no translation is performed).
 *    zoomDispatch  - an instance of d3.dispatch('zoom') which can be used to link together multiple
 *        zoomable objects. If it is not provided, it is created and accessible via the dispatch field of the
 *        created object.
 *    name          - a string uniquely identifying this zoomUtil
 */
function ZoomUtil(rootObject, affectedSubObject, cx, cy, zoomDispatch) {
    var self = this;

    if (zoomDispatch === undefined) zoomDispatch = d3.dispatch("zoom");
    self.dispatch = zoomDispatch;

    var _name = Math.random().toString(36).substring(2), // http://stackoverflow.com/a/8084248/318964
        _zoom = d3.behavior.zoom()
                    .scaleExtent([0.5, 30])
                    .on("zoom", function() { self.dispatch.zoom(self, d3.event.translate, d3.event.scale); });

    // Zoom handler
    function _onZoom(source, translate, scale) {
        if (source === self) {  // Our own component is being zoomed and panned
            _zoom.translate(translate);
            _zoom.scale(scale);
            affectedSubObject.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
        }
        else {                  // Some other component is being zoomed or panned. We only react by zooming.
            var rescale = scale/_zoom.scale();
            _zoom.scale(scale);
            // We also update the .translate part because want to zoom in / zoom out wrt the center of our viewport
            _zoom.translate([cx + rescale*(_zoom.translate()[0] - cx), cy + rescale*(_zoom.translate()[1] - cy)]);
            affectedSubObject.attr("transform", "translate(" + _zoom.translate() + ")scale(" + scale + ")");
        }
    }

    // Register the zoom handler
    self.dispatch.on("zoom." + _name, _onZoom);
    rootObject.call(_zoom);


    // ZoomIn/ZoomOut functionality simply dispatches a zoom event with appropriate parameters
    // factor indicates by how much current zoom must change, i.e. factor = 1.1 corresponds to "zoom in".
    self.zoomInOut = function(factor) {
        self.dispatch.zoom(null, _zoom.translate(), _zoom.scale()*factor);
    }

    // state save/restore routines
    self.saveState = function() {
        return {scale: _zoom.scale(),
                translate: _zoom.translate() };
    }

    self.restoreState = function(state) {
        self.dispatch.zoom(self, state.translate, state.scale);
    }

    self.reset = function() {
        self.dispatch.zoom(self, [0, 0], 1);
    }
};