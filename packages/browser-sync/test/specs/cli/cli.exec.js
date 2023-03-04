describe("CLI: exec", function() {
    this.timeout(10000);
    it("Can launch from cli", function(done) {
        var stream = require("child_process").spawn("node", [
            require.resolve("../../../dist/bin"),
            "start"
        ]);
        var chunks = [];
        stream.stdout.on("data", function(data) {
            chunks.push(data.toString());
            if (chunks.join("").indexOf("Copy the following snippet") > -1) {
                stream.kill("SIGINT");
            } else {
                done(new Error("missing output"))
            }
        });
        stream.on("close", function() {
            done();
        });
    });
});
