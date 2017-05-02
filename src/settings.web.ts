/// <reference types="jquery" />
const vo = require("vo");

var _pjs$ : JQueryStatic;
type moreUrlTypeFunction = (depth?: number, url?: string) => any;
type moreUrlTypes = moreUrlTypeFunction | string;

export class SettingsWeb {
    url: string = "http://www.privateschoolsdirectory.com.au/";
    maxDepth: number = 1; // starting from 1
    injectJQuery: boolean = false;
    waitFor: string|number = null;
    exportUrls : boolean = true;l
    moreUrls : any //moreUrlTypes
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
