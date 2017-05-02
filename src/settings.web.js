"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="jquery" />
const vo = require("vo");
var _pjs$;
class SettingsWeb {
    constructor() {
        this.url = "http://www.privateschoolsdirectory.com.au/";
        this.maxDepth = 1; // starting from 1
        this.injectJQuery = false;
        this.waitFor = null;
        this.exportUrls = true;
        this.moreUrls = function (level, url) {
            return function* (nightmare) {
                var data = [];
                var nextPage = true;
                var count = 0, page = 1;
                for (var county of ["NT", "VIC", "NSW", "QLD", "SA", "WA", "ACT", "TAS"]) {
                    yield nightmare.select("#search-state", county)
                        .click(".search-by-name input.go");
                    nextPage = true;
                    page = 1;
                    while (nextPage) {
                        var urls = yield nightmare
                            .wait(12000)
                            .evaluate(function () {
                            var urls = $(".listing-header a");
                            return jQuery.map(urls, (d) => d.href);
                        });
                        //winston.info(`post waiting county ${county} page ${page++}`)
                        data = data.concat(urls.map((x) => { return { url: x, county: county }; }));
                        nextPage = yield nightmare.evaluate(function () {
                            return $(".pagination a:contains('Next »')").length > 0;
                        });
                        if (nextPage)
                            yield nightmare.click(".pagination a:last-child");
                    }
                    console.log(`finished County ${county}, county count: ${data.length - count}`);
                    count = data.length;
                    yield nightmare.goto(url);
                }
                return data.map((x) => x.url);
            };
        };
        this._scraper = null;
        this.scraper = function () {
            var addressRegex = /(\b[\(\)\-\&'\/\w\s,-]+)\s+(?:Phone\:\s+([\d \(\)+-]+))?\s+(?:Fax:\s*([\d\(\) +-]+))?(?:\s*)/;
            var phoneRegex = /(?:Phone:\s*([\d ]+)*)/;
            var faxRegex = /(?:Fax:\s*([\d ]+)*)/;
            var x = {};
            x.contact = {};
            var match = null;
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
                x.contact.email = match.replace("mailto:", "");
            match = $(".profile-summary.profile-sidebar p:contains('Website') a").attr("href") || $(".profile-summary.profile-sidebar > a").attr("href");
            x.contact.website = match;
            return x;
        };
        this.dataTemplate = {
            name: null,
            "_type": "School",
            url: null,
            contact: {
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
}
exports.SettingsWeb = SettingsWeb;
//# sourceMappingURL=settings.web.js.map