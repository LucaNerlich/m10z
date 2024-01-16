const fs = require('fs');
const yaml = require('js-yaml');
const xml2js = require('xml2js');
const crypto = require('crypto');

const basepath = './static/audiofeed';

function convertToPubDateFormat(dateString) {
    let date = new Date(dateString);
    let options = {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZone: 'UTC'};
    return date.toLocaleDateString('en-US', options) + ' +0000';
}

function toHash(string) {
    const hash = crypto.createHash('sha256');
    hash.update(string);
    return hash.digest('hex');
}


function yamlObjectToXml(yamlObject) {
    return {
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
    };
}

function insertItemsToXMLFile(xmlFilePath, yamlObjects) {
    let data = fs.readFileSync(xmlFilePath);
    xml2js.parseString(data, (err, result) => {
        if (err) {
            console.error(err);
            return;
        }

        result.rss.channel[0].item = yamlObjects.map(yamlObjectToXml);

        let builder = new xml2js.Builder();
        let xml = builder.buildObject(result);
        fs.writeFileSync(basepath + 'test.xml', xml);
    });
}

let yamlData = fs.readFileSync(basepath + '.yaml', 'utf8');
let yamlObjects = yaml.load(yamlData);
insertItemsToXMLFile('./templates/rss-channel.xml', yamlObjects);
