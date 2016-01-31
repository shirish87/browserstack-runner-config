'use strict';

var BrowserStack = require('browserstack');
var assert = require('assert');

var BrowserFilter = require('../lib/browserFilter');


var client = BrowserStack.createClient({
  username: process.env.BROWSERSTACK_USERNAME,
  password: process.env.BROWSERSTACK_KEY
});

var browserFilter = new BrowserFilter(client.getBrowsers.bind(client));


function assertEqualBrowsers(b, r, attrs) {
  (attrs ||  [
    'os',
    'os_version',
    'browser',
    (b.device ? 'device' : 'browser_version')
  ]).forEach(function (attr) {
    assert(b[attr] === r[attr]);
  });
}


describe('Quick tests', function () {

  it('resolves API browsers correctly', function (done) {
    client.getBrowsers(function (err, browsers) {
      if (err) {
        return done(err);
      }

      var requests = browsers.length;

      browsers.forEach(function (b) {
        // for desktop -
        // os:os_version browser:browser_version

        // for devices -
        // os:os_version device

        var str = (b.device ?
          [ [ b.os, b.os_version ].join(':'), b.device ].join(' ') :
          [ [ b.os, b.os_version ].join(':'), [ b.browser, b.browser_version ].join(':') ].join(' '));

        // console.log('Lookup:', str);

        browserFilter.findOne(str, function (err, r) {
          if (r) {
            assertEqualBrowsers(b, r);
          }

          if (err || --requests < 1) {
            done && done(err);
            done = null;
          }
        });
      });
    });
  });


  it('works with common names', function (done) {
    var terms = [
      { search: 'chrome 47',      match: { browser: 'chrome', browser_version: '47.0' } },
      { search: 'chrome 47',      match: { browser: 'chrome', browser_version: '47.0' } },
      { search: 'firefox 43',     match: { browser: 'firefox', browser_version: '43.0' } },
      { search: 'safari 9',       match: { browser: 'safari', browser_version: '9.0' } },
      { search: 'ie:11',          match: { browser: 'ie', browser_version: '11.0' } },
      { search: 'opera:20',       match: { browser: 'opera', browser_version: '20.0' } },
      { search: 'kindle',         match: { device: 'Amazon Kindle Fire HD 8.9' } },
      { search: 'iphone 5s',      match: { device: 'iPhone 5S' } },
      { search: 'iphone 6s',      match: { device: 'iPhone 6S' } },
      { search: 'iphone 6s plus', match: { device: 'iPhone 6S Plus' } },
      { search: 'motorola razr',  match: { device: 'Motorola Razr' } },
      { search: 'galaxy s5',      match: { device: 'Samsung Galaxy S5' } },
      { search: 'nexus 5',        match: { device: 'Google Nexus 5' } },
      { search: 'nexus 6',        match: { device: 'Google Nexus 6' } }
    ];

    var requests = terms.length;

    terms.forEach(function (t) {
      browserFilter.findOne(t.search, function (err, r) {
        if (r) {
          Object.keys(t.match).forEach(function (attr) {
            assert(t.match[attr] === r[attr]);
          });
        }

        if (err || --requests < 1) {
          done && done(err);
          done = null;
        }
      });
    });
  });

});
