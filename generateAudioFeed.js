const fs = require('fs');
const yaml = require('js-yaml');
const xml2js = require('xml2js');

const basepath = './static/audiofeed';

function convertToPubDateFormat(dateString) {
    let date = new Date(dateString);
    let options = {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: 'UTC'};
    return date.toLocaleDateString('en-US', options) + ' +0000';
}

function toHash(input){
    var hash = 0,
        i, chr;
    if (input.length === 0) return hash;
    for (i = 0; i < input.length; i++) {
        chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}


function yamlObjectToXml(yamlObject) {
    return [{
        'item': {
            'title': yamlObject.title,
            'pubDate': convertToPubDateFormat(yamlObject.date),
            'guid': {
                _: toHash(yamlObject.url),
                $: {isPermaLink: 'false'},
            },
            'itunes:image': {
                'url': yamlObject.image,
                'title': `${yamlObject.title} (m10z)`,
                'link': 'https://m10z.de',
            },
            'description': yamlObject.description,
            'author': 'm10z@posteo.de',
            'itunes:duration': yamlObject.duration,
            'enclosure': {
                $: {
                    url: yamlObject.url,
                    length: '48300000',
                    type: 'audio/mpeg',
                },
            },
        },
    }];
}

function insertItemsToXMLFile(xmlFilePath, yamlObjects) {
    let data = fs.readFileSync(xmlFilePath);
    xml2js.parseString(data, (err, result) => {
        if (err) {
            console.error(err);
            return;
        }

        // Convert each YAML object to XML compatible JavaScript object
        let convertedItems = yamlObjects.map(yamlObjectToXml);

        // Create 'item' array under 'rss -> channel' if it's not there
        if (!result.rss.channel[0].item) {
            result.rss.channel[0].item = [];
        }

        // Append all items to 'rss -> channel -> item'
        result.rss.channel[0].item = [...result.rss.channel[0].item, ...convertedItems.flat()];

        // Convert back to XML and write to file
        let builder = new xml2js.Builder();
        let xml = builder.buildObject(result);
        fs.writeFileSync(basepath + 'test.xml', xml);
    });
}

let yamlData = fs.readFileSync(basepath + '.yaml', 'utf8');
let yamlObjects = yaml.load(yamlData);
insertItemsToXMLFile('./templates/rss-channel.xml', yamlObjects);
