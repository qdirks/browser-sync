"use strict";

var browserSync = require("../../../index");

var request = require("supertest");
var _       = require("lodash");
var assert  = require("chai").assert;

describe("E2E TLS server test", function () {

    var instance;

    before(function (done) {

        var config = {
            server: {
                baseDir: __dirname + "/../../fixtures"
            },
            http: true, // need to run a test with custom configuration.
            debugInfo: false,
            open: false
        };

        instance = browserSync.init(config, done);
    });

    after(function () {
        instance.cleanup();
    });

    it("serves files with the snippet added", function (done) {

        assert.isString(instance.options.snippet);

        request(instance.server)
            .get("/index.html")
            .set("accept", "text/html")
            .expect(200)
            .end(function (err, res) {
                assert.isTrue(_.contains(res.text, instance.options.snippet));
                done();
            });
    });

    it("serves the client script", function (done) {

        request(instance.server)
            .get(instance.options.scriptPath)
            .expect(200)
            .end(function (err, res) {
                assert.isTrue(_.contains(res.text, "Connected to BrowserSync"));
                done();
            });
    });
});