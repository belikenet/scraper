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
    url: string = "http://www.calu.edu/current-students/get-involved/clubs-and-organizations/";
    maxDepth: number = 2; // starting from 1
    instancesCount: number = 4;
    defaultTemplateValues : string[] = ["Society", "US"]; // _type, country
    profile: string = "calu.edu";
    injectJQuery: boolean = false;
    waitFor: string|number = null;
    exportUrls : boolean = true;
    __moreUrls: any = "#tab_1 a";
    _moreUrls : any = null;
    moreUrls : any //moreUrlTypes
        = function (level: number, url: string) {
        return function * (nightmare) {
            return  yield nightmare.evaluate(function() {
                return jQuery.makeArray($("#tab_1 a").map((x,v) => v["href"]));
            });
        }
    };
    _scraper: Function = null;

    scraper : any 
        = function () {
        return function * (nightmare) {
            yield nightmare.evaluate(function() { $("#button-nav > li > a[data-tab='profile']").trigger("click");})
                .wait(1000)
                .wait(function () {return $('#floating_loading_tag:visible').length == 0});


            return  yield nightmare.evaluate(function() {
                function scraper() {
                    var x : any = {}; x.contact = {};
                    var found;
                    x.url = document.location.href;
                    var regex = /Website\s*\b(.*)\s*/;

                    x.name = $("h1").text();
                    var match = regex.exec($(".panel-body").text());
                    if (match) {
                        x.contact.website = match[1];
                    } else {
                        //found = $("div.panel-body div.response > p > a:contains('http')");
                        //if (found.length > 0)
                        //    x.contact.website = found[0].href;
                        //else
                        //    x.contact.website = $(".portal-social").attr("href");                    }
                        x.contact.website = $("div.panel-body div.response > p > a:contains('http'), .portal-social").attr("href");
                    }

                    found = $("div.panel-body > div.form-profile a:contains('@')");
                    if (found.length > 0){
                        x.contact.email = found[0].getAttribute("href").replace("mailto:","");
                    }

                    return x;
                }
                return scraper();
            });
        }
    }
    __scraper: Function = function () {
        function sleep(delay)
        {
            var start = new Date().getTime();
            while (new Date().getTime() < start + delay);
        }
        var x : any = {}; x.contact = {};
        var found;
        x.url = document.location.href;
        var regex = /Website\s*\b(.*)\s*/;

        // active tab profile
        $("#button-nav > li > a[data-tab='profile']").trigger("click");

        sleep(1500);

        x.name = $("h1").text();
        var match = regex.exec($(".panel-body").text());
        if (match) {
            x.contact.website = match[1];
        } else {
            found = $("div.panel-body div.response > p > a:contains('http')");
            if (found.length > 0)
                x.contact.website = found[0].href;
        }

        found = $("div.panel-body > div.form-profile a:contains('@')");
        if (found.length > 0){
            x.contact.email = found[0].getAttribute("href");
        }

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
            if (!self.profile || self.profile.trim().length == 0) {
                try {
                    self._profile = new URL(Array.isArray(self.url) ? self.url[0] : self.url)
                                            .hostname.replace("www.","");
                } catch(ex) {
                    self._profile = "no.profile";
                }
            } else {
                self._profile = self.profile;
            }
            self.profileFolder = path.resolve(outFolder, self._profile);
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

