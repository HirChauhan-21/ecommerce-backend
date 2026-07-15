import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: any;
  // error: any;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // If data is already formatted, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'statusCode' in data
        ) {
          return data;
        }

        let responseMessage = 'Request processed successfully';
        let responseData = data;
        let metadata: any = undefined;

        if (data && typeof data === 'object') {
          if (data.pagination === true) {
            metadata = data.meta;
            responseData = data.data;
            responseMessage = data.message || responseMessage;
          } else if ('message' in data) {
            responseMessage = data.message;
            if (Object.keys(data).length === 1) {
              responseData = null;
            } else {
              const { message, ...rest } = data;
              responseData = Object.keys(rest).length === 1 && 'data' in rest ? rest.data : rest;
            }
          }
        }

        // Helper to strip isApprovedVendor key if role is not SELLER
        const cleanUserData = (obj: any): any => {
          if (!obj || typeof obj !== 'object' || obj instanceof Date) {
            return obj;
          }
          if (Array.isArray(obj)) {
            return obj.map(cleanUserData);
          }
          const cleaned = { ...obj };
          if ('role' in cleaned && cleaned.role !== 'SELLER') {
            delete cleaned.isApprovedVendor;
          }
          for (const key of Object.keys(cleaned)) {
            if (cleaned[key] instanceof Date) {
              // Leave Date objects as is
              continue;
            }
            if (typeof cleaned[key] === 'object') {
              cleaned[key] = cleanUserData(cleaned[key]);
            }
          }
          return cleaned;
        };

        responseData = cleanUserData(responseData);

        return {
          success: true,
          statusCode: response.statusCode || 200,
          message: responseMessage,
          metadata,
          // error: null,
          data: responseData ?? null,
        };
      }),
    );
  }
}
