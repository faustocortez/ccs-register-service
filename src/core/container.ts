import { Container } from 'inversify';
import { TYPES } from './types';
import Database from '../database';
import Logger from '../services/logger.service';

export const container = new Container();
container.bind(TYPES.Logger).to(Logger);
container.bind(TYPES.Database).to(Database);