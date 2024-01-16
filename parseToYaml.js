const fs = require('fs');
const xml2js = require('xml2js');
const jsYaml = require('js-yaml');

const basepath = './static/audiofeed';

fs.readFile(basepath + '.xml', 'utf8', function(err, data) {
    if (err) {
        return console.log('Failed to read file: ' + err);
    }
    xml2js.parseString(data, function(err, result) {
        if (err) {
            return console.log('Failed to parse XML: ' + err);
        }

        let items = result.rss.channel[0].item;

        // clean up items
        items = items?.map(item => {
            let cleanedItem = {};
            for (let key in item) {
                switch (key) {
                    case 'itunes:image':
                        cleanedItem['image'] = item[key][0]['url'][0];
                        break;
                    case 'enclosure':
                        cleanedItem['url'] = item[key][0]['$']['url'];
                        break;
                    case 'guid':
                    case 'author':
                        // ignore
                        break;
                    case 'itunes:duration':
                        cleanedItem['seconds'] = item[key][0];
                        break;
                    case 'pubDate':
                        cleanedItem['date'] = convertToDate(item[key]);
                        break;
                    default:
                        cleanedItem[key] = item[key][0];
                }
            }
            return cleanedItem;
        });

        let yamlStr = jsYaml.dump(items, {lineWidth: -1});
        fs.writeFile(basepath + '.yaml', yamlStr, 'utf8', function(err) {
            if (err) {
                return console.log('Failed to create YAML file: ' + err);
            }
            console.log('Converted XML to YAML successfully!');
        });
    });
});

function convertToDate(pubDateString) {
    let date = new Date(pubDateString);
    // Convert to required format
    let year = date.getUTCFullYear();
    let month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
    let day = ('0' + date.getUTCDate()).slice(-2);
    let hour = ('0' + date.getUTCHours()).slice(-2);
    let minute = ('0' + date.getUTCMinutes()).slice(-2);

    return `${year}-${month}-${day}T${hour}:${minute}`;
}
