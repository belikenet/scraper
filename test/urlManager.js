"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("../src/util");
const settings_1 = require("../src/settings");
//import * as chai from "chai";
//import * as sinonjs from "sinon";
//const expect = chai.expect;
//const should = chai.should();
class UrlManagerFactory {
    static simple(urls = null, defaultSettings) {
        var settings = SettingsFactory.empty(defaultSettings);
        var urlManager = new util_1.UrlManager(settings);
        if (urls != null)
            urlManager.addUrls(urls);
        return { urlManager, settings };
    }
}
class SettingsFactory {
    static empty(defaultArguments) {
        var settings = new SettingsFactory.TestSettings();
        return Object.assign({}, settings, defaultArguments);
    }
}
SettingsFactory.TestSettings = class extends settings_1.Settings {
    constructor() {
        super();
        this.allowRepeatedUrls =
            this.debug =
                this.debugRequest =
                    this.debugResponse =
                        this.newHashNewPage = false;
        this.delayBetweenRuns =
            this.timeoutInterval =
                this.timeoutLimit = 0;
        this.format =
            this.logFile =
                this.outFile = null;
    }
};
describe("UrlManager tests", () => {
    it('should add url when visitedUrls is empty', () => {
        let { urlManager } = UrlManagerFactory.simple();
        //expect(urlManager.visitedUrls.length).to.equal(0);
        urlManager.visitedUrls.length.should.equal(0);
        urlManager.addUrls(["http1"]);
        urlManager.visitedUrls.length.should.equal(1);
        urlManager.visitedUrls[0].should.equal("http1");
    });
    it('should add url when visitedUrls is not empty', () => {
        let { urlManager } = UrlManagerFactory.simple(["http1"]);
        urlManager.visitedUrls.length.should.equal(1);
        urlManager.addUrls(["http2"]);
        urlManager.visitedUrls.length.should.equal(2);
        urlManager.visitedUrls[0].should.equal("http1");
        urlManager.visitedUrls[1].should.equal("http2");
    });
    it('should duplicate url when allowRepetedUrls is true', () => {
        let { urlManager, settings } = UrlManagerFactory.simple(["http1"], { allowRepeatedUrls: true });
        urlManager.visitedUrls.length.should.equal(1);
        settings.allowRepeatedUrls.should.equal(true);
        urlManager.addUrls(["http1"]);
        urlManager.visitedUrls.length.should.equal(2);
        urlManager.visitedUrls[0].should.equal("http1");
        urlManager.visitedUrls[1].should.equal("http1");
    });
    it('should not duplicate url when allowRepetedUrls is false', () => {
        let { urlManager, settings } = UrlManagerFactory.simple(["http1"]);
        urlManager.visitedUrls.length.should.equal(1);
        settings.allowRepeatedUrls.should.equal(false);
        urlManager.addUrls(["http1"]);
        urlManager.visitedUrls.length.should.equal(2);
        urlManager.visitedUrls[0].should.equal("http1");
        urlManager.visitedUrls[1].should.equal("http1");
    });
    it('should not change visitedUrls when new url is empty', () => {
        let { urlManager, settings } = UrlManagerFactory.simple();
        urlManager.addUrls(null);
        urlManager.visitedUrls.length.should.equal(0);
        urlManager.addUrls([null]);
        urlManager.visitedUrls.length.should.equal(0);
        urlManager.addUrls(["http1"]);
        urlManager.visitedUrls.length.should.equal(1);
        urlManager.addUrls(null);
        urlManager.visitedUrls.length.should.equal(1);
        urlManager.addUrls([null]);
        urlManager.visitedUrls.length.should.equal(1);
    });
    it('should truncate by # when newHashNewPage is true', () => {
        let { urlManager, settings } = UrlManagerFactory.simple(null, { newHashNewPage: true });
        settings.newHashNewPage.should.equal(true);
        urlManager.addUrls(["http1#hash"]);
        urlManager.visitedUrls.length.should.equal(1);
        urlManager.visitedUrls[0].should.equal("http1");
    });
    it('should not truncate by # when newHashNewPage is false', () => {
        let { urlManager, settings } = UrlManagerFactory.simple();
        settings.newHashNewPage.should.equal(false);
        urlManager.addUrls(["http1#hash"]);
        urlManager.visitedUrls.length.should.equal(1);
        urlManager.visitedUrls[0].should.equal("http1#hash");
    });
});
//# sourceMappingURL=urlManager.js.map