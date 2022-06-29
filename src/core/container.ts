import { Container } from 'inversify';
import Logger from '../services/logger.service';
import { TYPES } from './types';

export const container = new Container();
container.bind(TYPES.Logger).to(Logger);