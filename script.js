const fs = require('fs');

const query = `
SELECT ?districtLabel ?talukLabel ?villageLabel
WHERE {
  ?village wdt:P31/wdt:P279* wd:Q2085114 ;
           wdt:P131 ?taluk .
  ?taluk wdt:P131 ?district .
  ?district wdt:P131 wd:Q1445 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 20000
`;

fetch('https://query.wikidata.org/sparql?query=' + encodeURIComponent(query) + '&format=json', {
    headers: {
        'User-Agent': 'EverestBot/1.0',
        'Accept': 'application/json'
    }
})
.then(res => res.json())
.then(data => {
    const master = {};
    const bindings = data.results.bindings;
    console.log(`Fetched ${bindings.length} results from Wikidata`);
    
    bindings.forEach(b => {
        let district = b.districtLabel ? b.districtLabel.value.replace(/ district$/i, '') : 'Unknown';
        let taluk = b.talukLabel ? b.talukLabel.value.replace(/ taluk$/i, '') : 'Unknown';
        let village = b.villageLabel ? b.villageLabel.value : 'Unknown';
        
        if (!master[district]) master[district] = {};
        if (!master[district][taluk]) master[district][taluk] = [];
        master[district][taluk].push(village);
    });
    
    fs.writeFileSync('everest-backend/data/tn_master.json', JSON.stringify(master, null, 2));
    console.log("Written to tn_master.json");
})
.catch(console.error);
