import { ServiceError } from '../../common/exceptions';

export class Stars {
  private constructor(readonly value: number) {}

  static create(stars: number): Stars | ServiceError {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return new ServiceError(
        'VALIDATION_ERROR',
        'Stars must be an integer between 1 and 5',
        400,
        'notation-service',
      );
    }
    return new Stars(stars);
  }
}
