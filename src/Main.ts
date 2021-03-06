import { readFileSync } from 'fs';
import cors from 'cors';
import compression from 'compression';
import * as bodyParser from 'body-parser';
import { Server } from '@overnightjs/core';
import { Logger } from '@overnightjs/logger';
import MongoDB from 'mongodb';
import swaggerUi from 'swagger-ui-express'
import YAML from 'yamljs';
const swaggerDocument = YAML.load('./swagger.yaml');
console.log(swaggerDocument);

import { TrackEdgeController } from './controller/TrackEdgeController';

class TopologyServer extends Server {
  private readonly SERVER_STARTED = 'TopologyServer server started on port: ';
  constructor(private db: MongoDB.Db) {
    super(true);
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(compression());
    this.app.use(cors());
    const t = new TrackEdgeController(db);
    this.addControllers([t]);
  }

  public start(port: number): void {
    this.app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
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

