module.exports = (function() {
    var grunt = require("grunt");
    var path = require("path");
    var _ = grunt.util._;

    var destBase = "testtmp";
    var expectBase = "test/expectations";

    return {
        checkfiles: function(test) {
            var files = _.filter(grunt.file.expand(path.join(destBase, "**/*")), function(file) {
                return grunt.file.isFile(file);
            });
            test.expect(files.length);
            _.each(files, function(file) {
                var expectFilePath = path.join(expectBase, file.substring(destBase.length));
                var contents = grunt.file.read(file);
                var expect = grunt.file.read(expectFilePath);
                test.ok(contents === expect, file + " should match with expected file");
            });
            test.done();
        },
    };

})();
