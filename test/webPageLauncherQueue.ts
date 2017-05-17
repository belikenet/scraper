//import { SettingsFactory, SettingsWebFactory } from "./factories";
import { WebPageLauncherQueue } from "../src/webPageLauncherQueue";
import * as sinon from "Sinon";
import { isUrlPayload } from "../src/webPageLauncher";

describe("WebPageLaunchQueue", () => {
    it('urlPayload', () => {
        isUrlPayload("url").should.be.not.ok;
        isUrlPayload({url: "url1"}).should.be.ok;
    })


    it('launcher enqueued', () => {
        var settingsWeb: any = {}, urlManager: any = {}, fileManager: any = {}, factory: any = {};
        settingsWeb.exportUrls = false;
        var urls = ["url1", "url2", "url3"];
        var validUrls = [urls[0], urls[1]];
        var launcher = { name: "WebPageLauncher" };

        urlManager.addUrls = sinon.stub().withArgs(urls).returns(validUrls);

        factory.getWebPageLauncher = sinon.stub().withArgs(validUrls, sinon.match.any).returns(launcher);

        var queue = new WebPageLauncherQueue(settingsWeb, urlManager, fileManager, factory);
        queue.addLauncher(urls);

        urlManager.addUrls.calledWith(urls).should.be.ok;
        factory.getWebPageLauncher.calledWith(validUrls).should.be.ok;
        queue.all().length.should.be.equal(1);
        queue.all()[0].should.be.equal(launcher);
    })

    it('launcher not enqueued if urls are not valid', () => {
        var settingsWeb: any = {}, urlManager: any = {}, fileManager: any = {}, factory: any = {};
        settingsWeb.exportUrls = true;
        var urls = ["url1", "url2", "url3"];
        var validUrls = [];
        var launcher = { name: "WebPageLauncher" };

        urlManager.addUrls = sinon.stub().withArgs(urls).returns(validUrls);
        factory.getWebPageLauncher = sinon.stub().withArgs(validUrls, sinon.match.any).returns(launcher);
        fileManager.exportOutputJson = sinon.stub();

        var queue = new WebPageLauncherQueue(settingsWeb, urlManager, fileManager, factory);
        queue.all().length.should.be.equal(0);
        queue.addLauncher(urls);

        urlManager.addUrls.calledWith(urls).should.be.ok;
        queue.all().length.should.be.equal(0);
    })

    it('launcher not enqueued if urls is null or empty', () => {
        var settingsWeb: any = {}, urlManager: any = {}, fileManager: any = {}, factory: any = {};
        settingsWeb.exportUrls = false;
        var urls = ["url1", "url2", "url3"];
        var launcher = { name: "WebPageLauncher" };

        var queue = new WebPageLauncherQueue(settingsWeb, urlManager, fileManager, factory);
        queue.all().length.should.be.equal(0);

        queue.addLauncher(null);
        queue.all().length.should.be.equal(0);

        queue.addLauncher([]);
        queue.all().length.should.be.equal(0);
    })

})