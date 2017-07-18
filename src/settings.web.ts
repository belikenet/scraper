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
    url: string|string[] = "https://www.dse.ulaval.ca/associations-etudiantes/categorie-associations/";
    urlMode: string = "new"; // new | error | continue
    maxDepth: number = 2; // starting from 1
    instancesCount: number = 4;
    defaultTemplateValues : string[] = ["Society", "CA"]; // _type, country
    profile: string = null;
    _profile: string = null;
    injectJQuery: boolean = false;
    waitFor: string|number = null;
    exportUrls : boolean = true;
    __moreUrls: any = "a.msl-gl-link";
    _moreUrls : any = null;
    moreUrls : any //moreUrlTypes
        = function (level: number, url: string) {
        return function * (nightmare) {
            var found = false, urls = [];

            urls = yield nightmare.evaluate(function() { return Array.from(document.querySelectorAll("div.associations-cat-list.sort-wrapper ul > li > a")).map((d) => d["href"]) });

            return urls;
        }
    };
    _scraper: Function = null;

    scraper : any 
        = function () {
        return function * (nightmare) {

            return yield nightmare.evaluate(function () {
                function scraper() {
                    var data = [];

                    $("div.association-item").map((i,d) => {
                        var x:any = {}; x.contact = {};
                        x.fragments = [];
                        x.url = document.location.href;
                        x.name = $("span.name",d).text();
                        populateWebsite(x, $("div.content > p:not(p.desc)", d)[0]);
                        populateEmail(x, $("div.content > p:not(p.desc)", d)[0]);
                        
                        data.push(x);
                    });

                    return data;
                }
                function populateWebsite(x: any, element: any){
                    let found = element.querySelector("a[href*='http']");
                    if (found)
                        {
                            x.contact.website = found["href"];
                            x.fragments.push(found);
                        }                    
                }
                function populateEmail(x: any, element: any){
                    let found = Array.from(element.querySelectorAll("a[href*='mailto']"));
                    if (found.length>0)
                        {
                            //x.contact.email = found["href"].replace("mailto:","");
                            x.contact.email = found.map(d => d["href"].replace("mailto:","")).join(";");
                            x.fragments.push(found);
                        }                    
                }
                return scraper();
            });
        }
    };

    dataTemplate = {
        name: null,
        "_type" : null,
        url: null,
        contact : {
            country: null,
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

