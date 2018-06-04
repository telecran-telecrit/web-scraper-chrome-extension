const files = ['tests/browserSpec.js', 'tests/spec/*.js', 'tests/spec/browser/*.js', 'tests/spec/Selector/*Spec.js']
const _ = require('lodash')
module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['browserify', 'mocha'],

    preprocessors: _.mapValues(_.keyBy(files), () => ['browserify']),
    // list of files / patterns to load in the browser
    files: [
      'extension/assets/sugar-1.4.1.js',
      'extension/assets/pouchdb-nightly.min.js',
      'tests/ChromeAPI.js',
      'extension/generated/background-scraper.js', // not very nice, we need to load the background script to listen to the messages
      'extension/generated/content-scraper.js',
      'extension/content_script/content_script.js',
      'docs/images/chrome-store-logo.png',
      ...files
    ],
    customLaunchers: {
      ChromeOutOfFocus: {
        base: 'Chrome',
        flags: ['--window-size=300,300']
      }
    },
    browserify: {
      debug: true,
      transform: [
        ['babelify', {ignore: /\/node_modules\//}]
      ]
    },

    // list of files to exclude
    exclude: [
    ],
    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['dots'],

    // web server port
    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    browserConsoleLogOptions: {
      terminal: true,
      level: 'error'
    },
    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
    browserNoActivityTimeout: 50000000,
    plugins: [
      'karma-mocha',
      'karma-browserify',
      'karma-chrome-launcher'
    ]
  })
}
