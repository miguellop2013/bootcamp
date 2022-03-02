const express = require("express")
const bodyParser = require("body-parser")

const app = express()

app.set('view engine', 'ejs')

app.get("/", function(req,res){
    res.render("index", {titulo: "Pagina bootcamp"} );
});

app.listen( 8080 , ()=>{
    
});