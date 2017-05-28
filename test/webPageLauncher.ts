import { SettingsFactory, SettingsWebFactory } from "./factories";
import { WebPageLauncherQueue } from "../src/webPageLauncherQueue";
import * as sinon from "Sinon";
import { isUrlPayload } from "../src/webPageLauncher";
import { DataManager } from "../src/dataManager";
import { WebPageLauncherSettings, WebPageLauncher } from "../src/webPageLauncher"
import { server } from "./server";


describe ("WebPageLauncherSettings", () => {
    it("default settings depth at 1", () => {
        var settings = new WebPageLauncherSettings();

        settings.depth.should.be.equal(1);
    });
    it("build child increments current setting + 1", () => {
        var settings = new WebPageLauncherSettings();

        settings = settings.buildChild();

        settings.depth.should.be.equal(2);
    })

});

describe("WebPageLauncher", () => {
    var app: server;
    before(function (done) {
        app = new server();
        app.listen(done);
    });
    after(function() {
        app.close();
    });
    it("nothing to data, nothing to url", (done) => {
        var settingsWeb = SettingsWebFactory.empty(SettingsFactory.empty());
        var settingsLauncher = new WebPageLauncherSettings();
        var launcher = new WebPageLauncher(["http://localhost:7500/empty"], settingsLauncher, settingsWeb);

        var dataCallback = sinon.spy(), urlCallback = sinon.spy();

        launcher.launchUrls(dataCallback, urlCallback).then(() => {
            dataCallback.called.should.be.equal(false);
            urlCallback.called.should.be.equal(false);
            done();
        });
    });
    it("item to data, nothing to url", (done) => {
        var settingsWeb = SettingsWebFactory.empty(SettingsFactory.empty(), 
                          { scraper: function () { return { name: "testing" }; }});
        var settingsLauncher = new WebPageLauncherSettings();
        var launcher = new WebPageLauncher(["http://localhost:7500/empty"], settingsLauncher, settingsWeb);

        var dataCallback = sinon.spy(), urlCallback = sinon.spy();

        launcher.launchUrls(dataCallback, urlCallback).then(() => {
            dataCallback.called.should.be.equal(true);
            dataCallback.calledWith("http://localhost:7500/empty", { name: "testing" }).should.be.equal(true);
            urlCallback.called.should.be.equal(false);            
            done();
        });
    });
    it("item to data, item to url", (done) => {
        var settingsWeb = SettingsWebFactory.empty(SettingsFactory.empty(), 
                          { scraper: function () { return { name: "testing" }; },
                            moreUrls: (l,u) => function *(n) { yield {url: "url1"}},
                            maxDepth: 2,
                        });
        var settingsLauncher = new WebPageLauncherSettings();
        var launcher = new WebPageLauncher(["http://localhost:7500/empty"], settingsLauncher, settingsWeb);

        var dataCallback = sinon.spy(), urlCallback = sinon.spy();

        launcher.launchUrls(dataCallback, urlCallback).then(() => {
            dataCallback.called.should.be.equal(true);
            //dataCallback.calledWith("http://localhost:7500/empty", { url: "http://localhost:7500/empty", notes: "INDEX page. "}).should.be.equal(false);
            urlCallback.called.should.be.equal(true);            
            //urlCallback.calledWith({url: "url1"}).should.be.equal(true);
            done();
        });
    });

});