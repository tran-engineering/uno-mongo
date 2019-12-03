const fs = require("fs");
const d3 = require("d3");
const readline = require("readline");
const MongoClient = require("mongodb").MongoClient;
const proj4 = require("proj4");

// https://spatialreference.org/ref/epsg/2056/proj4js/
proj4.defs("LV95", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");
// https://spatialreference.org/ref/epsg/21781/proj4js/
proj4.defs("LV03", "+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=600000 +y_0=200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs");



const gleispunkte = d3.csvParse(fs.readFileSync("./gleispunkte.csv", "utf-8"), row => {
    for (const k in row) {
        switch (k) {
            case "ERSETZT":
            case "ERSTELLT":
            case "GUELTIG_AB":
            case "GUELTIG_BIS":
            case "MUTDATUM":
                row[k] = new Date(row[k]);
                break;
            default:
                row[k] = +row[k];
                break;
        }
    }
    return row;
});
const gleispunkteMap = d3.nest()
    .key(d => d.IDV_GLEISKANTE)
    .object(gleispunkte);

const gleiskanten = d3.csvParse(fs.readFileSync("./UNO_VIEW_H_GLEISKANTE.csv", "utf-8"), row => {
    for (const k in row) {
        switch (k) {
            case "ERSETZT":
            case "ERSTELLT":
            case "GUELTIG_AB":
            case "GUELTIG_BIS":
            case "MUTDATUM":
                row[k] = row[k] ? new Date(row[k]) : null;
                break;
            default:
                row[k] = +row[k];
                break;
        }
    }
    return row;
})
    .filter(d => gleispunkteMap[d.ID_VERSION]);


function toGeoJson(gleiskante) {
    const points = gleispunkteMap[gleiskante.ID_VERSION];
    const coords = points.map(d => proj4("LV03").inverse([d.x, d.y]));
    return {
        type: "Feature",
        properties: gleiskante,
        geometry: {
            type: coords.length > 1 ? "LineString" : "Point",
            coordinates: coords.length > 1 ? coords : coords[0]
        }
    };
}


const firsti = toGeoJson(gleiskanten[0]);


(async function main() {
    const client = await MongoClient.connect("mongodb://localhost");

    try {
        console.log("connected");
        const db = client.db("uno");
        try {
            await db.dropCollection("trackEdge");
        } catch (err) {
            console.log(err);
        }
        await db.createCollection("trackEdge");
        const trackEdgeCollection = db.collection("trackEdge");
        for (let i = 0; i < gleiskanten.length; i++) {
            const gk = gleiskanten[i];
            try {
                const insert = await trackEdgeCollection.insertOne(toGeoJson(gk), { writeConcern: { w: 0, j: false } });
                //    .updateOne({ ID_VERSION: gk.ID_VERSION }, { $set:  }, { upsert: true, writeConcern: {w: 0, j:false} });
            } catch (err) {
                console.error(err);
            }
            if (i % 500 == 0) {
                console.log("Current insert:", i);
            }
        }

        console.log("Creating index...");
        await trackEdgeCollection.createIndex({ geometry: "2dsphere" }, { name: "geoIndex" });
        await trackEdgeCollection.createIndex({ "properties.ID_VERSION": 1, "properties.ID_GLEISKANTE": 1 }, { name: "trackEdgeIndex" });

        console.log("Done creating index!");
        // .forEach causes OOM
        /*gleiskanten.forEach(async gk => {
            try {
                console.log('insert...', gk);
                const insert = await trackEdgeCollection
                    .updateOne({ ID_VERSION: gk.ID_VERSION }, { $set: toGeoJson(gk) }, { upsert: true, new: true });
            } catch (err) {
                console.error(err);
            }
        });*/
    } finally {
        await client.close();
        console.log("Finally done!");
    }

})();

