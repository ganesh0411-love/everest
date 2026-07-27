const fetch = require('node-fetch');

async function test() {
    try {
        console.log("Querying by lgd_village_code='635433'");
        const r2 = await fetch("https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&maxFeatures=5&cql_filter=lgd_village_code%3D%27635433%27");
        const t2 = await r2.text();
        console.log(t2);
    } catch(e) {
        console.error(e);
    }
}
test();
