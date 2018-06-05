
# Web Scraper
Web Scraper is a chrome browser extension and a library built for data extraction from web 
pages. Using this extension you can create a plan (sitemap) how a web site 
should be traversed and what should be extracted. Using these sitemaps the 
Web Scraper will navigate the site accordingly and extract all data. Scraped 
data later can be exported as CSV.

To use it as an extension install it from [Chrome store] [chrome-store]

To use it as a library do `npm i web-scraper-headless`

### Features

 1. Scrape multiple pages
 2. Sitemaps and scraped data are stored in browsers local storage or in CouchDB
 3. Multiple data selection types
 4. Extract data from dynamic pages (JavaScript+AJAX)
 5. Browse scraped data
 6. Export scraped data as CSV
 7. Import, Export sitemaps
 8. Depends only on Chrome browser

### Help

 Documentation and tutorials are available on [webscraper.io] [webscraper.io]
 
 Ask for help, submit bugs, suggest features on [google groups] [google-groups]
 
 Submit bugs and suggest features on [bug tracker] [github-issues]
 
#### Headless mode
To use it as a library you need a sitemap, you can write it by hand, but the easiest way is to use the [original extension][extension] to scrape and then click on "export sitemap".

    const webscraper = require('web-scraper-headless')
    // visit github and retrieve last commit of all trending repo. 
    // The sitemap depends on the actual DOM of github, so it might get outdated
    const sitemap = {
	     "startUrl": "https://github.com/trending",
	     "selectors": [{
		      "parentSelectors": ["_root"],
		      "type": "SelectorLink",
		      "multiple": true,
		      "id": "link_to_repo",
		      "selector": "h3 a",
		      "delay": ""
	     }, {
		      "parentSelectors": ["link_to_repo"],
		      "type": "SelectorText",
		      "multiple": false,
		      "id": "latest_commit",
		      "selector": "a.commit-tease-sha",
		      "regex": "",
		      "delay": ""
	    }],
	    "_id": "github_trending"
    }
    const options = {delay: 10, pageLoadDelay: 10, browser: 'headless'} // optional delay, pageLoadDelay and browser
    webscraper(sitemap, options)
        .then(function (scraped) {
            // This is your scraped info
        })

By default webscraper-headless will open [jsdom](https://github.com/jsdom/jsdom) as a browser. This is a purely JS implementation of HTML. As such it has no native dependencies and it is very lightweighted. However, it is not capable of executing js which might be a hindrance in some cases. If that is your case, you can use chrome headless as a browser. Note that it will consume far more resources than jsdom and you need to have some native dependencies installed in the server. To use chrome headless do the following:

    const sitemap = // same as previous example
    const options = {browser: 'headless'}
    webscraper(sitemap, options)
        .then(function (scraped) {
            // This is your scraped info
        })

#### Bugs
When submitting a bug please attach an exported sitemap if possible.

## License
LGPLv3

## Changelog

### v0.2
 * Added Element click selector
 * Added Element scroll down selector
 * Added Link popup selector
 * Improved table selector to work with any html markup
 * Added Image download
 * Added keyboard shortcuts when selecting elements
 * Added configurable delay before using selector
 * Added configurable delay between page visiting
 * Added multiple start url configuration
 * Added form field validation
 * Fixed a lot of bugs

### v0.1.3
 * Added Table selector
 * Added HTML selector
 * Added HTML attribute selector
 * Added data preview
 * Added ranged start urls
 * Fixed bug which made selector tree not to show on some operating systems

 [chrome-store]: https://chrome.google.com/webstore/detail/web-scraper/jnhgnonknehpejjnehehllkliplmbmhn
 [webscraper.io]: http://webscraper.io/
 [google-groups]: https://groups.google.com/forum/#!forum/web-scraper
 [github-issues]: https://github.com/martinsbalodis/web-scraper-chrome-extension/issues
 [extension]: https://chrome.google.com/webstore/detail/web-scraper/jnhgnonknehpejjnehehllkliplmbmhn
