import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisService } from './services/redis.service';
import { winstonConfig } from './common/logger/logger.config';
import { AllExceptionsFilter } from './common/exceptions';
import { MongoDbModule } from './database/mongodb.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotationDatabaseModule } from './infrastructure/database/notation-database.module';

// Presentation Controllers (DDD)
import { RatingController } from './presentation/controllers/rating.controller';
import { LikeController } from './presentation/controllers/like.controller';
import { FollowerController } from './presentation/controllers/follower.controller';
import { ProfileLikeController } from './presentation/controllers/profile-like.controller';

// Application Use Cases - Rating
import { CreateRatingUseCase } from './application/use-cases/rating/create-rating.use-case';
import { FindRatingsByUserUseCase } from './application/use-cases/rating/find-ratings-by-user.use-case';
import { FindRatingsByProductUseCase } from './application/use-cases/rating/find-ratings-by-product.use-case';
import { GetAverageRatingUseCase } from './application/use-cases/rating/get-average-rating.use-case';
import { GetBatchAverageRatingsUseCase } from './application/use-cases/rating/get-batch-average-ratings.use-case';
import { CheckRatingByOrderUseCase } from './application/use-cases/rating/check-rating-by-order.use-case';
import { DeleteRatingUseCase } from './application/use-cases/rating/delete-rating.use-case';

// Application Use Cases - Like
import { ToggleLikeUseCase } from './application/use-cases/like/toggle-like.use-case';
import { GetLikeCountUseCase } from './application/use-cases/like/get-like-count.use-case';
import { GetBatchLikeCountsUseCase } from './application/use-cases/like/get-batch-like-counts.use-case';
import { GetBatchLikerIdsUseCase } from './application/use-cases/like/get-batch-liker-ids.use-case';
import { CheckLikeUseCase } from './application/use-cases/like/check-like.use-case';
import { FindLikesByUserUseCase } from './application/use-cases/like/find-likes-by-user.use-case';

// Application Use Cases - Follower
import { ToggleFollowerUseCase } from './application/use-cases/follower/toggle-follower.use-case';
import { GetFollowersUseCase } from './application/use-cases/follower/get-followers.use-case';
import { GetFollowerCountUseCase } from './application/use-cases/follower/get-follower-count.use-case';
import { CheckFollowerUseCase } from './application/use-cases/follower/check-follower.use-case';

// Application Use Cases - ProfileLike
import { ToggleProfileLikeUseCase } from './application/use-cases/profile-like/toggle-profile-like.use-case';
import { GetProfileLikeCountUseCase } from './application/use-cases/profile-like/get-profile-like-count.use-case';
import { CheckProfileLikeUseCase } from './application/use-cases/profile-like/check-profile-like.use-case';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongoDbModule,
    WinstonModule.forRoot(winstonConfig),
    MessagingModule,
    NotationDatabaseModule,
  ],
  controllers: [
    AppController,
    RatingController,
    LikeController,
    FollowerController,
    ProfileLikeController,
  ],
  providers: [
    AppService,
    RedisService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // Rating Use Cases
    CreateRatingUseCase,
    FindRatingsByUserUseCase,
    FindRatingsByProductUseCase,
    GetAverageRatingUseCase,
    GetBatchAverageRatingsUseCase,
    CheckRatingByOrderUseCase,
    DeleteRatingUseCase,
    // Like Use Cases
    ToggleLikeUseCase,
    GetLikeCountUseCase,
    GetBatchLikeCountsUseCase,
    GetBatchLikerIdsUseCase,
    CheckLikeUseCase,
    FindLikesByUserUseCase,
    // Follower Use Cases
    ToggleFollowerUseCase,
    GetFollowersUseCase,
    GetFollowerCountUseCase,
    CheckFollowerUseCase,
    // ProfileLike Use Cases
    ToggleProfileLikeUseCase,
    GetProfileLikeCountUseCase,
    CheckProfileLikeUseCase,
  ],
})
export class AppModule {}
