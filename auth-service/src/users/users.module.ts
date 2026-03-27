import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import {
  User,
  UserSchema,
  UserDocument,
  ClientSchema,
  PatissiereSchema,
  LivreurSchema,
} from './schemas';
import { UserRole } from './dto/enums/user-role.enum';

const NOTATION_CLIENT = 'NOTATION_CLIENT';

@Module({
  imports: [
    AuthModule,
    ClientsModule.registerAsync([
      {
        name: NOTATION_CLIENT,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')],
            queue: config.get<string>('RABBITMQ_NOTATION_QUEUE', 'notation_queue'),
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    this.userModel.discriminator(UserRole.CLIENT, ClientSchema);
    this.userModel.discriminator(UserRole.PATISSIERE, PatissiereSchema);
    this.userModel.discriminator(UserRole.LIVREUR, LivreurSchema);
  }
}
