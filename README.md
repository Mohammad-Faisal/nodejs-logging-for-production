## Description of the project

Logging is an essential part of any production grade application. In fact it's one of the most important parts.

Today we will learn how we can use logging effectively in NodeJS

### Options

There are many good logging libraries for NodeJS. And certainly the most popular of them is [**winston**](https://www.npmjs.com/package/winston). This is a general purpose logging library which is capable of handling all of your logging needs.

Also there is a specialized library for http requests. That is called [**morgan**](https://www.npmjs.com/package/morgan).

We will use these two libraries today into our application.

### Starting point

Today we will integrate Logging on top of an existing NodeJS application built with Typescript. You can read more on how we built it in the following article.

https://www.mohammadfaisal.dev/blog/create-express-typescript-boilerplate

But you are free to use any application you like.

### Get the boilerplate

Let's first clone the [boilerplate repository](https://github.com/Mohammad-Faisal/express-typescript-skeleton) where we have a working NodeJS application with Typescript, EsLint and Prettier already set up.

```sh
git clone https://github.com/Mohammad-Faisal/express-typescript-skeleton.git
```

### Install the dependencies

Then go inside the project and install the dependencies

```sh
yarn add winston
```

Then create a logger instance.

```js
import { createLogger, format } from 'winston';

const logger = createLogger({
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console(), new transports.File({ level: 'error', filename: 'errors.log' })],
});
```

In this configuration the **createLogger** function is exported from the winston library. We have passed 2 options here.

**format** -> Which denotes which format we want. We have specified that we want our logs to be in json format and include the timestamp.
**transports** -> Which denotes where our logs will go. We defined that we want our error logs to go to a file named **errors.log** file.

Now let's create this inside our **index.ts** file

```js
import logger from './logger';

logger.error('Something went wrong');
```

If we run this code we will see a new file named **errors.log** created and there will be one entry.

```json
{ "level": "error", "message": "Something went wrong", "timestamp": "2022-04-16T12:16:13.903Z" }
```

This is the most basic format of the logging in our application.

### Take development logs into console.

When we are developing our application we don't want to check our error log files every time any error occurs. We want those directly into the console.

We already discussed **transports** they are channels where we give the logging outputs. Let's create a new transport for console and add that in development mode.

```js
import { format, transports } from 'winston';

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  );
}
```

This configuration will send all of the logs into the console.

If you look closely you will see that we are adding some formatting to our logs here.

```js
 format: format.combine(format.colorize(), format.simple()),
```

We are colorizing the development logging and also keeping it simple. You can take a look at possible options [here](https://github.com/winstonjs/logform#readme)

### Service specific log

Sometime we want better separation between logs and want to group logs. We can do that by specifying a service field in the options. Let's say we have a billing-service and authentication-service. We can create separate logger for each instance.

```js
const logger = createLogger({
  defaultMeta: {
    service: 'billing-service',
  },
  //... other configs
});
```

This time all our logs will have a format something like this.

```json
{
  "level": "error",
  "message": "Something went wrong",
  "service": "billing-service",
  "timestamp": "2022-04-16T15:22:16.944Z"
}
```

This helps to analyze logs letter.

### We can do even better.

Sometimes we need individual log level control. For example if we want to track the flow of a user we may need to add that info for each level of that information. That is not possible with service level customization

For this purpose we can use [child-logger](https://github.com/winstonjs/winston#creating-child-loggers)

This concept allows us to inject context information about individual log entries.

```js
import logger from './utils/logger';

const childLogger = logger.child({ requestId: '451' });
childLogger.error('Something went wrong');
```

This time we will get individual error logs for each request id that we can filter later.

```json
{
  "level": "error",
  "message": "Something went wrong",
  "requestId": "451",
  "service": "billing-service",
  "timestamp": "2022-04-16T15:25:50.446Z"
}
```

We can also log exceptions and unhandled promise rejections in the event of a failure.
winston provides us with a nice tool for that.

```js
const logger = createLogger({
  transports: [new transports.File({ filename: 'file.log' })],
  exceptionHandlers: [new transports.File({ filename: 'exceptions.log' })],
  rejectionHandlers: [new transports.File({ filename: 'rejections.log' })],
});
```

### Measuring performance.

We can profile our requests in using this logger.

```js
app.get('/ping/', (req: Request, res: Response) => {
  console.log(req.body);
  logger.profile('meaningful-name');
  // do something
  logger.profile('meaningful-name');
  res.send('pong');
});
```

This will give an output of additional output about the performance

```json
{ "durationMs": 5, "level": "info", "message": "meaningful-name", "timestamp": "2022-03-12T17:40:59.093Z" }
```

You can see [more examples with winston here](https://github.com/winstonjs/winston/tree/master/examples)

## Using Morgan

This far you should understand why winston is one of the best if not the best logging library. But it's used for general purpose logging.

There is another library that can help us with more sophisticated logging especially for http requests.
That library is called [morgan](https://www.npmjs.com/package/morgan)

First create a middleware that will intercept all the requests. I am adding it inside **middlewares/morgan.ts** file.

```js
import morgan, { StreamOptions } from 'morgan';

import Logger from '../utils/logger';

// Override the stream method by telling
// Morgan to use our custom logger instead of the console.log.
const stream: StreamOptions = {
  write: (message) => Logger.http(message),
};

const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env !== 'development';
};

const morganMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr', {
  stream,
  skip,
});

export default morganMiddleware;
```

Notice how we modified our stream method to use the winston logger.
There are some predefined log formats for morgan like **tiny** and **combined** You can use those like the following

```js
const morganMiddleware = morgan('combined', {
  stream,
  skip,
});
```

This will give output in a separate format

Now use this middleware inside out **index.ts** file.

```js
import morganMiddleware from './middlewares/morgan';

app.use(morganMiddleware);
```

Now all out requests will be logged inside the winston with http level

```json
{ "level": "http", "message": "GET /ping 304 - - 11.140 ms ::1\n", "timestamp": "2022-03-12T19:57:43.166Z" }
```

This way you can maintain all your http requests reference as well.

### Separating logs according to type

Obviously all logs are not the same. You might need error logs and info logs to stay separated. We previously discussed about transports and how that helps us to stream logs to different destinations.

We can take that concept and filter logs and send them to different destinations.

Let's create some filters for our logs!

```js
const errorFilter = format((info, opts) => {
  return info.level === 'error' ? info : false;
});

const infoFilter = format((info, opts) => {
  return info.level === 'info' ? info : false;
});

const httpFilter = format((info, opts) => {
  return info.level === 'http' ? info : false;
});
```

Then modify our transports array to take advantage of that.

```js
const logger = createLogger({
  format: combine(
    timestamp(),
    json(),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      level: 'http',
      filename: 'logs/http.log',
      format: format.combine(httpFilter(), format.timestamp(), json()),
    }),
    new transports.File({
      level: 'info',
      filename: 'logs/info.log',
      format: format.combine(infoFilter(), format.timestamp(), json()),
    }),
    new transports.File({
      level: 'error',
      filename: 'logs/errors.log',
      format: format.combine(errorFilter(), format.timestamp(), json()),
    }),
  ],
});
```

If you look closely you will now see that we will have 3 separated log files generated for each type of logs.

### Daily rotation of logging files

Now in a production system maintaining these log files can be a pain in the a\*\*. Because if your log files are too large then there is no point in keeping the logs in the first place.

We have to rotate our log files and also need to have a way to organize them.

That's why there is a nice module named [winston-daily-rotate-file](https://www.npmjs.com/package/winston-daily-rotate-file)

We can use this to configure in such a way so that our log files rotate daily and we can also pass in tons of configurations like the maximum size of files into that.

First install it

```sh
yarn add winston-daily-rotate-file
```

Then replace our transports inside the winston

```js
const infoTransport: DailyRotateFile = new DailyRotateFile({
  filename: 'logs/info-%DATE%.log',
  datePattern: 'HH-DD-MM-YYYY',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
  format: format.combine(infoFilter(), format.timestamp(), json()),
});
```

do this for all the log levels and pass it inside the transports in winston

```js
transports: [new transports.Console(), httpTransport, infoTransport, errorTransport],
```

Now you will see new log files inside the logs folder named in the format we specified.

That should take care of all your logging problems.

### Final Version

We've covered some of the major concepts for logging in a NodeJS application. Let's put them to use.

We can encapsulate all of the logics into a separate class like the following.

```js
import { format, transports, createLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import morgan, { StreamOptions } from 'morgan';

const { combine, timestamp, json, align } = format;

export class Logger {
  static getInstance = (service = 'general-purpose') => {
    const logger = createLogger({
      defaultMeta: { service },
      format: combine(
        timestamp(),
        json(),
        format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
      ),
      transports: [
        new transports.Console(),
        Logger.getHttpLoggerTransport(),
        Logger.getInfoLoggerTransport(),
        Logger.getErrorLoggerTransport(),
      ],
    });

    if (process.env.NODE_ENV !== 'production') {
      logger.add(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
        }),
      );
    }

    return logger;
  };

  static errorFilter = format((info, opts) => {
    return info.level === 'error' ? info : false;
  });

  static infoFilter = format((info, opts) => {
    return info.level === 'info' ? info : false;
  });

  static httpFilter = format((info, opts) => {
    return info.level === 'http' ? info : false;
  });

  static getInfoLoggerTransport = () => {
    return new DailyRotateFile({
      filename: 'logs/info-%DATE%.log',
      datePattern: 'HH-DD-MM-YYYY',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'info',
      format: format.combine(Logger.infoFilter(), format.timestamp(), json()),
    });
  };
  static getErrorLoggerTransport = () => {
    return new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'HH-DD-MM-YYYY',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'error',
      format: format.combine(Logger.errorFilter(), format.timestamp(), json()),
    });
  };
  static getHttpLoggerTransport = () => {
    return new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'HH-DD-MM-YYYY',
      zippedArchive: true,
      maxSize: '10m',
      maxFiles: '14d',
      level: 'http',
      format: format.combine(Logger.httpFilter(), format.timestamp(), json()),
    });
  };

  static getHttpLoggerInstance = () => {
    const logger = Logger.getInstance();

    const stream: StreamOptions = {
      write: (message: string) => logger.http(message),
    };

    const skip = () => {
      const env = process.env.NODE_ENV || 'development';
      return env !== 'development';
    };

    const morganMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr', {
      stream,
      skip,
    });

    return morganMiddleware;
  };
}
```

And we can put this to use like the following.

```js
import { Logger } from './utils/Logger';

// middleware for
app.use(Logger.getHttpLoggerInstance());

const logger = Logger.getInstance();
```

Hope you've learned something new today!
