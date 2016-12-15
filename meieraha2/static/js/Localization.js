/**
 * Javascript localization
 *
 * NB: There is currently only one place where this is used, namely translation of "M"/"K"/"B" suffixes
 *     of large numbers. Because of that, the solution here is minimalistic, not too "generic", and is separate
 *     from the Python localization (provided in the .po files).
 *
 * If more localization is desired later, we might consider
 *    a. Using a proper JS localization lib (e.g. http://www.localeplanet.com/) along with
 *      proper conversion of project-specific .po files for javascript use.
 *    b. Simply implementing a custom po converter and keeping javascript-translatable strings in the
 *      project-centric PO file (perhaps labeling those strings somehow).
 *
 * Copyright 2015, Konstantin Tretyakov
 */

var __translations__ = {
    '': {
        'K': 'K',
        'M': 'M',
        'B': 'B',
        '.': '.'
    },
    'hy': {
        'K': 'հազ',
        'M': 'մլն',
        'B': 'մլրդ',
        '.': ','
    },
    'et': {
        '.': ','
    }
};

function I18NManager() {
    var self = this;
    var currentPO = __translations__[''];

    self.setLang = function(lang) {
        if (__translations__[lang] === undefined) currentPO = __translations__[''];
        else currentPO = __translations__[lang];
        for (var w in __translations__['']) {
            if (currentPO[w] === undefined) currentPO[w] = __translations__[''][w];
        }
    }

    self.get = function(word) {
        return (currentPO[word] === undefined) ? word : currentPO[word];
    }
}

var i18n = new I18NManager();