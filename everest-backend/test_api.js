fetch('http://localhost:5000/api/tngis/survey?taluk=Nilakkottai&village=Sevugampatti')
.then(r=>r.json())
.then(t=> {
    console.log('Survey:', t);
    return fetch('http://localhost:5000/api/tngis/subdivisions?taluk=Nilakkottai&village=Sevugampatti&survey=651');
})
.then(r=>r.json())
.then(t=> {
    console.log('Subdivisions:', t);
});
