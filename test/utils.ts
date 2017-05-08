import {Utils} from "../src/util";
import {Settings} from "../src/settings";

describe ("Utils binarify", () => {
    it('should return empty when bin == 0', () => {
       
        var result = Utils.binarify(["item1", "item2"], 0);
        result.length.should.equal(0);

        result = Utils.binarify([], 0);
        result.length.should.equal(0);

        result = Utils.binarify(null, 0);
        result.length.should.equal(0);
    });

    it('should return [bin] when bin == 1', () => {
       
        var result = Utils.binarify(["item1", "item2"], 1);
        result.length.should.equal(1);
        result[0].length.should.equal(2);
        result[0][0].should.equal("item1");
        result[0][1].should.equal("item2");

        result = Utils.binarify([], 1);
        result.length.should.equal(1);
        result[0].length.should.equal(0);

        result = Utils.binarify(null, 1);
        result.length.should.equal(0);
    });

    it('should return [bin1, bin2] when bin > 1', () => {
       
        var result = Utils.binarify(["item1", "item2"], 2);
        result.length.should.equal(2);
        result[0].length.should.equal(1);
        result[1].length.should.equal(1);
        result[0][0].should.equal("item1");
        result[1][0].should.equal("item2");

        var result = Utils.binarify(["item1", "item2"], 3);
        result.length.should.equal(3);
        result[0].length.should.equal(1);
        result[1].length.should.equal(1);
        result[2].length.should.equal(0);
        result[0][0].should.equal("item1");
        result[1][0].should.equal("item2");

        var result = Utils.binarify(["item1", "item2", "item3"], 2);
        result.length.should.equal(2);
        result[0].length.should.equal(2);
        result[1].length.should.equal(1);
        result[0][0].should.equal("item1");
        result[0][1].should.equal("item3");
        result[1][0].should.equal("item2");

    });

});
