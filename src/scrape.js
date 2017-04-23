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
const winston = require("winston");
const settings_1 = require("./settings");
const settings_web_1 = require("./settings.web");
const Nightmare = require("nightmare");
const csv = require("d3-dsv");
const S = require("string");
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
    function flatten(object) {
        return Object.assign({}, ...function _flatten(objectBit, path = '') {
            return [].concat(//concat everything into one level
            ...Object.keys(objectBit).map(//iterate over object
            key => typeof objectBit[key] === 'object' && objectBit[key] !== null ?
                _flatten(objectBit[key], `${path.length ? path + "." : path}${key}`) :
                ({ [`${path.length ? path + "." : path}${key}`]: objectBit[key] }) //append object with it’s path as key
            ));
        }(object));
    }
    Utils.flatten = flatten;
    ;
})(Utils || (Utils = {}));
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
        var thens = [];
        winston.info("Opening " + url);
        var nightmare = Nightmare({ show: false, webPreferences: { images: false } });
        var then = nightmare.goto(url)
            .then(() => {
            if (_self.scraperConfig.injectJQuery) {
                return nightmare.inject("js", "client\\jquery.js")
                    .evaluate(Function("window._pjs$ = jQuery.noConflict(true);"))
                    .inject("js", "client\\pjscrape_client.js")
                    .wait(Function("return window._pjs.ready;"));
            }
            return new Promise((resolve, reject) => resolve(false));
        }).then(() => {
            if (!S(_self.scraperConfig.waitFor).isEmpty())
                return nightmare.wait(_self.scraperConfig.waitFor);
            return new Promise((resolve, reject) => resolve(false));
        }).then(() => {
            if (dataScraper != null)
                return nightmare.evaluate(dataScraper);
            return new Promise((resolve, reject) => resolve(null));
        }).then(function (data) {
            if (data != null)
                complete(data);
            if (urlScraper != null)
                return nightmare.evaluate(urlScraper);
            return new Promise((resolve, reject) => resolve(null));
        }).then((data) => {
            if (data != null)
                urlComplete(data);
            return nightmare.end();
        }).then(() => {
            winston.info("scraper end");
        }).catch((error) => {
            winston.error("ERROR " + error);
        });
        return then;
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
    }
    extractMoreUrls() {
        if (this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth < this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0)
                    return null;
                validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "')";
                return Function(validMoreUrls);
            }
            else
                return this._scraperConfig.moreUrls;
        }
        return null;
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
        var chain = Promise.resolve();
        this.urls.slice(0, 2).forEach((url) => {
            chain = chain.then(() => {
                return new WebScrapper(new settings_1.Settings(), _self._scraperConfig)
                    .scrape(url, _self._scraperConfig.scraper, (data) => _self.complete(data), _self.extractMoreUrls(), (data) => _self.completeMoreUrls(data));
            });
        });
        chain.then(() => {
            winston.info("ending lauchUrls loop");
        }).catch((error) => {
            winston.error("ERROR: " + error);
        });
        return chain;
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
    constructor(config = new settings_web_1.SettingsWeb()) {
        this.launchers = [];
        this.items = [];
        this.config = config;
        this._scraperConfig = new settings_1.Settings();
        this._urlManager = new UrlManager(this._scraperConfig);
    }
    addLauncher(urls, config) {
        var newLauncher = this.buildLauncher(urls, config);
        if (newLauncher)
            this.launchers.push(newLauncher);
    }
    addItem(item) {
        var self = this;
        // check for ignoreDuplicates
        if (item) {
            item = this.validateDataItem(item);
            this.items = this.items.concat(item);
            // apply for flattening items
            this.items = [].concat(this.items);
        }
    }
    validateDataItem(source) {
        var merged = Object.assign({}, this.config.dataTemplate, source);
        merged.contact = Object.assign({}, this.config.dataTemplate.contact, source.contact);
        if (S(merged.name).isEmpty())
            merged.notes += "name not found. ";
        else
            merged.name = S(merged.name).collapseWhitespace().toString();
        if (S(merged.url).isEmpty())
            merged.notes += "url not found. ";
        if (S(merged._type).isEmpty())
            merged.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty())
            merged.notes += "country not found";
        merged.contact.country = S(merged.contact.country).collapseWhitespace().toString();
        merged.contact.phone = S(merged.contact.phone).collapseWhitespace().toString();
        merged.contact.fax = S(merged.contact.fax).collapseWhitespace().toString();
        merged.contact.email = S(merged.contact.email).collapseWhitespace().toString();
        merged.contact.website = S(merged.contact.website).collapseWhitespace().toString();
        merged.contact.address = S(merged.contact.address)
            .lines()
            .map((l) => S(l).collapseWhitespace())
            .filter(i => !S(i).isEmpty())
            .join(", ");
        return merged;
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
            if (this._scraperConfig.format == "json")
                fs.writeFile(this._scraperConfig.outFile, JSON.stringify(this.items));
            if (this._scraperConfig.format == "csv")
                fs.writeFile(this._scraperConfig.outFile, csv.csvFormat(this.items.map(i => Utils.flatten(i)).filter(i => i)));
        });
    }
}
exports.Scraper = Scraper;
//# sourceMappingURL=scrape.js.map