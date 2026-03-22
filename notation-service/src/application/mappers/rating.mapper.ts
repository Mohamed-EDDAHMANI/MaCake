import { Rating } from '../../domain/entities/rating.entity';

export class RatingMapper {
  static toDto(rating: Rating) {
    return {
      id: rating.id,
      fromUserId: rating.fromUserId,
      toUserId: rating.toUserId,
      orderId: rating.orderId,
      productId: rating.productId,
      stars: rating.stars,
      comment: rating.comment,
      createdAt: rating.createdAt,
    };
  }

  static toDtoList(ratings: Rating[]) {
    return ratings.map((r) => this.toDto(r));
  }
}
