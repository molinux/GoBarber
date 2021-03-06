import 'dotenv/config';

import express from 'express';
import path from 'path';
import cors from 'cors';
import Youch from 'youch';
import * as Sentry from '@sentry/node';
import 'express-async-errors';
import routes from './routes';
import sentryConfig from './config/sentry';

import './database';

class App {
  constructor() {
    this.server = express();

    Sentry.init(sentryConfig);

    this.middlwares();
    this.routes();
    this.exceptionHandler();
  }

  middlwares() {
    this.server.use(Sentry.Handlers.requestHandler());
    // Quando for do endereço especificado permite, caso contrario bloqueia
    // this.server.use(cors({ origin: 'https://molinux.net.br' }));
    this.server.use(cors());
    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routes);
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    // Quando recebe 4 parametros, entende que é um middleware de tratamento de excessão
    this.server.use(async (err, req, res, next) => {
      // Retorna as mensagens de erro apenas em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();

        return res.status(500).json(errors);
      }

      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App().server;
