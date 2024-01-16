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
                if (key === 'itunes:image') {
                    cleanedItem['image'] = item[key][0]['url'][0];
                } else if (key === 'enclosure') {
                    cleanedItem['url'] = item[key][0]['$']['url'];
                } else if (key === 'guid') {
                    cleanedItem[key] = item[key][0]['_'];
                } else if (key === 'itunes:duration') {
                    cleanedItem['duration'] = item[key][0];
                } else {
                    cleanedItem[key] = item[key][0];
                }
            }
            return cleanedItem;
        });

        let yamlStr = jsYaml.dump(items, { lineWidth: -1 });
        fs.writeFile(basepath + '.yaml', yamlStr, 'utf8', function(err) {
            if (err) {
                return console.log('Failed to create YAML file: ' + err);
            }
            console.log('Converted XML to YAML successfully!');
        });
    });
});
