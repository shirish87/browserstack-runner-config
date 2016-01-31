'use strict';

var fuzzy = require('fuzzy');


var defaultFilterLimit = 3;


function buildFilterData(browsers) {
  return browsers.reduce(function (prev, browser) {
    var osTerm = [ browser.os, browser.os_version ].join(':');
    var browserTerm = [ browser.browser, browser.browser_version ].join(':');

    if (browser.device) {
      prev.push({
        terms: [
          osTerm,
          browser.device,
          osTerm,
          browser.browser
        ].join(' '),
        browser: browser
      });
    } else {
      prev.push({
        terms: [
          osTerm,
          browserTerm,
          osTerm.replace(':', ' '),
          browserTerm.replace(':', ' ')
        ].join(' '),
        browser: browser
      });
    }

    return prev;
  }, []);
}


function loadFilterData(browsers, fetchBrowsers, callback) {
  if (Array.isArray(browsers) && browsers.length) {
    return callback(null, buildFilterData(browsers));
  }

  if (typeof browsers === 'function') {
    callback = browsers;
  }

  fetchBrowsers(function (err, browsers) {
    if (err || !Array.isArray(browsers) || !browsers.length) {
      return callback(err || new Error('failed to load browsers'));
    }

    callback(null, buildFilterData(browsers));
  });
}


function BrowserFilter(browsers, fetchBrowsers, options) {
  if (typeof browsers === 'function') {
    options = fetchBrowsers;
    fetchBrowsers = browsers;
    browsers = null;
  }

  if (typeof fetchBrowsers !== 'function') {
    throw new Error('invalid argument: fetchBrowsers');
  }

  this._err = null;
  this._data = null;
  this._pendingCallbacks = [];

  this._load(browsers, fetchBrowsers);

  options = options || {};
  options.goodMatchRatio = options.goodMatchRatio || 0.65;
  this._options = options;
}


BrowserFilter.prototype._load = function _load(browsers, fetchBrowsers) {
  this._isLoading = true;

  loadFilterData(browsers, fetchBrowsers, function (err, data) {
    this._isLoading = false;

    this._data = data;
    this._err = err;

    this._resolvePendingCallbacks(err);

  }.bind(this));
};


BrowserFilter.prototype._resolvePendingCallbacks = function _resolvePendingCallbacks(err) {
  var callback;

  do {
    callback = this._pendingCallbacks.shift();

    if (callback) {
      callback(err);
    }

  } while (callback);
};


BrowserFilter.prototype.filter = function filter(str, limit, callback) {
  if (typeof limit === 'function') {
    callback = limit;
  }

  if (!isFinite(limit)) {
    limit = defaultFilterLimit;
  }

  if (typeof str !== 'string' || !str.length) {
    return callback(null, []);
  }

  if (this._isLoading) {
    return this._pendingCallbacks.push(function (err) {
      if (err) {
        return callback(err);
      }

      // retry after filter data has been loaded
      this.filter(str, limit, callback);
    }.bind(this));
  }

  // this._resolvePendingCallbacks(this._err);

  if (this._err || !Array.isArray(this._data)) {
    return callback(this._err || new Error('error filtering browser list'));
  }

  process.nextTick(function () {
    callback(null,
      this._filterResults(fuzzy.filter(str, this._data, {
        extract: function (o) {
          return o.terms;
        }
      }),
      limit
    ));
  }.bind(this));
};


BrowserFilter.prototype.findOne = function findOne(str, callback) {
  this.filter(str, 1, function (err, results) {
    callback(err, (!err && results && results.length) ? results.shift() : null);
  });
};


BrowserFilter.prototype._filterResults = function _filterResults(results, limit) {
  if (!Array.isArray(results) || !results.length || !results[0].score) {
    return [];
  }

  var topScore = results[0].score;
  var goodMatchRatio = this._options.goodMatchRatio;

  return results.filter(function (r) {
    return (r.score / topScore) >= goodMatchRatio;
  }).slice(0, limit).map(function (r) {
    return r.original.browser;
  });
};


module.exports = BrowserFilter;
