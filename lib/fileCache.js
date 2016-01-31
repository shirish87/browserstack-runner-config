'use strict';

var fs = require('fs');


function FileCache(options) {
	options = options || {};
  options.cacheExpiry = options.cacheExpiry || 0;
  this._options = options;
}


FileCache.prototype.readData = function readData(filePath, callback) {
  var cacheExpiry = this._options.cacheExpiry;
  var stat;

  try {
    stat = fs.lstatSync(filePath);
  } catch (e) {
    // file not found
  }

  if (stat && stat.isFile() && (cacheExpiry < 1 || new Date().getTime() - stat.mtime.getTime() < cacheExpiry)) {
    return fs.readFile(filePath, 'utf8', function (err, data) {
      if (data) {
        try {
          return callback(null, JSON.parse(data));
        } catch (e) {}
      }

      callback(err, null);
    });
  }

  callback(null, null);
};


FileCache.prototype.saveData = function saveData(filePath, data, callback) {
  fs.writeFile(filePath, JSON.stringify(data), 'utf8', callback);
};


module.exports = FileCache;
