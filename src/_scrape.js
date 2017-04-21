"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const Nightmare = require("nightmare");
const winston = require("winston");
const md5 = require("md5");
var Utils;
(function (Utils) {
    function isFunction(f) {
        return typeof f === 'function';
    }
    Utils.isFunction = isFunction;
    function isObject(o) {
        return typeof o === 'object';
    }
    Utils.isObject = isObject;
    function funcify(f) {
        return this.isFunction(f) ? f : function () { return f; };
    }
    Utils.funcify = funcify;
    function isArray(a) {
        return Array.isArray(a);
    }
    Utils.isArray = isArray;
    function arrify(a) {
        return this.isArray(a) ? a : a ? [a] : [];
    }
    Utils.arrify = arrify;
    function getKeys(o) {
        var keys = [];
        for (var key in o)
            keys.push(key);
        return keys;
    }
    Utils.getKeys = getKeys;
    function extend(obj) {
        Array.prototype.slice.call(arguments, 1).forEach(function (source) {
            for (var prop in source) {
                try {
                    //recursively merge object properties
                    if (source[prop].constructor == Object) {
                        obj[prop] = this.extend(obj[prop], source[prop]);
                    }
                    else {
                        if (source[prop] !== void 0)
                            obj[prop] = source[prop];
                    }
                }
                catch (e) {
                    // Property in destination object not set; create it and set its value.
                    obj[prop] = source[prop];
                }
            }
        });
    }
    Utils.extend = extend;
    function md5HashFunction(item) {
        return md5(JSON.stringify(item));
    }
    Utils.md5HashFunction = md5HashFunction;
    function idHashFunction(item) {
        return ('id' in item) ? item.id : md5HashFunction(item);
    }
    Utils.idHashFunction = idHashFunction;
})(Utils || (Utils = {}));
//interface IWebPageScraper extends WebPage {
//    waitFor (test: (any)=>boolean, callback: (IWebPageScraper)=>void);
//    evalJs (code: string|Function) :any;
//    resource: ResourceResponse;
//    //state: any;
//}
class WebScrapper {
    /**
     *
     */
    constructor(config, scraperConfig) {
        this.config = config;
        this.scraperConfig = scraperConfig;
        //this.page = create() as IWebPageScraper;
        //this.page.onConsoleMessage = function (msg, line, id) {
        //if (msg.indexOf('___') === 0) return;
        //id = id || 'injected code';
        //if (line) msg += ' (' + id + ' line ' + line + ')';
        //winston.info('CLIENT: ' + msg);
        //}
        //this.page.onAlert = function(msg) { winston.warn('CLIENT: ' + msg); }
        var _self = this;
        _self.page.evalJs = function (code) {
            if (typeof code == "string")
                return _self.page.evaluate(new Function(code));
            else
                return _self.page.evaluate(code);
        };
        _self.page.waitFor = function (test, callback) {
            // check for short-circuit
            if (!_self.page.evaluate(test)) {
                // poll until timeout or success
                var elapsed = 0, timeoutId = window.setInterval(function () {
                    elapsed += _self.config.timeoutInterval;
                    if (_self.page.evaluate(test) || elapsed > _self.config.timeoutLimit) {
                        if (elapsed > _self.config.timeoutLimit) {
                            winston.warn('Timeout after ' + ~~(elapsed / 1000) + ' seconds');
                        }
                        window.clearInterval(timeoutId);
                        //callback(this.page);
                    }
                }, _self.config.timeoutInterval);
            }
            callback(_self.page);
        };
        _self.page.onResourceRequested = function (req) {
            if (_self.scraperConfig.debugRequest || _self.scraperConfig.debug) {
                winston.info('requested: ' + JSON.stringify(req, undefined, 4));
            }
        };
    }
    attachOnResourceReceived(url) {
        var _self = this;
        _self.page.onResourceReceived = function (res) {
            if (_self.scraperConfig.debugResponse || this.scraperConfig.debug) {
                winston.info('received: ' + JSON.stringify(res, undefined, 4));
            }
            if (res.stage == 'end' && res.url == url) {
                _self.page.resource = res;
            }
        };
    }
    injectCommonScripts(state) {
        // load jQuery
        this.page.injectJs('client/jquery.js');
        //this.page.injectJsCode(function() {
        //    window._pjs$ = jQuery.noConflict(true);
        //});
        this.page.evalJs("");
        // load pjscrape client-side code
        this.page.injectJs('client/pjscrape_client.js');
        // attach persistent state
        //this.page.evalJs("_pjs.state = " + JSON.stringify(state) + ";");
        // reset the global jQuery vars
        //if (!this.scraperConfig.noConflict) {
        //    this.page.evaluate(function() {
        //        window.$ = window.jQuery = window._pjs$;
        //    });
        //}
        this.page.evalJs("window.$ = window.jQuery = window._pjs$;");
    }
    injectConfigLoadScripts(loadScripts) {
        if (loadScripts) {
            loadScripts.forEach(function (script) {
                this.page.injectJs(script);
            });
        }
    }
    isValidStatus(url, pageResource) {
        // check for load errors
        if (status != "success") {
            winston.error('Page did not load (status=' + status + '): ' + url);
            return false;
        }
        // look for 4xx or 5xx status codes
        var statusCodeStart = pageResource && String(pageResource.status).charAt(0);
        if (statusCodeStart == '4' || statusCodeStart == '5') {
            if (pageResource.status == 404) {
                winston.error('Page not found: ' + url);
            }
            else {
                winston.error('Page error code ' + pageResource.status + ' on ' + url);
            }
            return false;
        }
        return true;
    }
    scrape(url, scraper, complete) {
        let self = this;
        winston.info("Opening " + url);
        this.attachOnResourceReceived(url);
        // set user defined pageSettings
        //this.page.settings = extend(page.settings, config.pageSettings);
        // run the scrape
        this.page.open(url, function (status) {
            if (!self.isValidStatus(url, self.page.resource)) {
                //complete(self.page);
                self.page.close();
                return;
            }
            winston.info('Scraping ' + url);
            //self.injectCommonScripts(self.page.state);
            self.injectConfigLoadScripts(self.scraperConfig.loadScript);
            // run scraper(s)
            self.page.waitFor(this.scraperConfig.ready, function (page) {
                // run each scraper and send any results to writer
                if (scraper) {
                    // set up callback manager
                    //function checkComplete() {
                    // save state
                    //page.state = page.evaluate(function() {
                    //    return _pjs.state;
                    //});
                    //self.page.state = self.page.evalJs("return _pjs.state;")
                    // run completion callback
                    //complete(page);
                    //}
                    // run all scrapers
                    let validScraper = scraper;
                    if (typeof scraper == 'string') {
                        // selector-only scraper
                        //validScraper = Function("return _pjs.getText('" + scraper + "');");
                        self.page.evalJs("return _pjs.getText('" + scraper + "');");
                    }
                    var data = self.page.evalJs(validScraper);
                    complete(self.page, data);
                    //suite.addItem(self.page.evalJs(validScraper));
                    //checkComplete();
                }
            });
            self.page.close();
        });
    }
}
class UrlManager {
    /**
     *
     */
    constructor(config) {
        this.visitedUrls = [];
        this.config = config;
    }
    tryAddUrl(url) {
        var validUrl = this.config.newHashNewPage ? url.split('#')[0] : url;
        var isValidUrl = (!(this.config.allowRepeatedUrls && url in this.visitedUrls));
        if (isValidUrl)
            this.visitedUrls.push(url);
        return isValidUrl;
    }
    addUrls(urls) {
        var _self = this;
        return urls.filter(function (u) { return _self.tryAddUrl(u); });
    }
}
class WebPageParallelLauncher {
}
class WebPageSerialLauncher {
    constructor(urls, scraper, launcherConfig) {
        this._scraper = scraper;
        this._scraperConfig = scraper.config;
        this.launcherConfig = launcherConfig;
        this.urls = urls;
    }
    complete(scraperResult, page) {
        this._scraper.addItem(scraperResult);
        if (page && this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "');";
            }
            // look for more urls on this page
            var moreUrls = page.evalJs(validMoreUrls);
            if (moreUrls) {
                if (moreUrls.length) {
                    winston.info('Found ' + moreUrls.length + ' additional urls to scrape');
                    this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
                }
            }
        }
    }
    launchUrls() {
        var url;
        for (url in this.urls) {
            new WebScrapper(new WebPageScraperConfig(), this._scraperConfig)
                .scrape(url, this._scraperConfig.scraper, this.complete);
        }
    }
}
class WebPageLauncherConfig {
    constructor(depth, title) {
        this.depth = depth || 0;
        this.title = title || this.defaultTitle(this.depth);
    }
    defaultTitle(depth) {
        return " depth " + (depth) + " _";
    }
    buildChild(title) {
        var nextDepth = this.depth + 1;
        var nextTitle = title || this.title + this.defaultTitle(nextDepth);
        return new WebPageLauncherConfig(nextDepth, nextTitle);
    }
}
class Scraper {
    /**
     *
     */
    constructor(config = new ScraperConfig()) {
        this.launchers = [];
        this.items = [];
        this.config = config;
        this.config.nightmare = new Nightmare();
        this._urlManager = new UrlManager(config);
        this._scraperConfig = new WebPageScraperConfig();
    }
    //addLauncher(launcher: IWebPageLauncher){
    //    this.launchers.push(launcher);
    //}
    addLauncher(urls, config) {
        var newLauncher = this.buildLauncher(urls, config);
        if (newLauncher)
            this.launchers.push(newLauncher);
    }
    addItem(item) {
        // check for ignoreDuplicates
        if (item)
            this.items.push(item);
    }
    buildLauncher(urls, launcherConfig) {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0) {
            return new WebPageSerialLauncher(validUrls, this, launcherConfig);
        }
        return null;
    }
    init() {
        var firstLauncher = this.buildLauncher(Utils.arrify(this.config.url), new WebPageLauncherConfig());
        if (!firstLauncher)
            return;
        this.launchers.push(firstLauncher);
        var launcher;
        while (launcher = this.launchers.shift()) {
            launcher.launchUrls();
        }
        fs.writeFile(this._scraperConfig.outFile, JSON.stringify(this.items));
    }
}
exports.Scraper = Scraper;
class ScraperConfig {
    constructor() {
        this.debugResponse = false;
        this.debugRequest = false;
        this.debug = false;
        //preScrape: boolean;
        this.depth = 0;
        this.maxDepth = 1;
        this.newHashNewPage = true;
        this.allowRepeatedUrls = false;
        this.ignoreDuplicates = true; // ignore data duplicates
        this.url = "http://www.google.com";
    }
}
exports.ScraperConfig = ScraperConfig;
class WebPageScraperConfig {
    constructor() {
        this.delayBetweenRuns = 0;
        this.timeoutInterval = 100;
        this.timeoutLimit = 3000;
        this.format = "json";
        this.logFile = "output.txt";
        this.outFile = "output.json";
    }
}
//# sourceMappingURL=_scrape.js.map