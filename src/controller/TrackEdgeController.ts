import { Request, Response, NextFunction } from 'express'
import { Controller, Middleware, Get, Post, Put, Delete } from '@overnightjs/core'
import MongoDB from 'mongodb';
import { Logger } from '@overnightjs/logger';

@Controller('api/v1/trackEdges')
export class TrackEdgeController {

  constructor(private db: MongoDB.Db) {

  }

  @Get()
  async get(req: Request, res: Response): Promise<any> {
    console.log(req.query.lon);
    console.log(req.query.lat);
    const { lat, lon, runDate, maxDistance = 2000 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Missing lat/lon GET params.' })
    }
    try {
      const center = {
        type: 'Point',
        coordinates: [parseFloat(lon), parseFloat(lat)],
      }
      const query: any = {
        geometry: {
          $nearSphere: {
            $geometry: center,
            $maxDistance: maxDistance
          }
        },
        'properties.GUELTIG_BIS': null,
        'properties.ERSETZT': null
      };

      let features = await this.db.collection('trackEdge')
        .find(query,
          {
            projection: {
              _id: 0,
              'properties.IDT_SPURWEITE': 0,
              'properties.ID_HISTORY': 0,
              'properties.ID_PROJEKT': 0,
              'properties.ID_REPL': 0,
              'properties.ID_REPL_ER': 0,
              'properties.KNOTENSEITE_VON': 0,
              'properties.KNOTENSEITE_BIS': 0,
              'properties.WEICHENZUGANG_VON': 0,
              'properties.WEICHENZUGANG_BIS': 0
            }
          }).toArray();
      return res.status(200).json({
        type: 'FeatureCollection',
        features,
        center
      });
    } catch (err) {
      Logger.Err(err);
      return res.status(500).json(err);
    }
  }

  @Post()
  async post(req: Request, res: Response) {
    const { trackEdges } = req.body;
    try {
      const query: any = {
        'properties.GUELTIG_BIS': null,
        'properties.ERSETZT': null,
        'properties.ID_GLEISKANTE': {
          $in: trackEdges
        }
      };

      let result = await this.db.collection('trackEdge')
        .find(query,
          {
            projection: {
              _id: 0,
              'properties.IDT_SPURWEITE': 0,
              'properties.ID_HISTORY': 0,
              'properties.ID_PROJEKT': 0,
              'properties.ID_REPL': 0,
              'properties.ID_REPL_ER': 0,
              'properties.KNOTENSEITE_VON': 0,
              'properties.KNOTENSEITE_BIS': 0,
              'properties.WEICHENZUGANG_VON': 0,
              'properties.WEICHENZUGANG_BIS': 0
            }
          }).toArray();
      return res.status(200).json({
        type: 'FeatureCollection',
        features: result
      });
    } catch (err) {
      Logger.Err(err);
      return res.status(500).json(err);
    }
  }
}
