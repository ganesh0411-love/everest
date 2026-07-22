fetch("https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=tngis:district_boundary&outputFormat=application/json&cql_filter=dname='Dindigul'")
.then(r=>r.text())
.then(t=>console.log(t))
