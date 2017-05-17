/// <reference types="jquery" />
const vo = require("vo");
const path = require("path");
const fs = require('fs');
const URL = require('url').URL;
import { Settings } from "./settings";
import { Inject } from "di-typescript";

var _pjs$ : JQueryStatic;
type moreUrlTypeFunction = (depth?: number, url?: string) => any;
type moreUrlTypes = moreUrlTypeFunction | string;


export class SettingsWebConfig {
    url: string = "urls.json";
    maxDepth: number = 1; // starting from 1
    instancesCount: number = 4;
    defaultTemplateValues : string[] = ["Society", "CA"]; // _type, country
    profile: string = "suclubs.orgsync.com";
    injectJQuery: boolean = false;
    waitFor: string|number = null;
    exportUrls : boolean = true;
    moreUrls : any = null;
    _moreUrls : any //moreUrlTypes
        = function (level: number, url: string) {
        return function * (nightmare) {
            var data = [];
            var nextPage: boolean = true;
            var count: number = 0, page = 1;
            for (var county of ["NT" , "VIC", "NSW", "QLD", "SA", "WA", "ACT", "TAS"]) {
                yield nightmare.select("#search-state",county)
                    .click(".search-by-name input.go");
                nextPage = true;
                page = 1;
                while (nextPage) {
                    var urls = yield nightmare
                        .wait(12000)
                        .evaluate (function () {
                            var urls = $(".listing-header a");
                            return jQuery.map(urls, (d) => d.href);
                        });
                    //winston.info(`post waiting county ${county} page ${page++}`)

                    data = data.concat(urls.map((x) => { return {url: x, county: county}; }));

                    nextPage = yield nightmare.evaluate(function () {
                        return $(".pagination a:contains('Next »')").length > 0;
                    });
                    if (nextPage)
                        yield nightmare.click(".pagination a:last-child");
                }

                console.log(`finished County ${county}, county count: ${ data.length - count }`);
                count = data.length;

                yield nightmare.goto(url);
            }
            return data.map((x) => x.url);
        }
    }
    _scraper: Function = null;
    scraper: Function = function () {
        var addressRegex = /(\b[\(\)\-\&'\/\w\s,-]+)\s+(?:Phone\:\s+([\d \(\)+-]+))?\s+(?:Fax:\s*([\d\(\) +-]+))?(?:\s*)/;
        var phoneRegex = /(?:Phone:\s*([\d ]+)*)/;
        var faxRegex = /(?:Fax:\s*([\d ]+)*)/;

        var x : any = {}; x.contact = {};
        var match: any = null;
        x.url = document.location.href;
        x.name = $(".profile-summary.profile-sidebar h5").text() || $(".profile-limited h1").text();
        var info = $(".profile-summary.profile-sidebar p:nth-child(2)").text() || $(".profile-limited-contact p").text();
        match = addressRegex.exec(info);
        if (match != null) {
            x.contact.address = match[1];
            x.contact.phone = match[2];
            x.contact.fax = match[3];
        }
        match = $(".profile-summary.profile-sidebar p:contains('Email') a").attr("href");
        if (match != undefined)
            x.contact.email = match.replace("mailto:","");
        match = $(".profile-summary.profile-sidebar p:contains('Website') a").attr("href") || $(".profile-summary.profile-sidebar > a").attr("href");
        x.contact.website = match;

        return x;
    };
    dataTemplate = {
        name: null,
        "_type" : "School",
        url: null,
        contact : {
            country: "AU",
            email: "",
            phone: "",
            fax: "",
            address: "",
            website: ""
        },
        "notes": ""
    };
}

@Inject
export class SettingsWeb extends SettingsWebConfig {
    profileFolder: string = null;
    moreUrlsAction: any;
    scraperAction: any;

    constructor(settings: Settings) {
        super();
        this.init(settings);
    }

    public init(settings: Settings) {
        var self = this;
        initProfileFolder(settings);
        initMoreUrlsCallback();
        initDataTemplate(self.defaultTemplateValues);
        self.scraperAction = self.scraper;

        function initDataTemplate(args: string[]) {
            if (args != null && args != undefined && Array.isArray(args) && args.length == 2)
                populate.apply(self, args);
            function populate(_type: string, country: string) {
                self.dataTemplate._type = _type;
                self.dataTemplate.contact.country = country;
            }
        }

        function initProfileFolder(settings: Settings) {
            var outFolder = settings.outFolder && settings.outFolder.length > 0 ? settings.outFolder : "profiles"; // always set a default value for outFolder
            if (self.profile == "") {
                try {
                    var profileFolder = new URL(Array.isArray(self.url) ? self.url[0] : self.url)
                                            .hostname.replace("www.","");
                    self.profileFolder = path.resolve(outFolder, profileFolder);
                } catch(ex) {
                    self.profileFolder = path.resolve(outFolder, "no.profile");
                }
            } else {
                self.profileFolder = path.resolve(outFolder, self.profile);
            }
            if (self.profileFolder && !fs.existsSync(self.profileFolder))
                    fs.mkdirSync(self.profileFolder)
        }

        function initMoreUrlsCallback() {
            var cb = null;
            if (self.moreUrls != null) {
                if (typeof self.moreUrls == 'string') {
                    if (self.moreUrls.length > 0) 
                        cb = Function (`var ___x= []; document.querySelectorAll("${self.moreUrls}").forEach((e) => ___x.push(e.href)); return ___x;`);
                } else 
                    cb = self.moreUrls(self.url);
            }
            self.moreUrlsAction = cb;
        }

    }
}

