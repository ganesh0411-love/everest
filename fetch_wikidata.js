const q = `SELECT ?villageLabel ?talukLabel ?districtLabel WHERE { ?village wdt:P31 wd:Q2085114; wdt:P131 ?taluk. ?taluk wdt:P131 ?district. ?district wdt:P131 wd:Q1445. SERVICE wikibase:label { bd:serviceParam wikibase:language 'en'. } } LIMIT 20000`;
fetch('https://query.wikidata.org/sparql?query='+encodeURIComponent(q)+'&format=json', {headers:{'User-Agent': 'EverestBot/1.0'}})
.then(r=>r.json())
.then(d=>{
    const fs = require('fs');
    const data = d.results.bindings;
    const master = {};
    for (const b of data) {
        const dist = b.districtLabel.value.replace(' district', '');
        const taluk = b.talukLabel.value.replace(' taluk', '');
        const village = b.villageLabel.value;
        if(!master[dist]) master[dist] = {};
        if(!master[dist][taluk]) master[dist][taluk] = [];
        master[dist][taluk].push(village);
    }
    fs.writeFileSync('everest-backend/tn_villages_master.json', JSON.stringify(master, null, 2));
    console.log("Wrote " + data.length + " villages to tn_villages_master.json");
}).catch(console.error);
