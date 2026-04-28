import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

type MockResponse = {
  status: jest.Mock<MockResponse, [number]>;
  json: jest.Mock<void, [unknown]>;
};

type FilterResponseBody = {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
};

const createHost = () => {
  const response = {} as MockResponse;
  response.status = jest.fn<MockResponse, [number]>(() => response);
  response.json = jest.fn<void, [unknown]>();

  const request = {
    url: '/api/example',
  };
  const host = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(response),
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
};

const getJsonBody = (response: MockResponse): FilterResponseBody => {
  const body = response.json.mock.calls[0]?.[0];
  return body as FilterResponseBody;
};

describe('HttpExceptionFilter', () => {
  it('formats known HTTP exceptions', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = createHost();

    filter.catch(
      new BadRequestException({
        error: 'Bad Request',
        message: ['employeeId must be a string'],
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const body = getJsonBody(response);

    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: ['employeeId must be a string'],
      path: '/api/example',
    });
    expect(typeof body.timestamp).toBe('string');
  });

  it('hides internal exception details', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = createHost();

    filter.catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(getJsonBody(response)).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
      path: '/api/example',
    });
  });

  it('formats string exception responses', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = createHost();

    filter.catch(new HttpException('plain failure', HttpStatus.CONFLICT), host);

    expect(getJsonBody(response)).toMatchObject({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'plain failure',
      path: '/api/example',
    });
  });

  it('falls back when an unknown status code has no default label', () => {
    const filter = new HttpExceptionFilter();
    const { host, response } = createHost();

    filter.catch(new HttpException({}, 599), host);

    expect(getJsonBody(response)).toMatchObject({
      statusCode: 599,
      error: 'Error',
      message: 'Request failed',
      path: '/api/example',
    });
  });
});
