const yaml = require('js-yaml');
const fs = require('fs');

function run() {
    console.log('Converting authors.yml to authors.json');

    const data = fs.readFileSync('./blog/authors.yml', 'utf8');
    const yamlData = yaml.load(data);
    const jsonData = JSON.stringify(yamlData);
    fs.writeFileSync('./blog/authors.json', jsonData, 'utf8');

    console.log('Successfully converted authors.yml to authors.json');
}

run();
