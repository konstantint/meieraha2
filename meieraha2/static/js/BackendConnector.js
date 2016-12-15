/**
 * Convenience singleton object for proxying requests to the backend.
 */
BackendConnector = {
    baseUrl: null,

    configure: function(baseUrl) {
        this.baseUrl = baseUrl;
    },

    defaultErrorHandler: function(jqXHR, textStatus) {
        alert("Error: " + textStatus);
    },

    getDisqusPrefixUrl: function(id) {
        return this.baseUrl + "/view/" + id;
    },

    loadVisualization: function(id, savedStateId) {
        var url = "/visualization/" + id;
        if (savedStateId !== undefined && savedStateId != "") url = url + "?s=" + savedStateId;
        return $.ajax(url)
                .fail(this.defaultErrorHandler);
    },

    saveVisualization: function(id, state) {
        return $.post("/save_visualization/" + id, JSON.stringify(state))
                .fail(this.defaultErrorHandler);
    },

    reportComment: function(threadId) {
        return $.ajax("/report_comment/" + threadId)
                .fail(this.defaultErrorHandler);
    },

    discussionList: function(visId) {
        return $.ajax("/discussion_list/" + visId)
                .fail(this.defaultErrorHandler);
    },

    setLang: function(lang) {
        window.location.href = "/set_lang/" + lang + "?prev=" + encodeURIComponent(window.location.href);
    }
}

