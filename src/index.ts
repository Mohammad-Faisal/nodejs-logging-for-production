import express, { Application, Request, Response } from 'express';
import bodyParser from 'body-parser';
import { Logger } from './utils/Logger';
const app: Application = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(Logger.getHttpLoggerInstance());

const logger = Logger.getInstance();

app.get('/', async (req: Request, res: Response): Promise<Response> => {
  logger.info('This is just an info');
  logger.error('Something went wrong');
  return res.status(200).send();
});

app.get('/measure-performance', async (req: Request, res: Response): Promise<Response> => {
  logger.profile('meaningful-name');
  // do something that takes some time
  logger.profile('meaningful-name');
  return res.status(200).send();
});

app.get('/child-logger', async (req: Request, res: Response): Promise<Response> => {
  const childLogger = logger.child({ requestId: '451' });
  childLogger.error('Something went wrong');
  return res.status(200).send();
});

app.post('/post', async (req: Request, res: Response): Promise<Response> => {
  return res.status(200).send({
    message: 'Hello World from post!',
  });
});

try {
  app.listen(PORT, (): void => {
    console.log(`Connected successfully on port ${PORT}`);
  });
} catch (error: any) {
  console.error(`Error occured: ${error.message}`);
}
