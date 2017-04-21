"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="jquery" />
const fs = require("fs");
//import * as Nightmare from "nightmare";
const winston = require("winston");
const Nightmare = require("nightmare");
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
    function reflect(promise) {
        return promise.then(function (v) {
            return { data: v, status: "resolved" };
        }, function (e) { return { data: e, status: "rejected" }; });
    }
    Utils.reflect = reflect;
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
    }
    scrape(url, dataScraper, complete, urlScraper, urlComplete) {
        let _self = this;
        winston.info("Opening " + url);
        var nightmare = Nightmare({ show: true, webPreferences: { images: false } });
        var page1 = nightmare
            .goto(url)
            .wait(".OrgResults")
            .evaluate(dataScraper)
            .then(function (data) { complete(data); })
            .catch((err) => { console.log(`error dataScraper: ${err}`); });
        var page2 = nightmare.wait()
            .evaluate(function () { return document.title; })
            .then(function (a, b) {
            console.log(`run2: a:${a} b:${b}`);
            return a;
        });
        var page = Promise.all([page1, page2]).then(() => {
            nightmare.end().then(() => {
                console.log("end");
                return nightmare.end().then();
            });
            return "dataaaa";
        });
        //.end().then(() => {});
        //page = page.end().then(); // no
        //        if (dataScraper){
        //            page = page.evaluate(dataScraper)
        //                       .then(complete);
        //page.run(complete);
        //        }
        //if (urlScraper){
        //    page.evaluate(urlScraper, urlComplete);
        //page = page.end().then();
        //page.end();
        return page;
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
    complete(scraperResult) {
        console.log("data complete");
        this._scraper.addItem(scraperResult);
        /*if (page && this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
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
        }*/
    }
    extractMoreUrls() {
        if (this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0)
                    return null;
                // requires jQuery
                validMoreUrls = "return $(" + this._scraperConfig.moreUrls + ").map(function() {var href = $(this).attr('href');return (href && href.indexOf('#') !== 0 && (includeOffsite || isLocalUrl(href))) ? toFullUrl(href) : undefined; }).toArray();";
                return Function(validMoreUrls);
            }
            else
                return this._scraperConfig.moreUrls;
        }
    }
    completeMoreUrls(moreUrls) {
        if (moreUrls) {
            if (moreUrls.length) {
                winston.info('Found ' + moreUrls.length + ' additional urls to scrape');
                this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
            }
        }
    }
    launchUrls() {
        var _self = this;
        var waiters = [];
        this.urls.forEach(function (url) {
            var waiter = new WebScrapper(new WebPageScraperConfig(), _self._scraperConfig)
                .scrape(url, _self._scraperConfig.scraper, (data) => _self.complete(data), _self.extractMoreUrls, (data) => _self.completeMoreUrls(data));
            waiters.push(waiter);
        });
        //Promise.all(waiters).then(values => console.log(values));
        return Promise.all(waiters.map(Utils.reflect)).then(function (results) {
            console.log(`all: ${JSON.stringify(results)}`);
        });
        //console.log("launchUrls finished")
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
        //this.config.nightmare = new Nightmare();
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
            //this.items.push(item);
            this.items = this.items.concat.apply(item);
    }
    buildLauncher(urls, launcherConfig) {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0) {
            return new WebPageSerialLauncher(validUrls, this, launcherConfig);
        }
        return null;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var firstLauncher = this.buildLauncher(Utils.arrify(this.config.url), new WebPageLauncherConfig());
            if (!firstLauncher)
                return;
            this.launchers.push(firstLauncher);
            var launcher;
            while (launcher = this.launchers.shift()) {
                yield launcher.launchUrls();
            }
            console.log("writing");
            fs.writeFile(this._scraperConfig.outFile, JSON.stringify(this.items));
        });
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
        //nightmare: Nightmare;
        //
        this.moreUrls = "";
        this.maxDepth = 1;
        this.newHashNewPage = true;
        this.scraper = function () {
            var c = [];
            $(".OrgResult").each(function (i, v) {
                var x = {};
                x.contact = {};
                x.name = $(".Name", v).text();
                x.contact.phone = $("a:contains('-')", v).text();
                x.contact.email = $("a:contains('@')", v).text();
                x.contact.website = $("a:contains('http://')", v).text();
                x.contact.address = $(".Address", v).text().trim().replace("Address", "");
                c.push(x);
            });
            return c;
        };
        this.allowRepeatedUrls = false;
        this.ignoreDuplicates = true; // ignore data duplicates
        this.url = "http://www.diocesefwsb.org/Find-a-Parish?Type=Church&Alphabet=C";
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
//# sourceMappingURL=scrape.js.map