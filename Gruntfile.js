module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    intern: {
      default: {
        options: {
          config: 'tests/intern',
          reporters: ['Console', 'Lcov'],
        }
      }
    },
    jshint: {
      files: []
    },
    ts: {
      default: {
        src: ['src/**/*.ts'],
        out: 'dist/ion-node.js',
        options: {
          module: "amd",
          target: "es6",
        }
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('intern');

  grunt.registerTask('default', ['ts', 'intern']);
};
