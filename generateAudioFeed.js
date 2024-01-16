const fs = require('fs');
const yaml = require('js-yaml');
const xml2js = require('xml2js');

function yamlObjectToXml(yamlObject) {
    const xmlObject = {
        'item': {
            'title': yamlObject.title,
            'pubDate': new Date(yamlObject.date).toUTCString(),
            'guid': {
                _: 'ein-hash22',
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
    };

    const builder = new xml2js.Builder({headless: true}); // headless option to remove XML declaration
    return builder.buildObject(xmlObject);
}

const basepath = './static/audiofeed';
let yamlData = fs.readFileSync(basepath + '.yaml', 'utf8');
let yamlObjects = yaml.load(yamlData);

let convertedItems = [];
for (let rssItem in yamlObjects) {
    convertedItems.push(yamlObjectToXml(rssItem));
}

console.log('convertedItems', convertedItems);
