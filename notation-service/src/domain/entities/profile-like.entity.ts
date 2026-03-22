export interface ProfileLikeProps {
  id: string;
  userId: string;
  patissiereId: string;
  createdAt?: Date;
}

export class ProfileLike {
  private constructor(private readonly props: ProfileLikeProps) {}

  static reconstitute(data: ProfileLikeProps): ProfileLike {
    return new ProfileLike(data);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get patissiereId(): string {
    return this.props.patissiereId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }
}
