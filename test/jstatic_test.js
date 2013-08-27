module.exports = (function() {
    var grunt = require("grunt");
    var path = require("path");
    var _ = grunt.util._;

    var destBase = "testtmp";
    var expectBase = "test/expectations";

    return {
        checkfiles: function(test) {
            var expectedFiles = _.filter(grunt.file.expand(path.join(expectBase, "**/*")), function(file) {
                return grunt.file.isFile(file);
            });
            test.expect(expectedFiles.length);
            _.each(expectedFiles, function(expectFilePath) {
                var genFilePath = path.join(destBase, expectFilePath.substring(expectBase.length));
                var genContent = _.trim(grunt.file.read(genFilePath));
                var expectContent = _.trim(grunt.file.read(expectFilePath));
                test.ok(genContent === expectContent, expectFilePath + " should match generated file");
            });
            test.done();
        },
    };

})();
