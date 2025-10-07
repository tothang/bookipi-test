import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userId = request.headers['x-user-id'] || request.query.userId;
    
    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    request.user = { userId };
    return true;
  }
}
