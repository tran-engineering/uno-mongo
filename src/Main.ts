import cors from 'cors';
import compression from 'compression';
import * as bodyParser from 'body-parser';
import { Server } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import MongoDB from 'mongodb';

import { TrackEdgeController } from './controller/TrackEdgeController';

class TopologyServer extends Server {
    private readonly SERVER_STARTED = 'Example server started on port: ';
    constructor(private db:MongoDB.Db) {
        super(true);
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use(compression());
        this.app.use(cors());
        const t = new TrackEdgeController(db);
        this.addControllers([t]);
    }

    public async initDb() {
    }

    public start(port: number): void {
        this.app.get('*', (req, res) => {
            res.send(this.SERVER_STARTED + port);
        });
        this.app.listen(port, () => {
            Logger.Imp(this.SERVER_STARTED + port);
        });
    }
}

(async function main() {
    try {
        const client = await new MongoDB.MongoClient(process.env.MONGO_URL || 'mongodb://localhost').connect();
        const db = client.db('uno');
        const s = new TopologyServer(db);
        s.start(process.env.PORT ? parseInt(process.env.PORT) : 8080);
    } catch (err) {
        Logger.Err(err);
    }
})();

