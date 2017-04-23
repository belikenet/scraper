"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference types="jquery" />
var _pjs$;
class SettingsWeb {
    constructor() {
        this.url = "https://www.sussexstudent.com/sport-societies-media/sports-club-societies-list/";
        this.moreUrls = ".msl_organisation_list .msl-listingitem-link";
        this.maxDepth = 1;
        this.injectJQuery = true;
        this.waitFor = "main";
        this.scraper = function () {
            var x = {};
            x.name = document.title.split("|")[0]; //_pjs$(".col-md-8 h2").text();
            x.contact = {};
            x.contact.email = _pjs$("a.msl_email").attr("href");
            x.contact.website = _pjs$("a.msl_web").attr("href") || _pjs$("a.msl_facebook").attr("href");
            x.url = document.location.href;
            return x;
        };
        this.dataTemplate = {
            name: null,
            "_type": "CH",
            url: null,
            contact: {
                country: "GB",
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