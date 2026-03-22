export interface FollowerProps {
  id: string;
  clientId: string;
  patissiereId: string;
  createdAt?: Date;
}

export class Follower {
  private constructor(private readonly props: FollowerProps) {}

  static reconstitute(data: FollowerProps): Follower {
    return new Follower(data);
  }

  get id(): string {
    return this.props.id;
  }

  get clientId(): string {
    return this.props.clientId;
  }

  get patissiereId(): string {
    return this.props.patissiereId;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  isFollowing(clientId: string, patissiereId: string): boolean {
    return this.props.clientId === clientId && this.props.patissiereId === patissiereId;
  }
}
