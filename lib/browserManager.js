'use strict';

var path = require('path');
var readline = require('readline');

var FileCache = require('./fileCache');
var BrowserFilter = require('./browserFilter');

var browsersDb = path.join(__dirname, 'browsers.json');

var fileCache = new FileCache({
  cacheExpiry: 864e5 // 1 day
});


function getBrowserSource(client) {
  return function fetchBrowsers(callback) {
    fileCache.readData(browsersDb, function (err, browsers) {
      if (browsers && browsers.length) {
        return callback(null, browsers);
      }

      client.getBrowsers(function (err, browsers) {
        if (browsers && browsers.length) {
          return fileCache.saveData(browsersDb, browsers, function (err) {
            callback(err, browsers);
          });
        }

        callback(err, browsers);
      });

    });
  };
}


function ask(question, defaultYes, callback) {
  question += ' ' + (defaultYes ? '(Y/n)' : '(y/N)') + ': ';

  var rl = readline.createInterface(process.stdin, process.stdout);
  rl.question(question, function (answer) {
    var appliedDefault = false;

    if (typeof answer !== 'string' || !answer.match(/^\s*[y|n]\s*$/i)) {
      answer = defaultYes ? 'y' : 'n';
      appliedDefault = true;
    }

    callback(null, (answer.toLowerCase() === 'y'), appliedDefault);
  });
}


function newExitFn(callback) {
  return function exit(exitCode, data) {
    if (typeof callback === 'function') {
      return callback(exit === 1, data);
    }

    process.exit(exitCode);
  };
}


function BrowserManager(client) {
  this._fetchBrowsers = getBrowserSource(client);
}


BrowserManager.prototype.list = function list() {
  console.log('Lists the browsers in your browserstack.json');
};


BrowserManager.prototype.search = function search(str, callback) {
  var exit = newExitFn(callback);

  if (!str || !str.length) {
    console.log('Please enter [device] os:os_version [browser:browser_version]');
    exit(1);
  }

  var browserFilter = new BrowserFilter(this._fetchBrowsers);
  browserFilter.filter(str, 50, function (err, browsers) {
    if (err) {
      console.log('Error: %s', err);
      exit(1);
    }

    if (!browsers || !browsers.length) {
      console.log('Could not find "%s" in the list of browsers provided by BrowserStack.', str);
      exit(1);
    }

    console.log(JSON.stringify(browsers, null, 2));
    exit(0, browsers);
  });
};


BrowserManager.prototype.add = function add(str, callback) {
  // search remote list and save to browserstack.json (if non-conflicting)
  var exit = newExitFn(callback);

  if (!str || !str.length) {
    console.log('Please enter [device] os:os_version [browser:browser_version]');
    exit(1);
  }

  var browserFilter = new BrowserFilter(this._fetchBrowsers);
  browserFilter.findOne(str, function (err, browser) {
    if (err) {
      console.log('Error: %s', err);
      exit(1);
    }

    if (!browser) {
      console.log('Could not find "%s" in the list of browsers provided by BrowserStack.', str);
      exit(1);
    }

    console.log(JSON.stringify(browser, null, 2));
    ask('Add to browserstack.json?', false, function (err, y) {
      console.log(y ? 'Yay!' : 'Nay.');
      exit(0, browser);
    });
  });
};


BrowserManager.prototype.remove = function remove(str) {
  // search local browserstack.json, remove from list, save file
  console.log('Removes the matched browser from your browserstack.json');
};


module.exports = BrowserManager;
