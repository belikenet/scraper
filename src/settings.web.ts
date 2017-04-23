/// <reference types="jquery" />
var _pjs$ : JQueryStatic;

export class SettingsWeb {
    url: string = "https://www.sussexstudent.com/sport-societies-media/sports-club-societies-list/";
    moreUrls: (string|Function) = ".msl_organisation_list .msl-listingitem-link";
    maxDepth: number = 1;
    injectJQuery: boolean = true;
    waitFor: string = "main";
    scraper: Function = function () {
        var x:any = {};
        x.name = document.title.split("|")[0]; //_pjs$(".col-md-8 h2").text();
        x.contact = {};
        x.contact.email = _pjs$("a.msl_email").attr("href");
        x.contact.website = _pjs$("a.msl_web").attr("href") || _pjs$("a.msl_facebook").attr("href");

        x.url = document.location.href;      
        return x;
    };
    dataTemplate = {
        name: null,
        "_type" : "CH",
        url: null,
        contact : {
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
