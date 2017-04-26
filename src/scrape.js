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
const fs = require("fs");
const winston = require("winston");
const settings_1 = require("./settings");
const settings_web_1 = require("./settings.web");
const util_1 = require("./util");
const Nightmare = require("nightmare");
const csv = require("d3-dsv");
const S = require("string");
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
        winston.debug("Opening " + url);
        var nightmare = Nightmare({ show: false, webPreferences: { images: false } });
        var item = null;
        function createOrUpdateItemNotes(notes) {
            if (item != null)
                if (item.notes === undefined)
                    item.notes = notes;
                else
                    item.notes += notes;
            else
                item = { url: url, notes: notes };
        }
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
            item = data;
            //if (data != null)
            //    complete(data);
            if (urlScraper != null)
                return nightmare.evaluate(urlScraper);
            return new Promise((resolve, reject) => resolve(null));
        }).then((data) => {
            if (data != null) {
                urlComplete(data);
                createOrUpdateItemNotes("INDEX page. ");
            }
            return nightmare.end();
        }).then(() => {
            winston.debug("scraper end");
        }).catch((error) => {
            winston.error(error);
            createOrUpdateItemNotes(`${error} `);
        }).then(() => {
            if (item != null)
                complete(item);
        }).catch((error) => {
            winston.error(`${error}`);
        });
        return then;
    }
}
class WebPageLauncher {
    constructor(urls, scraper, launcherConfig) {
        this._scraper = scraper;
        this._scraperConfig = scraper.settingsWeb;
        this.launcherConfig = launcherConfig;
        this.urls = urls;
    }
    completeScraper(scraperResult) {
        winston.debug("data complete");
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
                winston.debug('Found ' + moreUrls.length + ' additional urls to scrape');
                this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
            }
        }
    }
    launchUrls() {
        var _self = this;
        var chain = Promise.resolve();
        this.urls.forEach((url) => {
            chain = chain.then(() => {
                return new WebScrapper(new settings_1.Settings(), _self._scraperConfig)
                    .scrape(url, _self._scraperConfig.scraper, (data) => _self.completeScraper(data), _self.extractMoreUrls(), (data) => _self.completeMoreUrls(data));
            });
        });
        chain.then(() => {
            winston.debug("ending lauchUrls loop");
        }).catch((error) => {
            winston.error("ERROR: " + error);
        });
        return chain;
    }
}
class WebPageLauncherSettings {
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
        return new WebPageLauncherSettings(nextDepth, nextTitle);
    }
}
class Scraper {
    /**
     *
     */
    constructor(settingsWeb = new settings_web_1.SettingsWeb()) {
        this.launchers = [];
        this.items = [];
        this.settingsWeb = settingsWeb;
        this.settings = new settings_1.Settings();
        this._urlManager = new util_1.UrlManager(this.settings);
    }
    addLauncher(urls, launcherSettings) {
        var newLauncher = this.buildLauncher(urls, launcherSettings);
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
    collapse(text) {
        return S(text.replace(new RegExp(",", 'g'), " ")).collapseWhitespace().toString();
    }
    validateDataItem(source) {
        var merged = Object.assign({}, this.settingsWeb.dataTemplate, source);
        merged.contact = Object.assign({}, this.settingsWeb.dataTemplate.contact, source.contact);
        if (S(merged.name).isEmpty())
            merged.notes += "name not found. ";
        else
            merged.name = this.collapse(merged.name);
        if (S(merged.url).isEmpty())
            merged.notes += "url not found. ";
        if (S(merged._type).isEmpty())
            merged.notes += "type not found. ";
        if (S(merged.contact.country).isEmpty())
            merged.notes += "country not found";
        merged.contact.country = this.collapse(merged.contact.country);
        merged.contact.phone = this.collapse(merged.contact.phone);
        merged.contact.fax = this.collapse(merged.contact.fax);
        merged.contact.email = this.collapse(merged.contact.email);
        merged.contact.website = this.collapse(merged.contact.website);
        merged.contact.address = S(merged.contact.address)
            .lines()
            .map((l) => this.collapse(l))
            .filter(i => !S(i).isEmpty())
            .join(", ");
        return merged;
    }
    buildLauncher(urls, launcherConfig) {
        var validUrls = this._urlManager.addUrls(urls);
        if (validUrls.length > 0) {
            return new WebPageLauncher(validUrls, this, launcherConfig);
        }
        return null;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            var firstLauncher = this.buildLauncher(util_1.Utils.arrify(this.settingsWeb.url), new WebPageLauncherSettings());
            if (!firstLauncher)
                return;
            this.launchers.push(firstLauncher);
            var launcher;
            while (launcher = this.launchers.shift()) {
                yield launcher.launchUrls();
            }
            winston.debug("writing");
            if (this.settings.format == "json")
                fs.writeFile(this.settings.outFile, JSON.stringify(this.items));
            if (this.settings.format == "csv")
                fs.writeFile(this.settings.outFile, csv.csvFormat(this.items.map(i => util_1.Utils.flatten(i)).filter(i => i)));
        });
    }
}
exports.Scraper = Scraper;
//# sourceMappingURL=scrape.js.map