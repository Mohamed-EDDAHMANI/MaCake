import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RATING_REPOSITORY } from '../../domain/repositories/rating.repository.interface';
import { LIKE_REPOSITORY } from '../../domain/repositories/like.repository.interface';
import { FOLLOWER_REPOSITORY } from '../../domain/repositories/follower.repository.interface';
import { PROFILE_LIKE_REPOSITORY } from '../../domain/repositories/profile-like.repository.interface';
import { RatingRepository } from './repositories/rating.repository';
import { LikeRepository } from './repositories/like.repository';
import { FollowerRepository } from './repositories/follower.repository';
import { ProfileLikeRepository } from './repositories/profile-like.repository';
import { Rating, RatingSchema } from './mongoose/schemas/rating.schema';
import { Like, LikeSchema } from './mongoose/schemas/like.schema';
import { Follower, FollowerSchema } from './mongoose/schemas/follower.schema';
import { ProfileLike, ProfileLikeSchema } from './mongoose/schemas/profile-like.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: Like.name, schema: LikeSchema },
      { name: Follower.name, schema: FollowerSchema },
      { name: ProfileLike.name, schema: ProfileLikeSchema },
    ]),
  ],
  providers: [
    RatingRepository,
    LikeRepository,
    FollowerRepository,
    ProfileLikeRepository,
    { provide: RATING_REPOSITORY, useClass: RatingRepository },
    { provide: LIKE_REPOSITORY, useClass: LikeRepository },
    { provide: FOLLOWER_REPOSITORY, useClass: FollowerRepository },
    { provide: PROFILE_LIKE_REPOSITORY, useClass: ProfileLikeRepository },
  ],
  exports: [RATING_REPOSITORY, LIKE_REPOSITORY, FOLLOWER_REPOSITORY, PROFILE_LIKE_REPOSITORY],
})
export class NotationDatabaseModule {}
