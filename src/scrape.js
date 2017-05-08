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
const path = require("path");
const url_1 = require("url");
const winston = require("winston");
const settings_1 = require("./settings");
const settings_web_1 = require("./settings.web");
const util_1 = require("./util");
const Enumerable = require("linq");
const repository_1 = require("./repository");
const Nightmare = require("nightmare");
const vo = require("vo");
const csv = require("d3-dsv");
const S = require("string");
class WebScrapper {
    constructor(config, scraperConfig) {
        this.config = config;
        this.scraperConfig = scraperConfig;
    }
    *scrape(urls, dataScraper, complete, urlScraper, urlComplete) {
        let _self = this;
        var nightmare = Nightmare({ show: true, pollInterval: 800, webPreferences: { images: false } });
        var scrapers = [];
        scrapers = urls.map((url) => workflow(url));
        for (var i in urls) {
            yield workflow(urls[i]);
        }
        yield nightmare.end();
        function* workflow(url) {
            function createOrUpdateItemNotes(notes) {
                if (item != null)
                    if (item.notes === undefined)
                        item.notes = notes;
                    else
                        item.notes += notes;
                else
                    item = { url: url, notes: notes };
            }
            var item = null;
            function* subWorkflow() {
                winston.debug("Opening " + url);
                yield nightmare.goto(url);
                if (_self.scraperConfig.injectJQuery) {
                    yield nightmare.inject("js", "client\\jquery.js")
                        .evaluate(Function("window._pjs$ = jQuery.noConflict(true);"))
                        .inject("js", "client\\pjscrape_client.js")
                        .wait(Function("return window._pjs.ready;"));
                }
                if (!S(_self.scraperConfig.waitFor).isEmpty())
                    yield nightmare.wait(_self.scraperConfig.waitFor);
                if (dataScraper != null)
                    item = yield nightmare.evaluate(dataScraper);
                if (urlScraper != null) {
                    var data = yield vo(urlScraper(nightmare));
                    urlComplete(data);
                    createOrUpdateItemNotes("INDEX page. ");
                }
            }
            yield vo(subWorkflow)
                .catch((error) => {
                winston.error(error);
                createOrUpdateItemNotes(`${error} `);
            })
                .then(() => {
                if (item != null)
                    complete(item);
            });
        }
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
        if (this._scraperConfig.moreUrls && (!this._scraperConfig.maxDepth || this.launcherConfig.depth <= this._scraperConfig.maxDepth)) {
            // allow selector-only spiders
            let validMoreUrls = this._scraperConfig.moreUrls;
            if (typeof validMoreUrls == 'string') {
                if (validMoreUrls.length == 0)
                    return null;
                //validMoreUrls = "return _pjs.getAnchorUrls('" + this._scraperConfig.moreUrls + "')";
                validMoreUrls = `var ___x= []; document.querySelectorAll("${this._scraperConfig.moreUrls}").forEach((e) => ___x.push(e.href)); return ___x;`;
                return Function(validMoreUrls);
            }
            else
                return this._scraperConfig.moreUrls(this.launcherConfig.depth, this._scraperConfig.url);
        }
        return null;
    }
    completeMoreUrls(moreUrls) {
        if (moreUrls && Array.isArray(moreUrls) && moreUrls.length > 0) {
            winston.debug('Found ' + moreUrls.length + ' additional urls to scrape');
            if (this._scraperConfig.exportUrls)
                this.exportMoreUrls(moreUrls);
            this._scraper.addLauncher(moreUrls, this.launcherConfig.buildChild());
            var records = moreUrls.map((u) => {
                var w = null;
                if (typeof u === "string")
                    w = new repository_1.web(u);
                else if (u["url"] !== undefined) {
                    w = new repository_1.web(u["url"]);
                    delete u["url"];
                    w.notes = u;
                }
                if (w != null) {
                    w.depth = this.launcherConfig.depth + 1;
                    w.isLeaf = w.depth == this._scraperConfig.maxDepth;
                    return w;
                }
                winston.error("Url not recognized: " + u);
            });
            //new Repository().insert (records).then(() => {});
        }
    }
    exportMoreUrls(moreUrls) {
        this._scraper.exportOutputJson(moreUrls, "urls.json");
    }
    launchUrls() {
        var _self = this;
        return vo(util_1.Utils.binarify(this.urls, _self._scraperConfig.instancesCount)
            .map((bin) => new WebScrapper(new settings_1.Settings(), _self._scraperConfig)
            .scrape(bin, _self._scraperConfig.scraper, (data) => _self.completeScraper(data), _self.extractMoreUrls(), (data) => _self.completeMoreUrls(data)))).catch((error) => {
            winston.error("ERROR: " + error);
        }).then(() => {
            winston.debug("ending launch Electron instances");
        });
    }
}
class WebPageLauncherSettings {
    constructor(depth, title) {
        this.depth = depth || 1;
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
            var items = util_1.Utils.isArray(item) ? item : [item];
            items = items.map((x) => this.validateDataItem(x));
            this.items = this.items.concat(items);
            // apply for flattening items
            this.items = [].concat(this.items);
        }
    }
    collapse(text) {
        return S(text).collapseWhitespace().toString();
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
            merged.notes += "country not found. ";
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
            var urls = this.processInputUrls(this.settingsWeb.url);
            var firstLauncher = this.buildLauncher(urls, new WebPageLauncherSettings());
            if (!firstLauncher)
                return;
            this.launchers.push(firstLauncher);
            var launcher;
            while (launcher = this.launchers.shift()) {
                yield launcher.launchUrls();
            }
            this.exportOutput();
        });
    }
    exportOutput() {
        winston.warn("writing items");
        // exportSettings checks & create profile folder
        this.exportSettings();
        var outputFile = path.resolve(this.defaultOutputFolder(), this.settings.outFile);
        if (this.settings.format == "json")
            fs.writeFile(outputFile, JSON.stringify(this.items));
        if (this.settings.format == "csv")
            fs.writeFile(outputFile, csv.csvFormat(this.items.map(i => util_1.Utils.flatten(i)).filter(i => i)));
    }
    exportOutputJson(data, filename) {
        var outputFile = path.resolve(this.defaultOutputFolder(), filename);
        fs.writeFile(outputFile, JSON.stringify(data));
    }
    importJson(filename) {
        var inputFile = path.resolve(this.defaultOutputFolder(), filename);
        var content = fs.readFileSync(inputFile, "UTF8");
        return JSON.parse(content);
    }
    defaultOutputFolder() {
        var profileFolder = new url_1.URL(Array.isArray(this.settingsWeb.url) ? this.settingsWeb.url[0] : this.settingsWeb.url)
            .hostname.replace("www.", "");
        return path.resolve(this.settings.outFolder, profileFolder);
    }
    copyFile(sourceFile, targetFile) {
        fs.createReadStream(sourceFile).pipe(fs.createWriteStream(targetFile));
    }
    exportSettings(profileFolder = this.defaultOutputFolder()) {
        if (!fs.existsSync(profileFolder)) {
            fs.mkdirSync(profileFolder);
        }
        this.copyFile(".//src//settings.ts", path.resolve(profileFolder, "settings.ts"));
        this.copyFile(".//src//settings.web.ts", path.resolve(profileFolder, "settings.web.ts"));
    }
    processInputUrls(urls) {
        // urls is string
        if (typeof urls === "string") {
            // single url
            if (urls.startsWith("http://") || urls.startsWith("https://"))
                return util_1.Utils.arrify(urls);
            else {
                var ext = path.extname(urls);
                if (ext == ".json" || ext == ".csv") {
                    //var inputFile = path.resolve (this.defaultOutputFolder(), urls);
                    //TODO: check if file exists
                    var content = fs.readFileSync(urls, "UTF8");
                    urls = ext == ".json" ? JSON.parse(content) : csv.csvParse(content);
                }
            }
        }
        if (Array.isArray(urls)) {
            if (urls.length > 0)
                if (typeof urls[0] === "string")
                    return urls;
                else
                    return Enumerable.from(urls).select((x) => x.url).toArray();
        }
        return null;
    }
}
exports.Scraper = Scraper;
//# sourceMappingURL=scrape.js.map