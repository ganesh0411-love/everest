fetch("https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=tngis:village_boundary&outputFormat=application/json&cql_filter=vname='Sevugampatti'")
.then(r=>r.text())
.then(t=>console.log(t.substring(0,300)))
