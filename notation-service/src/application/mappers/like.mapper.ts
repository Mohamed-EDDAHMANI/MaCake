import { Like } from '../../domain/entities/like.entity';

export class LikeMapper {
  static toDto(like: Like) {
    return {
      id: like.id,
      userId: like.userId,
      productId: like.productId,
      createdAt: like.createdAt,
    };
  }

  static toDtoList(likes: Like[]) {
    return likes.map((l) => this.toDto(l));
  }
}
