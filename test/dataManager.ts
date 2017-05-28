import { SettingsFactory, SettingsWebFactory } from "./factories";
import { WebPageLauncherQueue } from "../src/webPageLauncherQueue";
import * as sinon from "Sinon";
import { isUrlPayload } from "../src/webPageLauncher";
import { DataManager } from "../src/dataManager";

describe("DataManager", () => {
    it('add one item', () => {
        var settingsWeb = SettingsWebFactory.empty(SettingsFactory.empty());
        
        var dataManager = new DataManager(settingsWeb);
        dataManager.add("", { name: "name it" });        

        var all = dataManager.all();

        all.length.should.be.equal(1);

        dataManager.add("", { name: "name it" });

        all = dataManager.all();

        all.length.should.be.equal(2);
        Array.isArray(all[0]).should.be.equal(false);
        Array.isArray(all[1]).should.be.equal(false);
    });

    it('add array with one item', () => {
        var settingsWeb = SettingsWebFactory.empty(SettingsFactory.empty());
        
        var dataManager = new DataManager(settingsWeb);
        var item = { name: "name it" };
        dataManager.add("", [item]);        

        var all = dataManager.all();

        all.length.should.be.equal(1);
        Array.isArray(all[0]).should.be.equal(false);
        all[0].name.should.be.equal(item.name);

        dataManager.add("", item);        

        all = dataManager.all();

        all.length.should.be.equal(2);
        Array.isArray(all[0]).should.be.equal(false);
        Array.isArray(all[1]).should.be.equal(false);
        all[0].name.should.be.equal(item.name);
        all[1].name.should.be.equal(item.name);        
    });

});
