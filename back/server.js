const express = require('express');
const cors = require('cors');
const fs = require('fs');


const app = express();


app.use(cors());
app.use(express.json());

const data = "./api/data/Map.json";

//reads the data but makes sure format is utf
function readMap(){
    return JSON.parse(fs.readFileSync(data,"utf8"));
}
//writes map data to the json
function writeMap(mapData){
    fs.writeFileSync(data,JSON.stringify(mapData,null,2));
}


//gets map data
app.get('/api/map', (req, res) => {
    try{
        const mapData = readMap();
        res.json(mapData);
    }
    catch(err){
        console.error("Error reading map data:", err);
        res.status(500).json({error: "Failed to read map data"});
    }
});


//permision for react app
app.use(
    cors({
        origin: 'http://localhost:3000',
    })
)


//port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
      console.log(`
        Server is running on port ${PORT}
        `);
    });
