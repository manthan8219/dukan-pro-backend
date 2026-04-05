import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const raw = request.headers?.authorization ?? request.headers?.Authorization;
    const header = Array.isArray(raw) ? raw[0] : raw;
    try {
      const user = await this.authService.resolveUserFromBearer(header);
      (request as { user: typeof user }).user = user;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Authentication failed.');
    }
  }
}
