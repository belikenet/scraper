import { SettingsFactory, SettingsWebFactory } from "./factories";
const path = require("path");

describe("SettingsWeb", () => {
    it('populate data template when defaultTemplateValues', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { defaultTemplateValues : ["testType", "testCountry"] });

        settingsWeb.dataTemplate._type.should.be.equal("testType");
        settingsWeb.dataTemplate.contact.country.should.be.equal("testCountry");

        settingsWeb = SettingsWebFactory.empty(settings, { defaultTemplateValues : [null, null] });
        //should.not.exist(settingsWeb.dataTemplate._type);
        //should.not.exist(settingsWeb.dataTemplate.contact.country);
    })

    it('leave empty data template when no defaultTemplateValues', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { defaultTemplateValues : null });

        settingsWeb.dataTemplate._type.should.be.empty;
        settingsWeb.dataTemplate.contact.country.should.be.empty;

        settingsWeb = SettingsWebFactory.empty(settings, { defaultTemplateValues : [] });
        settingsWeb.dataTemplate._type.should.be.empty;
        settingsWeb.dataTemplate.contact.country.should.be.empty;
    })

    it('populate profileFolder when url is valid', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { url: "http://www.google.com/page?123", profile: "" });
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","google.com"));

        settingsWeb = SettingsWebFactory.empty(settings, { url: "http://www.google.es/page?123", profile: null });
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","google.es"));
    })
    
    it('populate profileFolder to no.profile when url is not valid', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { url: "" });

        settingsWeb.url.should.be.empty;
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","no.profile"));

        settingsWeb.url = null;
        settingsWeb.init(settings);
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","no.profile"));

        settingsWeb.url = "www.google.es";
        settingsWeb.init(settings);
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","no.profile"));
    })

    it('populate profileFolder to profile when profile', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { url: "http://www.google.com", profile: "nogoogle.com" });

        settingsWeb.url.should.be.equal("http://www.google.com");
        settingsWeb.profile.should.be.equal("nogoogle.com");
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","nogoogle.com"));

        settingsWeb.url = null;
        settingsWeb.init(settings);
        settingsWeb.profileFolder.should.be.equal(path.resolve(".\\profiles","nogoogle.com"));
    })

    it('populate moreUrlsAction when moreUrls is string', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { moreUrls: "selector" });

        settingsWeb.moreUrls.should.be.equal("selector");
        settingsWeb.moreUrlsAction.should.exist;
        settingsWeb.moreUrlsAction.should.be.a("Function");

        settingsWeb.moreUrls = function (param) { return function() { return "I love youuu"; } }
        settingsWeb.init(settings);
        settingsWeb.moreUrlsAction.should.exist;
        settingsWeb.moreUrlsAction.should.be.a("Function");
    })

    it('moreUrlsAction is null when moreUrls is not valid', () => {
        var settings = SettingsFactory.empty();
        var settingsWeb = SettingsWebFactory.empty(settings, { moreUrls: null });

        (settingsWeb.moreUrls === null).should.be.ok;
        (settingsWeb.moreUrlsAction === null).should.be.ok;

        settingsWeb.moreUrls = "";
        settingsWeb.init(settings);
        (settingsWeb.moreUrlsAction === null).should.be.ok;
    })
    
})