const fs = require('fs');
const util = require('util');

// Convert fs.readFile into Promise version to use with async/await.
const readFile = util.promisify(fs.readFile);

async function run() {
    console.log('Converting audio.yaml to audiofeed.xml');

    // Specify the path to your XML file
    const xmlPath = './templates/rss-channel.xml';

    try {
        const data = await readFile(xmlPath, 'utf-8');
        console.log('XML file has been read successfully');
        console.log(data);
    } catch (error) {
        console.error('Error reading XML file: ', error);
    }
}

run();
