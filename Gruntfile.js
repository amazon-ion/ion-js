module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: [
        'build/**/*.js',
        'test/**/*.js'
      ]
    },
    typescript: {
      src: {
        src: ['src/**/*.ts'],
        dest: 'build/src'
      },
      test: {
        src: ['test/**/*.ts'],
        dest: 'build/test'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-typescript');

  grunt.registerTask('default', ['typescript', 'jshint']);
};
