import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * JWT authentication guard.
 *
 * A NestJS Guard is the right abstraction here because:
 * 1. Guards run after middleware but before interceptors/pipes, making them ideal for auth checks.
 * 2. They integrate with Passport's strategy lifecycle (verify callback, error handling).
 * 3. They can return 401 without processing the request body — middleware would parse the body first, which is wasteful for unauthenticated requests.
 * In contrast, an interceptor would be too late (the route handler already resolved), and middleware lacks access to NestJS's DI and metadata reflection.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
