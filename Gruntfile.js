/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  Ion JS in your browser
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['dist/',
            'docs/',
            'coverage-final.json',
            'browser/scripts/ion/'
           ],
    jshint: {
      files: []
    },
      /**
       * Typescript document generator
       */
    typedoc: {
      build: {
        src: 'src/**/*'
      }
    },
    ts: {
      'es6-es6': {
        tsconfig: 'tsconfig.json'
      },
      'amd-es6': {
        tsconfig: 'tsconfig.amd.json'
      },
      'commonjs-es6': {
        tsconfig: 'tsconfig.commonjs.json'
      }
    },
      /**
       * Copy of generated .js files to
       *  1. the dist folder
       *  2. the browser folder for use within a browser
       */
    copy: {
      bundle: {
        files: [
          { expand: true,
            src: ['dist/browser/js/ion-bundle*'],
            dest: 'browser/scripts/',
            flatten: true
          }
        ]
      },
      tutorial:{
        files: [
          { expand: true,
            src: ['browser/**'],
            dest: 'docs/',
          }
        ]
      },
    },
    babel: { 
      options: { 
        sourceMap: true, 
        presets: ['@babel/preset-env']
      },
      dist: {
        files: [{
          'expand': true,
          cwd: 'dist/amd/es6',
          'src': ['*.js'],
          'dest': 'dist/amd/es5/',
          'ext': '.js',
        }],
      },
    },
    /**
     * Two steps here
     *   1. Take CommonJS and generates ES5 using Babel (babelify)
     *   2. Package the ES5 code to be used in the browser (browserify)
     */
    browserify: {
      development: {
        src: [ "./dist/commonjs/es6/Ion.js" ],
        dest: './dist/browser/js/ion-bundle.js',
        options: {
         browserifyOptions: { 
           standalone: 'ion', // add `ion` to global JS variable `window` in browsers
           debug: true,
         },
        transform: [["babelify", 
                     { 
                       "presets": ["@babel/preset-env"], // TODO this targets ES2015, we should be more specific
                       "plugins" : [["@babel/transform-runtime"],
                                    ["@babel/transform-object-assign"]]
                     }]],
        }
      },
      prod: {
        src: [ "./dist/commonjs/es6/Ion.js" ],
        dest: './dist/browser/js/ion-bundle.js',
        options: {
         browserifyOptions: { 
           standalone: 'ion', // add `ion` to global JS variable `window` in browsers
           debug: false,
         },
        transform: [["babelify", 
                     { 
                       "presets": ["@babel/preset-env"], // TODO this targets ES2015, we should be more specific
                       "plugins" : [["@babel/transform-runtime"],
                                    ["@babel/transform-object-assign"]]
                     }]],
        }
      }
    },
    uglify: {
        options: {
            compress: true,
            mangle: true,
            sourceMap: false
        },
        target: {
            src: './dist/browser/js/ion-bundle.js',
            dest: './dist/browser/js/ion-bundle.min.js',
        }
    },
    shell: {
      // Uses the nyc configuration from package.json and the mocha settings from test/mocha.opts
      "mochaWithCoverage": {
        command: "npx nyc mocha --colors"
      }
    }
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-typedoc');

  // Copy tasks
  grunt.registerTask('copy:all', ['copy:bundle', 'copy:tutorial']);

  // Build and Translation tasks 
  grunt.registerTask('build:browser', ['build', 'browserify:prod', 'uglify']); // standalone for browser
  grunt.registerTask('trans:browser', ['browserify:prod', 'uglify']); // browserify (assumes 'build' was run)
  grunt.registerTask('build:es6', ['ts:es6-es6']);
  grunt.registerTask('build:cjs', ['ts:commonjs-es6']);
  grunt.registerTask('build:amd', ['ts:amd-es6']);
  grunt.registerTask('build', [
      'clean', 'build:es6', 'build:amd', 'build:cjs', 'trans:browser', 'copy:all'
  ]);

  // Temporary targets that will eventually replace 'test' and 'test:coverage'
  grunt.registerTask('mocha', ['shell:mochaWithCoverage']);

  // Tests
  grunt.registerTask('test', ['mocha', 'build']); // Test via ts-node. If all goes well, build.
  grunt.registerTask('test:coverage', ['mocha']); // Run the tests and show coverage metrics, but do not build.

  // Documentation
  grunt.registerTask('nojekyll', 'Write an empty .nojekyll file to allow typedoc html output to be rendered',
    function(){ 
      grunt.file.write('docs/.nojekyll', '');
    });

  grunt.registerTask('doc', ['typedoc']);

  grunt.registerTask('cleanup', 'Removes extraneous files from distributions', function() {
    grunt.file.expand('dist/**/IonEvent*', 'dist/**/IonTests.*').forEach((file) => grunt.file.delete(file));
  });

  // release target used by Travis 
  grunt.registerTask('release', ['test:coverage', 'build', 'cleanup', 'typedoc', 'nojekyll']);

  // default for development
  grunt.registerTask('default', ['test', 'cleanup']);
};
