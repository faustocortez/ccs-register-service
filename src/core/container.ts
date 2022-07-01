import { Container } from 'inversify';
import { TYPES } from './types';
import Database from '../database';
import Logger from '../services/logger.service';
import RegisterService from '../services/register.service';

// controllers
import '../controllers/home.controller';
import '../controllers/register.controller';

export const container = new Container();
container.bind(TYPES.Logger).to(Logger);
container.bind(TYPES.Database).to(Database);
container.bind(TYPES.RegisterService).to(RegisterService);