/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * <h1> Ion JS in your browser</h1>
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
      /**
       * Tests configuration
       */
    intern: {
      es6: {
        options: {
          config: 'tests/intern',
          reporters: ['Console', 'node_modules/remap-istanbul/lib/intern-reporters/JsonCoverage'],
          ionVersion: 'es6',
        },
      },
    },
    clean: ['dist/',
            // 'docs/',  removing for now till we move to ghpages
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
        options: {
          module: 'amd',
          target: 'es6',
          out: 'docs/api/',
          name: 'Ion Library',
        },
        src: 'src/**/*'
      }
    },
      /**
       * Coverage report that maps coverage results to .ts files instead
       * of the generated .js files.
       */
    remapIstanbul: {
      build: {
        src: 'coverage-final.json',
          options: {
            reports: {
              'html': 'docs/coverage/html',
              'json': 'docs/coverage/coverage-final-mapped.json'
            }
          }
      }
    },
    ts: {
      'amd-es6': {
        src: ['src/**/*.ts'],
        outDir: 'dist/amd/es6',
        options: {
          target: "es6",
          module: "amd",
          declaration: true
        }
      },
      'commonjs-es6': {
        src: ['src/**/*.ts'],
        outDir: 'dist/commonjs/es6',
        options: {
          target: "es6",
          module: "commonjs",
          declaration: true
        }
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
      }
    },
    babel: { 
      options: { 
        sourceMap: true, 
        presets: ['es2015']
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
     *   1. Take CommonJS and generates ES5 using Bable (babelify)
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
                       "presets": ["es2015"],
                       "plugins" : [["transform-runtime", {"polyfill" : true}]] 
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
                       "presets": ["es2015"],
                       "plugins" : [["transform-runtime", {"polyfill" : true}]] 
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
      }
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-typedoc');
  grunt.loadNpmTasks('remap-istanbul');
  grunt.loadNpmTasks('intern');

  // Copy tasks
  grunt.registerTask('copy:all', ['copy:bundle', 'copy:tutorial']);

  // Build and Translation tasks 
  grunt.registerTask('build:browser', ['build', 'browserify:prod', 'uglify']); // standalone for browser
  grunt.registerTask('trans:browser', ['browserify:prod', 'uglify']); // browserify (assumes 'build' was run)
  grunt.registerTask('build:cjs', ['ts:commonjs-es6']);
  grunt.registerTask('build:amd', ['ts:amd-es6']);
  grunt.registerTask('build', ['clean', 'build:amd', 'build:cjs','trans:browser', 'copy:all']);


  // Tests
  grunt.registerTask('test', ['build', 'intern:es6']);
  grunt.registerTask('test:coverage', ['test', 'remapIstanbul']);

  // Documentation
  grunt.registerTask('doc', ['typedoc']);




  grunt.registerTask('default', ['test']);
};
