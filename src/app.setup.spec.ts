import { INestApplication } from '@nestjs/common';
import { configureApp } from './app.setup';

describe('configureApp', () => {
  it('applies the API prefix, exception filter, and validation pipe', () => {
    const setGlobalPrefix = jest.fn();
    const useGlobalFilters = jest.fn();
    const useGlobalPipes = jest.fn();
    const app = {
      setGlobalPrefix,
      useGlobalFilters,
      useGlobalPipes,
    } as unknown as INestApplication;

    configureApp(app);

    expect(setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(useGlobalFilters).toHaveBeenCalledTimes(1);
    expect(useGlobalPipes).toHaveBeenCalledTimes(1);
  });
});
