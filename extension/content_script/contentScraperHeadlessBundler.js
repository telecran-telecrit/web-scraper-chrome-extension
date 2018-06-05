const browserify = require('browserify')
const path = require('path')
// caching
let bundle
module.exports = {getBundle}

function getBundle () {
  return new Promise(function (resolve, reject) {
    if (bundle) {
      return resolve(bundle)
    }
    const content = []
    browserify({
      standalone: 'webScraper',
      entries: [
        path.join(__dirname, './content_scraper_browser.js')
      ]
    }).bundle().on('error', function (err) {
      reject(err)
    }).on('data', function (buffer) {
      content.push(buffer)
    }).on('end', function () {
      const buffer = Buffer.concat(content)
      const result = buffer.toString()
      bundle = result
      resolve(result)
    })
  })
}
