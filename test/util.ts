import {assert} from 'chai';
import {suite, test} from "mocha-typescript";
import * as util from "../src/util";

@suite('util')
class UtilTests {
    @test "_hasValue(undefined)"() {
        assert.equal(util._hasValue(undefined), false);
    }

    @test "_hasValue(null)"() {
        assert.equal(util._hasValue(null), false);
    }

    @test "_hasValue(0)"() {
        assert.equal(util._hasValue(0), true);
    }

    @test "_hasValue(1)"() {
        assert.equal(util._hasValue(1), true);
    }

    @test "_sign(-1)"() {
        assert.equal(util._sign(-1), -1);
    }

    @test "_sign(-0)"() {
        assert.equal(util._sign(-0), -1);
    }

    @test "_sign(0)"() {
        assert.equal(util._sign(0), 1);
    }

    @test "_sign(1)"() {
        assert.equal(util._sign(1), 1);
    }
}