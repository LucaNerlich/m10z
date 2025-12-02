const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

function run() {
    console.log('Converting authors.yml to authors.json');

    const data = fs.readFileSync(path.join(__dirname, '..', 'blog/authors.yml'), 'utf8');
    const yamlData = yaml.load(data);
    const jsonData = JSON.stringify(yamlData);
    fs.writeFileSync(path.join(__dirname, '..', 'blog/authors.json'), jsonData, 'utf8');

    console.log('Successfully converted authors.yml to authors.json');
}

run();
