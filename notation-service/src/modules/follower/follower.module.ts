import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Follower, FollowerSchema } from './schemas/follower.schema';
import { FollowerService } from './follower.service';
import { FollowerController } from './follower.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Follower.name, schema: FollowerSchema }]),
  ],
  controllers: [FollowerController],
  providers: [FollowerService],
  exports: [FollowerService],
})
export class FollowerModule {}
