'use strict';

var BrowserStack = require('browserstack');
var BrowserManager = require('./lib/browserManager');


var client = BrowserStack.createClient({
  username: process.env.BROWSERSTACK_USERNAME,
  password: process.env.BROWSERSTACK_KEY
});

var browserManager = new BrowserManager(client);

var args = process.argv.slice(2);
var cmdSwitch = args.shift();
var argStr = args.join(' ').trim();


switch (cmdSwitch) {
  case '--list':
  case '-l':
    browserManager.list();
    break;

  case '--search':
  case '-s':
    browserManager.search(argStr);
    break;

  case '--add':
  case '-a':
    // for desktop -
    // os:os_version browser:browser_version

    // for devices -
    // os:os_version device

    browserManager.add(argStr);
    break;

  case '--delete':
  case '-d':
    browserManager.remove(argStr);
    break;
}
